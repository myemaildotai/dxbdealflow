"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { createAdminListingDetailHref } from "@/lib/admin-navigation";
import { apiFetch } from "@/lib/deal-api";
import type { AdminOverview } from "@/lib/deal-types";

type SetSessionData<T> = (value: T | null | ((current: T | null) => T | null)) => void;
type AdminPriorityQueueNotification = AdminOverview["priorityQueue"][number];

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
    return "/admin?tab=listings";
  }

  return resolvedPathname;
}

export function useAdminPriorityNotifications({
  getListingDetailHref,
  overview,
  setOverview,
}: {
  getListingDetailHref?: (listingId: string) => string;
  overview: AdminOverview | null;
  setOverview: SetSessionData<AdminOverview>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { enqueueSnackbar } = useSnackbar();

  const fallbackListingDetailHref = useCallback(
    (listingId: string) => createAdminListingDetailHref(listingId, getAdminReturnHref(pathname)),
    [pathname]
  );

  const markPriorityQueueItemRead = useCallback(
    async (notification: AdminPriorityQueueNotification) => {
      if (notification.is_read) {
        return;
      }

      const optimisticReadAt = new Date().toISOString();

      setOverview((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          priorityQueue: (current.priorityQueue || []).map((item) =>
            item.id === notification.id ? { ...item, is_read: true, read_at: optimisticReadAt } : item
          ),
        };
      });

      try {
        const payload = await apiFetch<{ success: true; readAt: string | null }>(`/api/admin/priority-queue/${notification.id}`, {
          method: "PATCH",
        });

        setOverview((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            priorityQueue: (current.priorityQueue || []).map((item) =>
              item.id === notification.id ? { ...item, is_read: true, read_at: payload.readAt ?? optimisticReadAt } : item
            ),
          };
        });
      } catch (error) {
        setOverview((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            priorityQueue: (current.priorityQueue || []).map((item) =>
              item.id === notification.id ? { ...item, is_read: notification.is_read, read_at: notification.read_at } : item
            ),
          };
        });

        enqueueSnackbar(error instanceof Error ? error.message : "Failed to update notification state.", { variant: "error" });
      }
    },
    [enqueueSnackbar, setOverview]
  );

  const priorityQueueItems = useMemo<AdminPriorityQueueItem[]>(() => {
    const listingHrefBuilder = getListingDetailHref ?? fallbackListingDetailHref;

    return (overview?.priorityQueue || []).flatMap((notification) => {
      if (notification.target_type === "broker") {
        return {
          id: notification.id,
          target_type: notification.target_type,
          sentence: notification.sentence,
          isRead: notification.is_read,
          timestamp: notification.source_created_at || notification.created_at,
          onMarkAsRead: () => markPriorityQueueItemRead(notification),
          onOpen: () => router.push(`/admin/brokers/${notification.target_id}`),
        };
      }

      if (notification.target_type === "listing") {
        return {
          id: notification.id,
          target_type: notification.target_type,
          sentence: notification.sentence,
          isRead: notification.is_read,
          timestamp: notification.source_created_at || notification.created_at,
          onMarkAsRead: () => markPriorityQueueItemRead(notification),
          onOpen: () => router.push(listingHrefBuilder(notification.target_id)),
        };
      }

      return [];
    });
  }, [fallbackListingDetailHref, getListingDetailHref, markPriorityQueueItemRead, overview?.priorityQueue, router]);

  const unreadCount = useMemo(() => priorityQueueItems.filter((item) => !item.isRead).length, [priorityQueueItems]);

  return {
    markPriorityQueueItemRead,
    priorityQueueItems,
    priorityQueueTotalCount: priorityQueueItems.length,
    unreadCount,
  };
}
