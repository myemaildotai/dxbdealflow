export type NotificationRecipientRole = "admin" | "broker";
export type NotificationPriority = "urgent" | "high" | "normal" | "low";
export const ADMIN_PRIORITY_NOTIFICATION_TYPES = ["broker_application_pending", "listing_pending_review"] as const;

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
  handledAt: string | null;
  priority: NotificationPriority;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
};

export type NotificationsPagePayload = {
  notifications: NotificationItem[];
  unreadCount: number;
  totalCount: number;
  nextCursor: string | null;
  hasMore: boolean;
  priorityUnreadCount?: number;
  priorityTotalCount?: number;
};

export type NotificationRealtimeRow = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  href: string | null;
  priority: NotificationPriority;
  status: string;
  is_read: boolean;
  read_at: string | null;
  handled_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type NotificationFilterOptions = {
  types?: readonly string[];
  unhandledOnly?: boolean;
};

const priorityRank: Record<NotificationPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export function notificationRowToItem(row: NotificationRealtimeRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
    isRead: row.is_read,
    readAt: row.read_at,
    handledAt: row.handled_at,
    priority: row.priority,
    href: row.href,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata || {},
  };
}

export function isAdminPriorityNotificationType(type: string | null | undefined) {
  return !!type && ADMIN_PRIORITY_NOTIFICATION_TYPES.includes(type as (typeof ADMIN_PRIORITY_NOTIFICATION_TYPES)[number]);
}

export function sortNotifications(items: NotificationItem[]) {
  return [...items].sort((left, right) => {
    if (left.isRead !== right.isRead) return left.isRead ? 1 : -1;
    if (left.priority !== right.priority) return priorityRank[left.priority] - priorityRank[right.priority];
    const createdComparison = right.createdAt.localeCompare(left.createdAt);
    return createdComparison || right.id.localeCompare(left.id);
  });
}

function matchesNotificationFilter(row: NotificationRealtimeRow | null, options: NotificationFilterOptions) {
  if (!row || row.status !== "active") {
    return false;
  }

  if (options.unhandledOnly && row.handled_at !== null) {
    return false;
  }

  if (options.types?.length && !options.types.includes(row.type)) {
    return false;
  }

  return true;
}

export function applyNotificationRealtimeChange(
  current: NotificationsPagePayload | null,
  eventType: "INSERT" | "UPDATE" | "DELETE",
  nextRow: NotificationRealtimeRow | null,
  previousRow: NotificationRealtimeRow | null,
  options: NotificationFilterOptions = {}
): NotificationsPagePayload | null {
  if (!current) return current;

  const notificationId = nextRow?.id || previousRow?.id || null;
  const currentItem = notificationId
    ? current.notifications.find((notification) => notification.id === notificationId) || null
    : null;
  const previousVisible = currentItem ? true : matchesNotificationFilter(previousRow, options);
  const nextVisible = matchesNotificationFilter(nextRow, options);
  const previousUnread = previousVisible && (currentItem ? !currentItem.isRead : !previousRow?.is_read) ? 1 : 0;
  const nextUnread = nextVisible && !nextRow?.is_read ? 1 : 0;
  const nextUnreadCount = Math.max(current.unreadCount - previousUnread + nextUnread, 0);
  const currentTotalCount = current.totalCount ?? current.notifications.length;
  const nextTotalCount = Math.max(currentTotalCount - Number(previousVisible) + Number(nextVisible), 0);
  const shouldUpdatePriorityCounts =
    current.priorityTotalCount !== undefined || current.priorityUnreadCount !== undefined;
  const previousPriorityVisible = previousVisible && isAdminPriorityNotificationType(currentItem?.type || previousRow?.type);
  const nextPriorityVisible = nextVisible && isAdminPriorityNotificationType(nextRow?.type);
  const previousPriorityUnread =
    previousPriorityVisible && (currentItem ? !currentItem.isRead : !previousRow?.is_read) ? 1 : 0;
  const nextPriorityUnread = nextPriorityVisible && !nextRow?.is_read ? 1 : 0;
  const nextPriorityCounts = shouldUpdatePriorityCounts
    ? {
        priorityTotalCount: Math.max((current.priorityTotalCount ?? 0) - Number(previousPriorityVisible) + Number(nextPriorityVisible), 0),
        priorityUnreadCount: Math.max((current.priorityUnreadCount ?? 0) - previousPriorityUnread + nextPriorityUnread, 0),
      }
    : {};

  if (eventType === "DELETE" || !nextRow || !nextVisible) {
    return {
      ...current,
      notifications: notificationId
        ? current.notifications.filter((item) => item.id !== notificationId)
        : current.notifications,
      unreadCount: nextUnreadCount,
      totalCount: nextTotalCount,
      ...nextPriorityCounts,
    };
  }

  const nextItem = notificationRowToItem(nextRow);
  const itemMap = new Map(current.notifications.map((item) => [item.id, item]));
  itemMap.set(nextItem.id, nextItem);

  return {
    ...current,
    notifications: sortNotifications(Array.from(itemMap.values())),
    unreadCount: nextUnreadCount,
    totalCount: nextTotalCount,
    ...nextPriorityCounts,
  };
}

export function mergeNotificationPages(
  current: NotificationsPagePayload,
  incoming: NotificationsPagePayload
): NotificationsPagePayload {
  const itemMap = new Map<string, NotificationItem>();
  [...current.notifications, ...incoming.notifications].forEach((item) => itemMap.set(item.id, item));

  return {
    notifications: Array.from(itemMap.values()),
    unreadCount: incoming.unreadCount,
    totalCount: incoming.totalCount ?? current.totalCount ?? itemMap.size,
    nextCursor: incoming.nextCursor,
    hasMore: incoming.hasMore,
    priorityUnreadCount: incoming.priorityUnreadCount ?? current.priorityUnreadCount,
    priorityTotalCount: incoming.priorityTotalCount ?? current.priorityTotalCount,
  };
}
