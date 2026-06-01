"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import {
  buildBrokerNotificationFeed,
  countUnreadBrokerNotifications,
  type BrokerNotificationFeedItem,
} from "@/lib/broker-notifications";
import { apiFetch, getCachedApiData, setCachedApiData } from "@/lib/deal-api";
import type { BrokerDashboardData, ChatConversationSummary } from "@/lib/deal-types";

type SetSessionData<T> = (value: T | null | ((current: T | null) => T | null)) => void;
type BrokerNotificationSection = "requirements" | "enquiries";
type ConversationsResponse = { groups: ChatConversationSummary[] };

const CHAT_SUMMARY_TTL_MS = 60_000;
const CHAT_CONVERSATION_CACHE_PATHS = [
  "/api/chat/conversations?limit=10&filter=recent",
  "/api/chat/conversations",
];

const getBrokerListingHref = (listingId: string) => `/dashboard/listings/${listingId}`;

export function useBrokerNotificationFeed({
  dashboard,
  onSelectSection,
  setDashboard,
}: {
  dashboard: BrokerDashboardData | null;
  onSelectSection?: (section: BrokerNotificationSection) => void;
  setDashboard: SetSessionData<BrokerDashboardData>;
}) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const notifications = useMemo(() => (dashboard ? buildBrokerNotificationFeed(dashboard) : []), [dashboard]);
  const unreadCount = useMemo(() => countUnreadBrokerNotifications(notifications), [notifications]);
  const setConversationGroupsCache = useCallback(
    (updater: (groups: ChatConversationSummary[]) => ChatConversationSummary[]) => {
      CHAT_CONVERSATION_CACHE_PATHS.forEach((path) => {
        const currentPayload = getCachedApiData<ConversationsResponse>(path);
        const currentGroups = currentPayload?.groups;
        if (!currentGroups) {
          return;
        }

        setCachedApiData(path, { ...currentPayload, groups: updater(currentGroups) }, {}, CHAT_SUMMARY_TTL_MS);
      });
    },
    []
  );

  const markNotificationRead = useCallback(
    async (notification: BrokerNotificationFeedItem) => {
      const optimisticReadAt = new Date().toISOString();

      if (notification.type === "requirement") {
        if (notification.notification.is_read) {
          return;
        }

        if (!notification.notification.requirement_id) {
          enqueueSnackbar("Notification context is unavailable.", { variant: "error" });
          return;
        }

        setDashboard((current) => {
          if (!current) {
            return current;
          }

          const nextNotifications = current.requirementNotifications.map((item) =>
            item.id === notification.notification.id ? { ...item, is_read: true, read_at: optimisticReadAt } : item
          );

          return {
            ...current,
            requirementNotifications: nextNotifications,
            metrics: {
              ...current.metrics,
              unreadRequirementNotifications: nextNotifications.filter((item) => !item.is_read).length,
            },
          };
        });

        try {
          await apiFetch(`/api/requirements/${notification.notification.requirement_id}`, {
            method: "PATCH",
            body: JSON.stringify({
              action: "mark_notification_read",
              notificationId: notification.notification.id,
            }),
          });
        } catch (error) {
          setDashboard((current) => {
            if (!current) {
              return current;
            }

            const revertedNotifications = current.requirementNotifications.map((item) =>
              item.id === notification.notification.id
                ? { ...item, is_read: notification.notification.is_read, read_at: notification.notification.read_at }
                : item
            );

            return {
              ...current,
              requirementNotifications: revertedNotifications,
              metrics: {
                ...current.metrics,
                unreadRequirementNotifications: revertedNotifications.filter((item) => !item.is_read).length,
              },
            };
          });

          enqueueSnackbar(error instanceof Error ? error.message : "Failed to update notification state.", { variant: "error" });
        }

        return;
      }

      if (notification.type === "enquiry") {
        if (notification.lead.is_read) {
          return;
        }

        setDashboard((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            enquiries: current.enquiries.map((item) =>
              item.id === notification.lead.id ? { ...item, is_read: true, read_at: optimisticReadAt } : item
            ),
          };
        });

        try {
          await apiFetch(`/api/leads/${notification.lead.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              action: "mark_read",
            }),
          });
        } catch (error) {
          setDashboard((current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              enquiries: current.enquiries.map((item) =>
                item.id === notification.lead.id ? { ...item, is_read: notification.lead.is_read, read_at: notification.lead.read_at } : item
              ),
            };
          });

          enqueueSnackbar(error instanceof Error ? error.message : "Failed to update enquiry state.", { variant: "error" });
        }

        return;
      }

      if (notification.type === "listingApproval") {
        if (notification.isRead) {
          return;
        }

        setDashboard((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            listings: current.listings.map((item) =>
              item.id === notification.listing.id ? { ...item, approval_notification_read_at: optimisticReadAt } : item
            ),
          };
        });

        try {
          await apiFetch(`/api/listings/${notification.listing.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              action: "mark_approval_read",
            }),
          });
        } catch (error) {
          setDashboard((current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              listings: current.listings.map((item) =>
                item.id === notification.listing.id
                  ? { ...item, approval_notification_read_at: notification.listing.approval_notification_read_at ?? null }
                  : item
              ),
            };
          });

          enqueueSnackbar(error instanceof Error ? error.message : "Failed to update listing notification state.", {
            variant: "error",
          });
        }

        return;
      }

      if (!notification.conversation.hasUnread) {
        return;
      }

      const nextLastReadAt = notification.conversation.lastActivityAt || optimisticReadAt;

      setDashboard((current) => {
        if (!current) {
          return current;
        }

        const nextDashboard = {
          ...current,
          chats: current.chats.map((group) =>
            group.listing.id !== notification.listing.id
              ? group
              : {
                  ...group,
                  conversations: group.conversations.map((conversation) =>
                    conversation.conversationId !== notification.conversation.conversationId
                      ? conversation
                      : {
                          ...conversation,
                          hasUnread: false,
                          unreadCount: 0,
                          lastReadAt: nextLastReadAt,
                        }
                  ),
                }
          ),
        };

        return nextDashboard;
      });
      setConversationGroupsCache((groups) =>
        groups.map((group) =>
          group.listing.id !== notification.listing.id
            ? group
            : {
                ...group,
                conversations: group.conversations.map((conversation) =>
                  conversation.conversationId !== notification.conversation.conversationId
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

      try {
        await apiFetch(`/api/chat/conversations/${notification.conversation.conversationId}`, {
          method: "PATCH",
          body: JSON.stringify({
            action: "mark_read",
            readUntilSequence: notification.conversation.lastMessage?.message_sequence ?? notification.conversation.lastMessageSequence ?? null,
            readAt: nextLastReadAt,
          }),
        });
      } catch (error) {
        setDashboard((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            chats: current.chats.map((group) =>
              group.listing.id !== notification.listing.id
                ? group
                : {
                    ...group,
                    conversations: group.conversations.map((conversation) =>
                      conversation.conversationId !== notification.conversation.conversationId
                        ? conversation
                        : {
                            ...conversation,
                            hasUnread: notification.conversation.hasUnread,
                            unreadCount: notification.conversation.unreadCount,
                            lastReadAt: notification.conversation.lastReadAt,
                          }
                    ),
                  }
            ),
          };
        });
        setConversationGroupsCache((groups) =>
          groups.map((group) =>
            group.listing.id !== notification.listing.id
              ? group
              : {
                  ...group,
                  conversations: group.conversations.map((conversation) =>
                    conversation.conversationId !== notification.conversation.conversationId
                      ? conversation
                      : {
                          ...conversation,
                          hasUnread: notification.conversation.hasUnread,
                          unreadCount: notification.conversation.unreadCount,
                          lastReadAt: notification.conversation.lastReadAt,
                        }
                  ),
                }
          )
        );

        enqueueSnackbar(error instanceof Error ? error.message : "Failed to update chat state.", { variant: "error" });
      }
    },
    [enqueueSnackbar, setConversationGroupsCache, setDashboard]
  );

  const openNotificationPrimaryAction = useCallback(
    async (notification: BrokerNotificationFeedItem) => {
      if (notification.type === "requirement") {
        if (onSelectSection) {
          onSelectSection("requirements");
        } else {
          router.push("/dashboard?section=requirements", { scroll: false });
        }

        return;
      }

      if (notification.type === "enquiry") {
        if (onSelectSection) {
          onSelectSection("enquiries");
        } else {
          router.push("/dashboard?section=enquiries", { scroll: false });
        }

        return;
      }

      if (notification.type === "listingApproval") {
        router.push(getBrokerListingHref(notification.listing.id));
        return;
      }

      router.push(`/dashboard/chats/${notification.conversation.conversationId}`);
    },
    [onSelectSection, router]
  );

  return {
    markNotificationRead,
    notifications,
    openNotificationPrimaryAction,
    unreadCount,
  };
}
