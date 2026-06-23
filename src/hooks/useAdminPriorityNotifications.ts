"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { createAdminListingDetailHref } from "@/lib/admin-navigation";
import { markAdminNotificationCachesRead, restoreAdminNotificationCachesItem } from "@/lib/client-cache";
import { apiFetch, getApiCacheKey } from "@/lib/deal-api";
import {
  isAdminPriorityNotificationType,
  mergeNotificationPages,
  type NotificationItem,
  type NotificationsPagePayload,
} from "@/lib/notifications";
import { useSessionQuery } from "@/hooks/useSessionQuery";

const ADMIN_NOTIFICATION_PATH = "/api/admin/notifications";
const ADMIN_NOTIFICATION_TTL_MS = 45_000;

export type AdminPriorityQueueItem = {
  id: string;
  target_type: string;
  sentence: string;
  isRead: boolean;
  timestamp?: string | null;
  onMarkAsRead: () => Promise<void> | void;
  onOpen: () => Promise<void> | void;
};

function getAdminReturnHref(pathname: string | null) {
  const resolvedPathname = pathname || "/admin";

  if (!resolvedPathname.startsWith("/admin") || resolvedPathname.startsWith("/admin/listings/")) {
    return "/admin/listings";
  }

  return resolvedPathname;
}

function getPriorityNotificationTimestamp(notification: NotificationItem) {
  const sourceCreatedAt = notification.metadata.sourceCreatedAt;
  return typeof sourceCreatedAt === "string" && sourceCreatedAt ? sourceCreatedAt : notification.createdAt;
}

export function useAdminPriorityNotifications({
  enabled,
  getListingDetailHref,
}: {
  enabled: boolean;
  getListingDetailHref?: (listingId: string) => string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { enqueueSnackbar } = useSnackbar();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const {
    data: notificationsPayload,
    loading,
    setData: setNotificationsPayload,
  } = useSessionQuery<NotificationsPagePayload>(
    getApiCacheKey(ADMIN_NOTIFICATION_PATH),
    () => apiFetch<NotificationsPagePayload>(ADMIN_NOTIFICATION_PATH),
    {
      enabled,
      keepPreviousData: true,
      ttlMs: ADMIN_NOTIFICATION_TTL_MS,
      onError: (error) =>
        enqueueSnackbar(error instanceof Error ? error.message : "Failed to load priority notifications.", {
          variant: "error",
        }),
    }
  );

  const fallbackListingDetailHref = useCallback(
    (listingId: string) => createAdminListingDetailHref(listingId, getAdminReturnHref(pathname)),
    [pathname]
  );

  const markPriorityQueueItemRead = useCallback(
    async (notification: NotificationItem) => {
      if (notification.isRead) {
        return;
      }

      const optimisticReadAt = new Date().toISOString();
      markAdminNotificationCachesRead(notification.id, optimisticReadAt);

      try {
        const payload = await apiFetch<{ success: true; readAt: string | null }>(`${ADMIN_NOTIFICATION_PATH}/${notification.id}`, {
          method: "PATCH",
        });
        markAdminNotificationCachesRead(notification.id, payload.readAt ?? optimisticReadAt);
      } catch (error) {
        restoreAdminNotificationCachesItem(notification);
        enqueueSnackbar(error instanceof Error ? error.message : "Failed to update notification state.", { variant: "error" });
      }
    },
    [enqueueSnackbar]
  );

  const loadMorePriorityNotifications = useCallback(async () => {
    const cursor = notificationsPayload?.nextCursor;
    if (!cursor || !notificationsPayload?.hasMore || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = await apiFetch<NotificationsPagePayload>(
        `${ADMIN_NOTIFICATION_PATH}?limit=15&cursor=${encodeURIComponent(cursor)}`
      );
      setNotificationsPayload((current) => (current ? mergeNotificationPages(current, nextPage) : nextPage));
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to load more priority notifications.", {
        variant: "error",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [enqueueSnackbar, isLoadingMore, notificationsPayload, setNotificationsPayload]);

  const priorityQueueItems = useMemo<AdminPriorityQueueItem[]>(() => {
    const listingHrefBuilder = getListingDetailHref ?? fallbackListingDetailHref;

    return (notificationsPayload?.notifications || []).flatMap((notification) => {
      if (!isAdminPriorityNotificationType(notification.type)) {
        return [];
      }

      const entityId = notification.entityId;
      const sentence = notification.message || notification.title;

      if (notification.entityType === "broker" && entityId) {
        return {
          id: notification.id,
          target_type: notification.entityType,
          sentence,
          isRead: notification.isRead,
          timestamp: getPriorityNotificationTimestamp(notification),
          onMarkAsRead: () => markPriorityQueueItemRead(notification),
          onOpen: () => router.push(`/admin/brokers/${entityId}`),
        };
      }

      if (notification.entityType === "listing" && entityId) {
        return {
          id: notification.id,
          target_type: notification.entityType,
          sentence,
          isRead: notification.isRead,
          timestamp: getPriorityNotificationTimestamp(notification),
          onMarkAsRead: () => markPriorityQueueItemRead(notification),
          onOpen: () => router.push(listingHrefBuilder(entityId)),
        };
      }

      return [];
    });
  }, [fallbackListingDetailHref, getListingDetailHref, markPriorityQueueItemRead, notificationsPayload?.notifications, router]);

  const unreadCount = useMemo(() => priorityQueueItems.filter((item) => !item.isRead).length, [priorityQueueItems]);

  return {
    hasMorePriorityQueueItems: notificationsPayload?.hasMore || false,
    isLoadingMorePriorityQueueItems: isLoadingMore,
    loadMorePriorityQueueItems: loadMorePriorityNotifications,
    priorityQueueItems,
    priorityQueueLoading: loading,
    priorityQueueTotalCount: notificationsPayload?.priorityTotalCount ?? priorityQueueItems.length,
    unreadCount,
  };
}
