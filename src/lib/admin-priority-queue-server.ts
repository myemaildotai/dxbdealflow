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
import {
  createAdminNotifications,
  markNotificationHandled,
  markNotificationRead,
} from "@/lib/notifications-server";

const ADMIN_NOTIFICATION_SELECT =
  "id, recipient_user_id, type, message, entity_type, entity_id, is_read, read_at, handled_at, metadata, created_at, updated_at";

type AdminPriorityQueueSeed = {
  target_type: AdminPriorityQueueNotificationType;
  target_id: string;
  sentence: string;
  source_created_at: string | null;
  handled_status: AdminPriorityQueueHandledStatus | null;
  handled_at: string | null;
};

type AdminNotificationRow = {
  id: string;
  recipient_user_id: string;
  type: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  handled_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
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
  for (const seed of seeds) {
    await createAdminNotifications(supabase, adminUserIds, {
      type: seed.target_type === "broker" ? "broker_application_pending" : "listing_pending_review",
      title: seed.target_type === "broker" ? "Broker approval pending" : "Listing review pending",
      message: seed.sentence,
      entityType: seed.target_type,
      entityId: seed.target_id,
      href:
        seed.target_type === "broker"
          ? `/admin/brokers/${seed.target_id}`
          : `/admin/listings/${seed.target_id}`,
      metadata: {
        handledStatus: seed.handled_status,
        sourceCreatedAt: seed.source_created_at,
      },
      createdAt: seed.source_created_at || undefined,
    });
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

export async function ensureAdminPriorityQueueNotificationsForAdmin(
  supabase: SupabaseClient,
  adminUserId: string
) {
  const [pendingBrokerUsersResult, pendingListingsResult] = await Promise.all([
    supabase
      .from("users")
      .select("id, first_name, last_name, created_at, status")
      .eq("role", "broker")
      .eq("status", "pending"),
    supabase
      .from("listings")
      .select("id, title, created_at, status")
      .eq("status", "pending")
      .is("deleted_at", null),
  ]);

  if (pendingBrokerUsersResult.error || pendingListingsResult.error) {
    throw new Error(
      pendingBrokerUsersResult.error?.message ||
        pendingListingsResult.error?.message ||
        "Failed to load pending notifications."
    );
  }

  await ensureAdminPriorityQueueNotificationsFromPendingItems(
    supabase,
    [adminUserId],
    (pendingBrokerUsersResult.data || []) as Array<
      Pick<PlatformUser, "id" | "first_name" | "last_name" | "created_at" | "status">
    >,
    (pendingListingsResult.data || []) as Array<Pick<Listing, "id" | "title" | "created_at" | "status">>
  );
}

function mapAdminNotification(row: AdminNotificationRow): AdminPriorityQueueNotification | null {
  if (
    (row.entity_type !== "broker" && row.entity_type !== "listing") ||
    !row.entity_id
  ) {
    return null;
  }

  const metadata = row.metadata || {};
  const handledStatus =
    typeof metadata.handledStatus === "string"
      ? (metadata.handledStatus as AdminPriorityQueueHandledStatus)
      : null;
  const sourceCreatedAt =
    typeof metadata.sourceCreatedAt === "string" ? metadata.sourceCreatedAt : null;

  return {
    id: row.id,
    admin_user_id: row.recipient_user_id,
    target_type: row.entity_type,
    target_id: row.entity_id,
    sentence: row.message || row.type,
    is_read: row.is_read,
    read_at: row.read_at,
    source_created_at: sourceCreatedAt,
    handled_status: handledStatus,
    handled_at: row.handled_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchAdminPriorityQueueNotifications(supabase: SupabaseClient, adminUserId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select(ADMIN_NOTIFICATION_SELECT)
    .eq("recipient_user_id", adminUserId)
    .eq("recipient_role", "admin")
    .eq("status", "active")
    .in("type", ["broker_application_pending", "listing_pending_review"])
    .is("handled_at", null)
    .order("is_read", { ascending: true })
    .order("priority_rank", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load admin priority queue notifications.");
  }

  return ((data as AdminNotificationRow[] | null) || []).flatMap((row) => {
    const notification = mapAdminNotification(row);
    return notification ? [notification] : [];
  });
}

export async function fetchAdminPriorityQueueNotificationCount(supabase: SupabaseClient, adminUserId: string) {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", adminUserId)
    .eq("recipient_role", "admin")
    .eq("status", "active")
    .in("type", ["broker_application_pending", "listing_pending_review"])
    .is("handled_at", null);

  if (error) {
    throw new Error(error.message || "Failed to count admin priority queue notifications.");
  }

  return count || 0;
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
  return markNotificationRead(supabase, {
    notificationId,
    recipientUserId: adminUserId,
  });
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
  return markNotificationHandled(supabase, {
    actingUserId: actingAdminUserId,
    entityId: targetId,
    entityType: targetType,
    handledStatus,
  });
}
