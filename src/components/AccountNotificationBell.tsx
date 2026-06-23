"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { splitAdminPriorityItemText, getAdminPriorityItemVisual } from "@/app/admin/_components/AdminPriorityQueue";
import {
  getBrokerNotificationSentence,
  getBrokerNotificationVisual,
  splitBrokerNotificationText,
} from "@/components/BrokerPriorityQueue";
import { HeaderNotificationBell, type HeaderNotificationBellItem } from "@/components/HeaderNotificationBell";
import { useBrokerNotificationFeed } from "@/hooks/useBrokerNotificationFeed";
import { useRealtimeNotificationRefresh } from "@/hooks/useRealtimeNotificationRefresh";
import { useSessionQuery } from "@/hooks/useSessionQuery";
import type { AuthUser } from "@/auth/types";
import { markAdminNotificationCachesRead, restoreAdminNotificationCachesItem } from "@/lib/client-cache";
import { apiFetch, getApiCacheKey } from "@/lib/deal-api";
import type { BrokerNotificationsPayload } from "@/lib/broker-notifications";
import { mergeNotificationPages, type NotificationItem, type NotificationsPagePayload } from "@/lib/notifications";
import { canAccessBrokerWorkspace, isAdmin } from "@/lib/route-access";

const BROKER_NOTIFICATION_PATH = "/api/dashboard/notifications";
const ADMIN_NOTIFICATION_PATH = "/api/admin/notifications";

export function AccountNotificationBell({ accountUser }: { accountUser: AuthUser | null }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [adminLoadingMore, setAdminLoadingMore] = useState(false);
  const brokerEnabled = canAccessBrokerWorkspace(accountUser);
  const adminEnabled = isAdmin(accountUser);
  const {
    data: brokerNotifications,
    setData: setBrokerNotifications,
  } = useSessionQuery<BrokerNotificationsPayload>(
    getApiCacheKey(BROKER_NOTIFICATION_PATH),
    () => apiFetch<BrokerNotificationsPayload>(BROKER_NOTIFICATION_PATH),
    {
      enabled: brokerEnabled,
      keepPreviousData: true,
      ttlMs: 45_000,
    }
  );
  const {
    data: adminNotifications,
    setData: setAdminNotifications,
  } = useSessionQuery<NotificationsPagePayload>(
    getApiCacheKey(ADMIN_NOTIFICATION_PATH),
    () => apiFetch<NotificationsPagePayload>(ADMIN_NOTIFICATION_PATH),
    {
      enabled: adminEnabled,
      keepPreviousData: true,
      ttlMs: 45_000,
    }
  );
  const brokerFeed = useBrokerNotificationFeed({
    notificationsPayload: brokerEnabled ? brokerNotifications : null,
    setNotificationsPayload: setBrokerNotifications,
  });
  useRealtimeNotificationRefresh({
    accountUser,
    adminEnabled,
    brokerEnabled,
    setAdminNotifications,
    setBrokerNotifications,
  });
  const markAdminNotificationRead = useCallback(
    async (notification: NotificationItem) => {
      if (notification.isRead) return;

      const readAt = new Date().toISOString();
      markAdminNotificationCachesRead(notification.id, readAt);

      try {
        await apiFetch(`${ADMIN_NOTIFICATION_PATH}/${notification.id}`, { method: "PATCH" });
      } catch (error) {
        restoreAdminNotificationCachesItem(notification);
        enqueueSnackbar(error instanceof Error ? error.message : "Failed to update notification state.", {
          variant: "error",
        });
      }
    },
    [enqueueSnackbar]
  );
  const loadMoreAdminNotifications = useCallback(async () => {
    const cursor = adminNotifications?.nextCursor;
    if (!cursor || !adminNotifications?.hasMore || adminLoadingMore) return;

    setAdminLoadingMore(true);
    try {
      const nextPage = await apiFetch<NotificationsPagePayload>(
        `${ADMIN_NOTIFICATION_PATH}?limit=15&cursor=${encodeURIComponent(cursor)}`
      );
      setAdminNotifications((current) => (current ? mergeNotificationPages(current, nextPage) : nextPage));
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to load more notifications.", {
        variant: "error",
      });
    } finally {
      setAdminLoadingMore(false);
    }
  }, [adminLoadingMore, adminNotifications, enqueueSnackbar, setAdminNotifications]);
  const brokerItems = useMemo<HeaderNotificationBellItem[]>(
    () =>
      brokerFeed.notifications.map((notification) => {
        const text = splitBrokerNotificationText(notification);

        return {
          id: notification.id,
          ariaLabel: getBrokerNotificationSentence(notification),
          title: text.title,
          subtitle: text.subtitle,
          isRead: notification.isRead,
          priority: notification.priority,
          unreadWeight: notification.type === "chat" ? Math.max(notification.unreadCount, 1) : 1,
          timestamp: notification.createdAt,
          visual: getBrokerNotificationVisual(notification),
          onMarkAsRead: () => brokerFeed.markNotificationRead(notification),
          onOpen: () => brokerFeed.openNotificationPrimaryAction(notification),
        };
      }),
    [brokerFeed]
  );
  const adminItems = useMemo<HeaderNotificationBellItem[]>(
    () =>
      (adminNotifications?.notifications || []).map((notification) => {
        const priorityItem = {
          id: notification.id,
          target_type: notification.entityType || "default",
          sentence: notification.message || notification.title,
          isRead: notification.isRead,
          priority: notification.priority,
          timestamp: notification.createdAt,
          onMarkAsRead: () => markAdminNotificationRead(notification),
          onOpen: () => router.push(notification.href || "/admin"),
        };
        const text = splitAdminPriorityItemText(priorityItem);

        return {
          id: notification.id,
          ariaLabel: priorityItem.sentence,
          title: text.title,
          subtitle: text.subtitle,
          isRead: notification.isRead,
          timestamp: notification.createdAt,
          visual: getAdminPriorityItemVisual(priorityItem),
          onMarkAsRead: priorityItem.onMarkAsRead,
          onOpen: priorityItem.onOpen,
        };
      }),
    [adminNotifications?.notifications, markAdminNotificationRead, router]
  );

  if (brokerEnabled) {
    return (
      <HeaderNotificationBell
        hasMore={brokerFeed.hasMore}
        isLoadingMore={brokerFeed.isLoadingMore}
        items={brokerItems}
        label="Broker notifications"
        onLoadMore={brokerFeed.loadMore}
        totalCount={brokerFeed.totalCount}
        unreadCount={brokerFeed.unreadCount}
      />
    );
  }

  if (adminEnabled) {
    return (
      <HeaderNotificationBell
        hasMore={adminNotifications?.hasMore || false}
        isLoadingMore={adminLoadingMore}
        items={adminItems}
        label="Admin notifications"
        onLoadMore={loadMoreAdminNotifications}
        totalCount={adminNotifications?.totalCount ?? adminItems.length}
        unreadCount={adminNotifications?.unreadCount || 0}
      />
    );
  }

  return null;
}
