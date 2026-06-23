"use client";

import { getCachedApiData, invalidateApiCache, setCachedApiData } from "@/lib/deal-api";
import { isAdminPriorityNotificationType, type NotificationItem, type NotificationsPagePayload } from "@/lib/notifications";

const ADMIN_NOTIFICATION_CACHE_PATHS = ["/api/admin/notifications"] as const;
const ADMIN_NOTIFICATION_CACHE_TTL_MS = 45_000;

export function updateAdminNotificationCaches(updater: (payload: NotificationsPagePayload) => NotificationsPagePayload) {
  ADMIN_NOTIFICATION_CACHE_PATHS.forEach((path) => {
    const current = getCachedApiData<NotificationsPagePayload>(path);
    if (!current) {
      return;
    }

    setCachedApiData(
      path,
      updater(current),
      {},
      ADMIN_NOTIFICATION_CACHE_TTL_MS
    );
  });
}

export function markAdminNotificationCachesRead(notificationId: string, readAt: string) {
  updateAdminNotificationCaches((current) => {
    let newlyReadCount = 0;
    let newlyReadPriorityCount = 0;
    const notifications = current.notifications.map((item) => {
      if (item.id !== notificationId) {
        return item;
      }

      if (!item.isRead) {
        newlyReadCount = 1;
        if (isAdminPriorityNotificationType(item.type)) {
          newlyReadPriorityCount = 1;
        }
      }

      return {
        ...item,
        isRead: true,
        readAt,
      };
    });

    return {
      ...current,
      notifications,
      unreadCount: Math.max(current.unreadCount - newlyReadCount, 0),
      priorityUnreadCount:
        current.priorityUnreadCount === undefined
          ? undefined
          : Math.max(current.priorityUnreadCount - newlyReadPriorityCount, 0),
    };
  });
}

export function restoreAdminNotificationCachesItem(notification: NotificationItem) {
  updateAdminNotificationCaches((current) => {
    let restoredUnreadCount = 0;
    let restoredPriorityUnreadCount = 0;
    const notifications = current.notifications.map((item) => {
      if (item.id !== notification.id) {
        return item;
      }

      if (item.isRead && !notification.isRead) {
        restoredUnreadCount = 1;
        if (isAdminPriorityNotificationType(notification.type)) {
          restoredPriorityUnreadCount = 1;
        }
      }

      return notification;
    });

    return {
      ...current,
      notifications,
      unreadCount: current.unreadCount + restoredUnreadCount,
      priorityUnreadCount:
        current.priorityUnreadCount === undefined
          ? undefined
          : current.priorityUnreadCount + restoredPriorityUnreadCount,
    };
  });
}

export function invalidateListingCaches(listingId?: string) {
  invalidateApiCache("/api/listings");
  invalidateApiCache("/api/dashboard");
  invalidateApiCache("/api/public/overview");
  invalidateApiCache("/api/admin/overview");
  invalidateApiCache("/api/chat/conversations");

  if (!listingId) {
    return;
  }

  invalidateApiCache(`/api/listings/${listingId}`);
  invalidateApiCache(`/api/dashboard/listings/${listingId}`);
  invalidateApiCache(`/api/admin/listings/${listingId}`);
  invalidateApiCache(`/api/chat/${listingId}`);
}

export function invalidateRequirementCaches(requirementId?: string) {
  invalidateApiCache("/api/requirements");
  invalidateApiCache("/api/dashboard");
  invalidateApiCache("/api/admin/overview");

  if (requirementId) {
    invalidateApiCache(`/api/requirements/${requirementId}`);
  }
}

export function invalidateChatCaches({
  conversationId,
  listingId,
}: {
  conversationId?: string | null;
  listingId?: string | null;
} = {}) {
  invalidateApiCache("/api/chat/conversations");
  invalidateApiCache("/api/dashboard");

  if (conversationId) {
    invalidateApiCache(`/api/chat/conversations/${conversationId}`);
  }

  if (listingId) {
    invalidateApiCache(`/api/chat/${listingId}`);
  }
}

export function invalidateAdminOverviewCaches() {
  invalidateApiCache("/api/admin/overview");
  invalidateApiCache("/api/admin/notifications");
  invalidateApiCache("/api/admin/activity");
}

export function invalidateAdminBrokerActivityCaches(userId: string) {
  invalidateApiCache(`/api/admin/brokers/${userId}/overview`);
  invalidateApiCache(`/api/admin/brokers/${userId}/activity`);
}
