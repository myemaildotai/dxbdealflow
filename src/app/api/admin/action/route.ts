import { NextRequest, NextResponse } from "next/server";
import {
  buildAdminBrokerPriorityQueueSeed,
  buildAdminListingPriorityQueueSeed,
  ensureAdminPriorityQueueNotificationsForAdmins,
  fetchAdminUserIds,
  markAdminPriorityQueueNotificationsHandled,
} from "@/lib/admin-priority-queue-server";
import { getServiceSupabase, jsonError, requireAdmin } from "@/lib/deal-server";
import { getFullName } from "@/lib/deal-utils";
import { runEmailWorkflowInBackground } from "@/lib/email-service";
import {
  triggerBrokerVerificationSuccessEmail,
  triggerListingApprovedEmail,
  triggerRequirementMatchFoundForListing,
} from "@/lib/email-notifications";
import type { Listing, PlatformUser } from "@/lib/deal-types";

const BROKER_ACTIONS = new Set(["approve_application", "reject_application", "suspend_broker", "reactivate_broker"]);
const LISTING_ACTIONS = new Set(["approve_listing", "reject_listing", "deactivate_listing", "reactivate_listing"]);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function logActivity(actorUserId: string, action: string, targetTable: string, targetId: string, metadata: Record<string, unknown> = {}) {
  const supabase = getServiceSupabase();
  await supabase.from("activity_log").insert({
    actor_user_id: actorUserId,
    action,
    target_table: targetTable,
    target_id: targetId,
    metadata,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => null);
    const action = typeof body?.action === "string" ? body.action.trim() : "";
    const targetId = typeof body?.targetId === "string" ? body.targetId.trim() : "";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

    if (!action || !targetId) {
      return jsonError("Action and target id are required.", 400);
    }

    if (!UUID_REGEX.test(targetId)) {
      return jsonError("A valid target id is required.", 400);
    }

    const supabase = getServiceSupabase();
    let brokerUser: Pick<PlatformUser, "id" | "email" | "first_name" | "last_name" | "role" | "status" | "created_at"> | null = null;
    let listing:
      | Pick<Listing, "id" | "title" | "status" | "created_at" | "deleted_at" | "created_by">
      | null = null;

    if (BROKER_ACTIONS.has(action)) {
      const { data } = await supabase
        .from("users")
        .select("id, email, first_name, last_name, role, status, created_at")
        .eq("id", targetId)
        .maybeSingle();

      brokerUser = (data as Pick<PlatformUser, "id" | "email" | "first_name" | "last_name" | "role" | "status" | "created_at"> | null) || null;

      if (!brokerUser || brokerUser.role !== "broker") {
        return jsonError("Broker not found.", 404);
      }
    }

    if (LISTING_ACTIONS.has(action)) {
      const { data } = await supabase
        .from("listings")
        .select("id, title, status, created_at, deleted_at, created_by")
        .eq("id", targetId)
        .maybeSingle();

      listing = (data as Pick<Listing, "id" | "title" | "status" | "created_at" | "deleted_at" | "created_by"> | null) || null;

      if (!listing) {
        return jsonError("Listing not found.", 404);
      }

      if (listing.deleted_at) {
        return jsonError("Deleted listings cannot be moderated.", 400);
      }
    }

    switch (action) {
      case "approve_application": {
        if (brokerUser?.status === "pending") {
          const adminUserIds = await fetchAdminUserIds(supabase);
          await ensureAdminPriorityQueueNotificationsForAdmins(supabase, adminUserIds, [buildAdminBrokerPriorityQueueSeed(brokerUser)]);
        }

        await supabase.from("users").update({ status: "active" }).eq("id", targetId);
        await supabase
          .from("broker_profiles")
          .update({ application_status: "active", approved_at: new Date().toISOString() })
          .eq("user_id", targetId);
        await supabase
          .from("broker_credits")
          .upsert({ user_id: targetId, available_credits: 0, used_credits: 0, total_credits_assigned: 0 });
        await markAdminPriorityQueueNotificationsHandled(supabase, {
          targetType: "broker",
          targetId,
          handledStatus: "active",
          actingAdminUserId: auth.user.id,
        });
        await logActivity(auth.user.id, "broker_application_approved", "users", targetId, { notes: notes || null });
        if (brokerUser) {
          await triggerBrokerVerificationSuccessEmail({
            userId: brokerUser.id,
            brokerName: getFullName(brokerUser.first_name, brokerUser.last_name),
            email: brokerUser.email,
          });
        }
        break;
      }
      case "reject_application": {
        if (brokerUser?.status === "pending") {
          const adminUserIds = await fetchAdminUserIds(supabase);
          await ensureAdminPriorityQueueNotificationsForAdmins(supabase, adminUserIds, [buildAdminBrokerPriorityQueueSeed(brokerUser)]);
        }

        await supabase.from("users").update({ status: "rejected" }).eq("id", targetId);
        await supabase.from("broker_profiles").update({ application_status: "rejected" }).eq("user_id", targetId);
        await markAdminPriorityQueueNotificationsHandled(supabase, {
          targetType: "broker",
          targetId,
          handledStatus: "rejected",
          actingAdminUserId: auth.user.id,
        });
        await logActivity(auth.user.id, "broker_application_rejected", "users", targetId, { notes: notes || null });
        break;
      }
      case "suspend_broker": {
        await supabase.from("users").update({ status: "suspended" }).eq("id", targetId);
        await markAdminPriorityQueueNotificationsHandled(supabase, {
          targetType: "broker",
          targetId,
          handledStatus: "suspended",
          actingAdminUserId: auth.user.id,
        });
        await logActivity(auth.user.id, "broker_suspended", "users", targetId, { notes: notes || null });
        break;
      }
      case "reactivate_broker": {
        await supabase.from("users").update({ status: "active" }).eq("id", targetId);
        await markAdminPriorityQueueNotificationsHandled(supabase, {
          targetType: "broker",
          targetId,
          handledStatus: "active",
          actingAdminUserId: auth.user.id,
        });
        await logActivity(auth.user.id, "broker_reactivated", "users", targetId, { notes: notes || null });
        break;
      }
      case "approve_listing": {
        if (listing?.status === "pending") {
          const adminUserIds = await fetchAdminUserIds(supabase);
          await ensureAdminPriorityQueueNotificationsForAdmins(supabase, adminUserIds, [buildAdminListingPriorityQueueSeed(listing)]);
        }

        await supabase
          .from("listings")
          .update({ status: "active", approved_at: new Date().toISOString(), approval_notification_read_at: null, is_visible: true })
          .eq("id", targetId);
        await markAdminPriorityQueueNotificationsHandled(supabase, {
          targetType: "listing",
          targetId,
          handledStatus: "active",
          actingAdminUserId: auth.user.id,
        });
        await logActivity(auth.user.id, "listing_approved", "listings", targetId, { notes: notes || null });
        // Email triggers: listing owner approval email and requirement-match alerts.
        const approvalEmailWorkflow = Promise.all([
          triggerListingApprovedEmail({
            listingId: targetId,
            adminUserId: auth.user.id,
            notes: notes || null,
          }),
          triggerRequirementMatchFoundForListing({ listingId: targetId }),
        ]);
        if (!runEmailWorkflowInBackground(approvalEmailWorkflow, "admin-approve-listing")) {
          await approvalEmailWorkflow;
        }
        break;
      }
      case "reject_listing": {
        await supabase.from("listings").update({ status: "rejected", is_visible: false }).eq("id", targetId);
        if (listing?.status === "pending") {
          const adminUserIds = await fetchAdminUserIds(supabase);
          await ensureAdminPriorityQueueNotificationsForAdmins(supabase, adminUserIds, [buildAdminListingPriorityQueueSeed(listing)]);
        }
        await markAdminPriorityQueueNotificationsHandled(supabase, {
          targetType: "listing",
          targetId,
          handledStatus: "rejected",
          actingAdminUserId: auth.user.id,
        });
        await logActivity(auth.user.id, "listing_rejected", "listings", targetId, { notes: notes || null });
        break;
      }
      case "deactivate_listing": {
        await supabase.from("listings").update({ status: "inactive", is_visible: false }).eq("id", targetId);
        await markAdminPriorityQueueNotificationsHandled(supabase, {
          targetType: "listing",
          targetId,
          handledStatus: "inactive",
          actingAdminUserId: auth.user.id,
        });
        await logActivity(auth.user.id, "listing_deactivated", "listings", targetId, { notes: notes || null });
        break;
      }
      case "reactivate_listing": {
        await supabase.from("listings").update({ status: "active", is_visible: true }).eq("id", targetId);
        await markAdminPriorityQueueNotificationsHandled(supabase, {
          targetType: "listing",
          targetId,
          handledStatus: "active",
          actingAdminUserId: auth.user.id,
        });
        await logActivity(auth.user.id, "listing_reactivated", "listings", targetId, { notes: notes || null });
        break;
      }
      default:
        return jsonError("Unknown admin action.");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Admin action failed.", 500);
  }
}
