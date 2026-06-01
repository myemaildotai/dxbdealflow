"use client";

import { useMemo } from "react";
import { splitAdminPriorityItemText, getAdminPriorityItemVisual } from "@/app/admin/_components/AdminPriorityQueue";
import {
  getBrokerNotificationSentence,
  getBrokerNotificationVisual,
  splitBrokerNotificationText,
} from "@/components/BrokerPriorityQueue";
import { HeaderNotificationBell, type HeaderNotificationBellItem } from "@/components/HeaderNotificationBell";
import { useAdminPriorityNotifications } from "@/hooks/useAdminPriorityNotifications";
import { useBrokerNotificationFeed } from "@/hooks/useBrokerNotificationFeed";
import { useRealtimeNotificationRefresh } from "@/hooks/useRealtimeNotificationRefresh";
import { useSessionQuery } from "@/hooks/useSessionQuery";
import type { AuthUser } from "@/auth/types";
import { apiFetch, getApiCacheKey } from "@/lib/deal-api";
import type { AdminOverview, BrokerDashboardData } from "@/lib/deal-types";
import { canAccessBrokerWorkspace, isAdmin } from "@/lib/route-access";

const BROKER_NOTIFICATION_PATH = "/api/dashboard?scope=notifications";
const ADMIN_NOTIFICATION_PATH = "/api/admin/overview?scope=notifications";

export function AccountNotificationBell({ accountUser }: { accountUser: AuthUser | null }) {
  const brokerEnabled = canAccessBrokerWorkspace(accountUser);
  const adminEnabled = isAdmin(accountUser);
  const {
    data: brokerDashboard,
    setData: setBrokerDashboard,
  } = useSessionQuery<BrokerDashboardData>(getApiCacheKey(BROKER_NOTIFICATION_PATH), () => apiFetch<BrokerDashboardData>(BROKER_NOTIFICATION_PATH), {
    enabled: brokerEnabled,
    keepPreviousData: true,
    ttlMs: 45_000,
  });
  const {
    data: adminOverview,
    setData: setAdminOverview,
  } = useSessionQuery<AdminOverview>(getApiCacheKey(ADMIN_NOTIFICATION_PATH), () => apiFetch<AdminOverview>(ADMIN_NOTIFICATION_PATH), {
    enabled: adminEnabled,
    keepPreviousData: true,
    ttlMs: 45_000,
  });
  const brokerFeed = useBrokerNotificationFeed({
    dashboard: brokerEnabled ? brokerDashboard : null,
    setDashboard: setBrokerDashboard,
  });
  const adminFeed = useAdminPriorityNotifications({
    overview: adminEnabled ? adminOverview : null,
    setOverview: setAdminOverview,
  });
  useRealtimeNotificationRefresh({
    accountUser,
    adminEnabled,
    brokerEnabled,
    setAdminOverview,
    setBrokerDashboard,
  });
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
          unreadWeight:
            notification.type === "chat"
              ? Math.max(notification.conversation.unreadCount || 0, notification.conversation.hasUnread ? 1 : 0)
              : 1,
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
      adminFeed.priorityQueueItems.map((item) => {
        const text = splitAdminPriorityItemText(item);

        return {
          id: item.id,
          ariaLabel: item.sentence,
          title: text.title,
          subtitle: text.subtitle,
          isRead: item.isRead,
          timestamp: item.timestamp,
          visual: getAdminPriorityItemVisual(item),
          onMarkAsRead: item.onMarkAsRead,
          onOpen: item.onOpen,
        };
      }),
    [adminFeed.priorityQueueItems]
  );

  if (brokerEnabled) {
    return <HeaderNotificationBell items={brokerItems} label="Broker notifications" />;
  }

  if (adminEnabled) {
    return <HeaderNotificationBell items={adminItems} label="Admin notifications" />;
  }

  return null;
}
