import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildAdminBrokerPriorityQueueSentence,
  buildAdminListingPriorityQueueSentence,
} from "@/lib/admin-priority-queue";
import type {
  AdminPriorityQueueHandledStatus,
  AdminPriorityQueueNotification,
  AdminPriorityQueueNotificationType,
  Listing,
  PlatformUser,
} from "@/lib/deal-types";
import { getFullName } from "@/lib/deal-utils";

export const ADMIN_PRIORITY_QUEUE_NOTIFICATION_SELECT =
  "id, admin_user_id, target_type, target_id, sentence, is_read, read_at, source_created_at, handled_status, handled_at, created_at, updated_at";

type AdminPriorityQueueSeed = {
  target_type: AdminPriorityQueueNotificationType;
  target_id: string;
  sentence: string;
  source_created_at: string | null;
  handled_status: AdminPriorityQueueHandledStatus | null;
  handled_at: string | null;
};

export function buildAdminBrokerPriorityQueueSeed(
  broker: Pick<PlatformUser, "id" | "first_name" | "last_name" | "created_at" | "status">
): AdminPriorityQueueSeed {
  const brokerName = getFullName(broker.first_name, broker.last_name);

  return {
    target_type: "broker",
    target_id: broker.id,
    sentence: buildAdminBrokerPriorityQueueSentence(brokerName),
    source_created_at: broker.created_at,
    handled_status: broker.status,
    handled_at: broker.status === "pending" ? null : new Date().toISOString(),
  };
}

export function buildAdminListingPriorityQueueSeed(
  listing: Pick<Listing, "id" | "title" | "created_at" | "status">
): AdminPriorityQueueSeed {
  return {
    target_type: "listing",
    target_id: listing.id,
    sentence: buildAdminListingPriorityQueueSentence(listing.title),
    source_created_at: listing.created_at,
    handled_status: listing.status,
    handled_at: listing.status === "pending" ? null : new Date().toISOString(),
  };
}

export async function fetchAdminUserIds(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("users").select("id").eq("role", "admin");

  if (error) {
    throw new Error(error.message || "Failed to load admin users.");
  }

  return ((data as Array<Pick<PlatformUser, "id">> | null) || []).map((user) => user.id);
}

export async function ensureAdminPriorityQueueNotificationsForAdmins(
  supabase: SupabaseClient,
  adminUserIds: string[],
  seeds: AdminPriorityQueueSeed[]
) {
  if (!adminUserIds.length || !seeds.length) {
    return;
  }

  const rows = adminUserIds.flatMap((adminUserId) =>
    seeds.map((seed) => ({
      admin_user_id: adminUserId,
      ...seed,
    }))
  );

  const { error } = await supabase
    .from("admin_priority_queue_notifications")
    .upsert(rows, { onConflict: "admin_user_id,target_type,target_id", ignoreDuplicates: true });

  if (error) {
    throw new Error(error.message || "Failed to persist admin priority queue notifications.");
  }
}

export async function ensureAdminPriorityQueueNotificationsFromPendingItems(
  supabase: SupabaseClient,
  adminUserIds: string[],
  pendingBrokerUsers: Array<Pick<PlatformUser, "id" | "first_name" | "last_name" | "created_at" | "status">>,
  pendingListings: Array<Pick<Listing, "id" | "title" | "created_at" | "status">>
) {
  const seeds = [
    ...pendingBrokerUsers.map(buildAdminBrokerPriorityQueueSeed),
    ...pendingListings.map(buildAdminListingPriorityQueueSeed),
  ];

  await ensureAdminPriorityQueueNotificationsForAdmins(supabase, adminUserIds, seeds);
}

export async function fetchAdminPriorityQueueNotifications(supabase: SupabaseClient, adminUserId: string) {
  const { data, error } = await supabase
    .from("admin_priority_queue_notifications")
    .select(ADMIN_PRIORITY_QUEUE_NOTIFICATION_SELECT)
    .eq("admin_user_id", adminUserId)
    .in("target_type", ["broker", "listing"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load admin priority queue notifications.");
  }

  return ((data as AdminPriorityQueueNotification[] | null) || []);
}

export async function markAdminPriorityQueueNotificationRead(
  supabase: SupabaseClient,
  {
    adminUserId,
    notificationId,
  }: {
    adminUserId: string;
    notificationId: string;
  }
) {
  const { data: existingNotification, error: existingError } = await supabase
    .from("admin_priority_queue_notifications")
    .select("id, is_read, read_at")
    .eq("id", notificationId)
    .eq("admin_user_id", adminUserId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || "Failed to load notification state.");
  }

  if (!existingNotification) {
    throw new Error("Notification not found.");
  }

  if (existingNotification.is_read) {
    return {
      readAt: existingNotification.read_at,
    };
  }

  const readAt = new Date().toISOString();
  const { error } = await supabase
    .from("admin_priority_queue_notifications")
    .update({ is_read: true, read_at: readAt })
    .eq("id", notificationId)
    .eq("admin_user_id", adminUserId);

  if (error) {
    throw new Error(error.message || "Failed to update notification state.");
  }

  return { readAt };
}

export async function markAdminPriorityQueueNotificationsHandled(
  supabase: SupabaseClient,
  {
    targetType,
    targetId,
    handledStatus,
    actingAdminUserId,
  }: {
    targetType: AdminPriorityQueueNotificationType;
    targetId: string;
    handledStatus: AdminPriorityQueueHandledStatus;
    actingAdminUserId?: string | null;
  }
) {
  const handledAt = new Date().toISOString();
  const { error } = await supabase
    .from("admin_priority_queue_notifications")
    .update({ handled_status: handledStatus, handled_at: handledAt })
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  if (error) {
    throw new Error(error.message || "Failed to update queue notification status.");
  }

  if (!actingAdminUserId) {
    return { handledAt };
  }

  const { error: readError } = await supabase
    .from("admin_priority_queue_notifications")
    .update({ is_read: true, read_at: handledAt })
    .eq("admin_user_id", actingAdminUserId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("is_read", false);

  if (readError) {
    throw new Error(readError.message || "Failed to update read state for handled notifications.");
  }

  return { handledAt };
}
