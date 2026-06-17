"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import {
  buildBrokerNotificationFeed,
  type BrokerNotificationFeedItem,
  type BrokerNotificationsPayload,
} from "@/lib/broker-notifications";
import { apiFetch, getCachedApiData, setCachedApiData } from "@/lib/deal-api";
import type { ChatConversationSummary } from "@/lib/deal-types";
import { mergeNotificationPages } from "@/lib/notifications";

type SetSessionData<T> = (value: T | null | ((current: T | null) => T | null)) => void;
type BrokerNotificationSection = "requirements" | "enquiries";
type ConversationsResponse = { groups: ChatConversationSummary[] };

const BROKER_NOTIFICATION_PATH = "/api/dashboard/notifications";
const CHAT_SUMMARY_TTL_MS = 60_000;
const CHAT_CONVERSATION_CACHE_PATHS = [
  "/api/chat/conversations?limit=10&filter=recent",
  "/api/chat/conversations",
];

export function useBrokerNotificationFeed({
  notificationsPayload,
  onSelectSection,
  setNotificationsPayload,
}: {
  notificationsPayload: BrokerNotificationsPayload | null;
  onSelectSection?: (section: BrokerNotificationSection) => void;
  setNotificationsPayload: SetSessionData<BrokerNotificationsPayload>;
}) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const notifications = useMemo(
    () => buildBrokerNotificationFeed(notificationsPayload?.notifications || []),
    [notificationsPayload?.notifications]
  );
  const unreadCount = notificationsPayload?.unreadCount || 0;
  const totalCount = notificationsPayload?.totalCount ?? notifications.length;
  const setConversationGroupsCache = useCallback(
    (updater: (groups: ChatConversationSummary[]) => ChatConversationSummary[]) => {
      CHAT_CONVERSATION_CACHE_PATHS.forEach((path) => {
        const currentPayload = getCachedApiData<ConversationsResponse>(path);
        const currentGroups = currentPayload?.groups;
        if (!currentGroups) return;

        setCachedApiData(path, { ...currentPayload, groups: updater(currentGroups) }, {}, CHAT_SUMMARY_TTL_MS);
      });
    },
    []
  );
  const optimisticallyMarkRead = useCallback(
    (notification: BrokerNotificationFeedItem, readAt: string) => {
      setNotificationsPayload((current) => {
        if (!current) return current;

        return {
          ...current,
          notifications:
            notification.type === "chat"
              ? current.notifications.filter((item) => item.id !== notification.id)
              : current.notifications.map((item) =>
                  item.id === notification.id ? { ...item, isRead: true, readAt } : item
                ),
          unreadCount:
            notification.type === "chat" ? current.unreadCount : Math.max(current.unreadCount - 1, 0),
        };
      });
    },
    [setNotificationsPayload]
  );
  const rollbackRead = useCallback(
    (notification: BrokerNotificationFeedItem, originalPayload: BrokerNotificationsPayload | null) => {
      if (originalPayload) {
        setNotificationsPayload(originalPayload);
      }

      if (notification.type === "chat") {
        setConversationGroupsCache((groups) =>
          groups.map((group) =>
            group.listing.id !== notification.source.listingId
              ? group
              : {
                  ...group,
                  conversations: group.conversations.map((conversation) =>
                    conversation.conversationId !== notification.source.conversationId
                      ? conversation
                      : {
                          ...conversation,
                          hasUnread: true,
                          unreadCount: notification.unreadCount,
                          lastReadAt: notification.source.lastReadAt,
                        }
                  ),
                }
          )
        );
      }
    },
    [setConversationGroupsCache, setNotificationsPayload]
  );

  const markNotificationRead = useCallback(
    async (notification: BrokerNotificationFeedItem) => {
      if (notification.isRead) return;

      const originalPayload = notificationsPayload;
      const optimisticReadAt = new Date().toISOString();
      optimisticallyMarkRead(notification, optimisticReadAt);

      try {
        if (notification.type === "enquiry") {
          await apiFetch(`/api/leads/${notification.source.leadId}`, {
            method: "PATCH",
            body: JSON.stringify({ action: "mark_read" }),
          });
        } else if (notification.type === "listingApproval") {
          await apiFetch(`/api/listings/${notification.source.listingId}`, {
            method: "PATCH",
            body: JSON.stringify({ action: "mark_approval_read" }),
          });
        } else if (notification.type === "chat") {
          const nextLastReadAt = notification.createdAt || optimisticReadAt;
          setConversationGroupsCache((groups) =>
            groups.map((group) =>
              group.listing.id !== notification.source.listingId
                ? group
                : {
                    ...group,
                    conversations: group.conversations.map((conversation) =>
                      conversation.conversationId !== notification.source.conversationId
                        ? conversation
                        : {
                            ...conversation,
                            hasUnread: false,
                            unreadCount: 0,
                            lastReadAt: nextLastReadAt,
                          }
                    ),
                  }
            )
          );
          await apiFetch(`/api/chat/conversations/${notification.source.conversationId}`, {
            method: "PATCH",
            body: JSON.stringify({
              action: "mark_read",
              readUntilSequence: notification.source.lastMessageSequence,
              readAt: nextLastReadAt,
            }),
          });
        }

        await apiFetch(`${BROKER_NOTIFICATION_PATH}/${notification.id}`, { method: "PATCH" });
      } catch (error) {
        rollbackRead(notification, originalPayload);
        enqueueSnackbar(error instanceof Error ? error.message : "Failed to update notification state.", {
          variant: "error",
        });
      }
    },
    [
      enqueueSnackbar,
      notificationsPayload,
      optimisticallyMarkRead,
      rollbackRead,
      setConversationGroupsCache,
    ]
  );

  const loadMore = useCallback(async () => {
    const cursor = notificationsPayload?.nextCursor;
    if (!cursor || !notificationsPayload?.hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = await apiFetch<BrokerNotificationsPayload>(
        `${BROKER_NOTIFICATION_PATH}?limit=15&cursor=${encodeURIComponent(cursor)}`
      );
      setNotificationsPayload((current) => (current ? mergeNotificationPages(current, nextPage) : nextPage));
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to load more notifications.", {
        variant: "error",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [enqueueSnackbar, isLoadingMore, notificationsPayload, setNotificationsPayload]);

  const openNotificationPrimaryAction = useCallback(
    async (notification: BrokerNotificationFeedItem) => {
      if (notification.type === "requirement" && onSelectSection) {
        onSelectSection("requirements");
        return;
      }

      if (notification.type === "enquiry" && onSelectSection) {
        onSelectSection("enquiries");
        return;
      }

      router.push(notification.href, { scroll: false });
    },
    [onSelectSection, router]
  );

  return {
    hasMore: notificationsPayload?.hasMore || false,
    isLoadingMore,
    loadMore,
    markNotificationRead,
    notifications,
    openNotificationPrimaryAction,
    totalCount,
    unreadCount,
  };
}
