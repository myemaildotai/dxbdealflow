import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ADMIN_PRIORITY_NOTIFICATION_TYPES,
  notificationRowToItem,
  type NotificationPriority,
  type NotificationRealtimeRow,
  type NotificationsPagePayload,
  type NotificationRecipientRole,
} from "@/lib/notifications";

const NOTIFICATION_SELECT =
  "id, type, title, message, entity_type, entity_id, href, priority, status, is_read, read_at, handled_at, metadata, created_at, sort_unread, priority_rank";
const DEFAULT_NOTIFICATION_LIMIT = 15;
const MAX_NOTIFICATION_LIMIT = 50;

type NotificationCursor = {
  sortUnread: number;
  priorityRank: number;
  createdAt: string;
  id: string;
};

type NotificationRow = NotificationRealtimeRow & {
  sort_unread: number;
  priority_rank: number;
};

export type CreateNotificationInput = {
  recipientUserId: string;
  recipientRole: NotificationRecipientRole;
  actorUserId?: string | null;
  type: string;
  title: string;
  message?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  href?: string | null;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

function encodeCursor(cursor: NotificationCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value?: string | null): NotificationCursor | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<NotificationCursor>;
    if (
      typeof parsed.sortUnread === "number" &&
      typeof parsed.priorityRank === "number" &&
      typeof parsed.createdAt === "string" &&
      typeof parsed.id === "string"
    ) {
      return parsed as NotificationCursor;
    }
  } catch {
    return null;
  }

  return null;
}

function getBoundedLimit(value?: number | null) {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return DEFAULT_NOTIFICATION_LIMIT;
  }

  return Math.min(Math.floor(value), MAX_NOTIFICATION_LIMIT);
}

export async function getNotificationsPage(
  supabase: SupabaseClient,
  {
    cursor,
    limit,
    recipientRole,
    recipientUserId,
    includePriorityCounts = false,
    types,
    unhandledOnly = false,
  }: {
    cursor?: string | null;
    includePriorityCounts?: boolean;
    limit?: number | null;
    recipientRole: NotificationRecipientRole;
    recipientUserId: string;
    types?: readonly string[];
    unhandledOnly?: boolean;
  }
): Promise<NotificationsPagePayload> {
  const resolvedLimit = getBoundedLimit(limit);
  const parsedCursor = decodeCursor(cursor);
  let pageQuery = supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("recipient_user_id", recipientUserId)
    .eq("recipient_role", recipientRole)
    .eq("status", "active")
    .order("sort_unread", { ascending: true })
    .order("priority_rank", { ascending: true })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(resolvedLimit + 1);

  if (unhandledOnly) {
    pageQuery = pageQuery.is("handled_at", null);
  }

  if (types?.length) {
    pageQuery = pageQuery.in("type", [...types]);
  }

  if (parsedCursor) {
    pageQuery = pageQuery.or(
      [
        `sort_unread.gt.${parsedCursor.sortUnread}`,
        `and(sort_unread.eq.${parsedCursor.sortUnread},priority_rank.gt.${parsedCursor.priorityRank})`,
        `and(sort_unread.eq.${parsedCursor.sortUnread},priority_rank.eq.${parsedCursor.priorityRank},created_at.lt.${parsedCursor.createdAt})`,
        `and(sort_unread.eq.${parsedCursor.sortUnread},priority_rank.eq.${parsedCursor.priorityRank},created_at.eq.${parsedCursor.createdAt},id.lt.${parsedCursor.id})`,
      ].join(",")
    );
  }

  let unreadQuery = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", recipientUserId)
    .eq("recipient_role", recipientRole)
    .eq("status", "active")
    .eq("is_read", false);

  if (unhandledOnly) {
    unreadQuery = unreadQuery.is("handled_at", null);
  }

  if (types?.length) {
    unreadQuery = unreadQuery.in("type", [...types]);
  }

  let totalQuery = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", recipientUserId)
    .eq("recipient_role", recipientRole)
    .eq("status", "active");

  if (unhandledOnly) {
    totalQuery = totalQuery.is("handled_at", null);
  }

  if (types?.length) {
    totalQuery = totalQuery.in("type", [...types]);
  }

  const buildPriorityCountQuery = (unreadOnly: boolean) => {
    let query = supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", recipientUserId)
      .eq("recipient_role", recipientRole)
      .eq("status", "active")
      .in("type", [...ADMIN_PRIORITY_NOTIFICATION_TYPES]);

    if (unhandledOnly) {
      query = query.is("handled_at", null);
    }

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    return query;
  };

  const priorityUnreadQuery = includePriorityCounts ? buildPriorityCountQuery(true) : Promise.resolve({ count: null, error: null });
  const priorityTotalQuery = includePriorityCounts ? buildPriorityCountQuery(false) : Promise.resolve({ count: null, error: null });

  const [pageResult, unreadResult, totalResult, priorityUnreadResult, priorityTotalResult] = await Promise.all([
    pageQuery,
    unreadQuery,
    totalQuery,
    priorityUnreadQuery,
    priorityTotalQuery,
  ]);

  if (pageResult.error || unreadResult.error || totalResult.error || priorityUnreadResult.error || priorityTotalResult.error) {
    throw new Error(
      pageResult.error?.message ||
        unreadResult.error?.message ||
        totalResult.error?.message ||
        priorityUnreadResult.error?.message ||
        priorityTotalResult.error?.message ||
        "Failed to load notifications."
    );
  }

  const rows = ((pageResult.data as NotificationRow[] | null) || []);
  const hasMore = rows.length > resolvedLimit;
  const pageRows = rows.slice(0, resolvedLimit);
  const lastRow = pageRows[pageRows.length - 1] || null;

  return {
    notifications: pageRows.map(notificationRowToItem),
    unreadCount: unreadResult.count || 0,
    totalCount: totalResult.count || 0,
    priorityUnreadCount: includePriorityCounts ? priorityUnreadResult.count || 0 : undefined,
    priorityTotalCount: includePriorityCounts ? priorityTotalResult.count || 0 : undefined,
    nextCursor:
      hasMore && lastRow
        ? encodeCursor({
            sortUnread: lastRow.sort_unread,
            priorityRank: lastRow.priority_rank,
            createdAt: lastRow.created_at,
            id: lastRow.id,
          })
        : null,
    hasMore,
  };
}

export async function createNotification(supabase: SupabaseClient, input: CreateNotificationInput) {
  const { data, error } = await supabase.rpc("upsert_notification", {
    p_recipient_user_id: input.recipientUserId,
    p_recipient_role: input.recipientRole,
    p_actor_user_id: input.actorUserId || null,
    p_type: input.type,
    p_title: input.title,
    p_message: input.message || null,
    p_entity_type: input.entityType || null,
    p_entity_id: input.entityId || null,
    p_href: input.href || null,
    p_priority: input.priority || "normal",
    p_metadata: input.metadata || {},
    p_created_at: input.createdAt || new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message || "Failed to create notification.");
  }

  return data as string;
}

export async function createAdminNotifications(
  supabase: SupabaseClient,
  adminUserIds: string[],
  input: Omit<CreateNotificationInput, "recipientRole" | "recipientUserId">
) {
  await Promise.all(
    adminUserIds.map((recipientUserId) =>
      createNotification(supabase, {
        ...input,
        recipientRole: "admin",
        recipientUserId,
      })
    )
  );
}

export async function createBrokerNotification(
  supabase: SupabaseClient,
  recipientUserId: string,
  input: Omit<CreateNotificationInput, "recipientRole" | "recipientUserId">
) {
  return createNotification(supabase, {
    ...input,
    recipientRole: "broker",
    recipientUserId,
  });
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  {
    notificationId,
    recipientUserId,
  }: {
    notificationId: string;
    recipientUserId: string;
  }
) {
  const { data: existing, error: loadError } = await supabase
    .from("notifications")
    .select("id, type, status, is_read, read_at")
    .eq("id", notificationId)
    .eq("recipient_user_id", recipientUserId)
    .maybeSingle();

  if (loadError) {
    throw new Error(loadError.message || "Failed to load notification state.");
  }

  if (!existing) {
    throw new Error("Notification not found.");
  }

  if (existing.is_read && (existing.type !== "chat_message_received" || existing.status !== "active")) {
    return { readAt: existing.read_at as string | null };
  }

  const readAt = new Date().toISOString();
  const update =
    existing.type === "chat_message_received"
      ? {
          is_read: true,
          read_at: readAt,
          handled_at: readAt,
          status: "dismissed",
        }
      : { is_read: true, read_at: readAt };
  const { error } = await supabase
    .from("notifications")
    .update(update)
    .eq("id", notificationId)
    .eq("recipient_user_id", recipientUserId);

  if (error) {
    throw new Error(error.message || "Failed to update notification state.");
  }

  return { readAt };
}

export async function markNotificationsForEntityRead(
  supabase: SupabaseClient,
  {
    entityId,
    entityType,
    notificationId,
    recipientUserId,
  }: {
    entityId: string;
    entityType: string;
    notificationId?: string | null;
    recipientUserId: string;
  }
) {
  const readAt = new Date().toISOString();
  let query = supabase
    .from("notifications")
    .update({ is_read: true, read_at: readAt })
    .eq("recipient_user_id", recipientUserId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  if (notificationId) {
    query = query.eq("id", notificationId);
  }

  const { error } = await query;
  if (error) {
    throw new Error(error.message || "Failed to update notification state.");
  }

  return { readAt };
}

export async function markNotificationHandled(
  supabase: SupabaseClient,
  {
    actingUserId,
    entityId,
    entityType,
    handledStatus,
  }: {
    actingUserId?: string | null;
    entityId: string;
    entityType: string;
    handledStatus: string;
  }
) {
  const handledAt = new Date().toISOString();
  const { data: notifications, error: loadError } = await supabase
    .from("notifications")
    .select("id, metadata")
    .eq("recipient_role", "admin")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .in("status", ["active", "handled"]);

  if (loadError) {
    throw new Error(loadError.message || "Failed to load notification handled state.");
  }

  const updates = await Promise.all(
    ((notifications as Array<{ id: string; metadata: Record<string, unknown> | null }> | null) || []).map(
      (notification) =>
        supabase
          .from("notifications")
          .update({
            handled_at: handledAt,
            handled_by: actingUserId || null,
            status: "handled",
            metadata: {
              ...(notification.metadata || {}),
              handledStatus,
            },
          })
          .eq("id", notification.id)
    )
  );
  const failedUpdate = updates.find((result) => result.error);
  if (failedUpdate?.error) {
    throw new Error(failedUpdate.error.message || "Failed to update notification handled state.");
  }

  if (actingUserId) {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: handledAt })
      .eq("recipient_user_id", actingUserId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("is_read", false);
  }

  return { handledAt };
}
