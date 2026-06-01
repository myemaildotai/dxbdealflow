"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { AuthUser } from "@/auth/types";
import { apiFetch } from "@/lib/deal-api";
import { supabase, syncSupabaseRealtimeAuth } from "@/lib/supabase";
import type { AdminOverview, BrokerDashboardData, ChatMessage } from "@/lib/deal-types";

type SetSessionData<T> = (value: T | null | ((current: T | null) => T | null)) => void;

const NOTIFICATION_REFRESH_DEBOUNCE_MS = 250;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BROKER_NOTIFICATION_REFRESH_PATH = "/api/dashboard?scope=notifications";
const ADMIN_NOTIFICATION_REFRESH_PATH = "/api/admin/overview?scope=notifications";

type ChatConversationMessageRealtimeRow = {
  id?: string | null;
  conversation_id?: string | null;
  sender_id?: string | null;
  receiver_id?: string | null;
  client_message_id?: string | null;
  message_sequence?: number | null;
  content?: string | null;
  body?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ChatConversationRealtimeRow = {
  id?: string | null;
  owner_user_id?: string | null;
  broker_user_id?: string | null;
  last_message_at?: string | null;
  updated_at?: string | null;
  last_message_sequence?: number | null;
  owner_last_read_at?: string | null;
  broker_last_read_at?: string | null;
  owner_last_read_sequence?: number | null;
  broker_last_read_sequence?: number | null;
};

function getActiveChatConversationId(pathname: string | null) {
  const match = pathname?.match(/^\/dashboard\/chats\/([^/?#]+)/);
  const candidate = match?.[1] ? decodeURIComponent(match[1]) : null;
  return candidate && UUID_PATTERN.test(candidate) ? candidate : null;
}

function getMessageContent(row: ChatConversationMessageRealtimeRow) {
  return typeof row.content === "string" && row.content.trim()
    ? row.content
    : typeof row.body === "string" && row.body.trim()
      ? row.body
      : "";
}

function getThreadActivityTime(thread: BrokerDashboardData["chats"][number]["conversations"][number] | undefined) {
  return thread?.lastActivityAt || thread?.lastMessage?.created_at || "";
}

function sortDashboardChatGroups(groups: BrokerDashboardData["chats"]) {
  return groups
    .map((group) => ({
      ...group,
      conversations: [...group.conversations].sort((left, right) => getThreadActivityTime(right).localeCompare(getThreadActivityTime(left))),
    }))
    .sort((left, right) => getThreadActivityTime(right.conversations[0]).localeCompare(getThreadActivityTime(left.conversations[0])));
}

function upsertDashboardThreadMessage(messages: ChatMessage[] | undefined, nextMessage: ChatMessage) {
  if (!messages) {
    return messages;
  }

  return [
    ...messages.filter(
      (message) =>
        message.id !== nextMessage.id &&
        (!message.client_message_id || !nextMessage.client_message_id || message.client_message_id !== nextMessage.client_message_id)
    ),
    nextMessage,
  ].sort((left, right) => {
    if (typeof left.message_sequence === "number" || typeof right.message_sequence === "number") {
      return (left.message_sequence ?? Number.MAX_SAFE_INTEGER) - (right.message_sequence ?? Number.MAX_SAFE_INTEGER);
    }

    const timestampDiff = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    if (timestampDiff !== 0 && !Number.isNaN(timestampDiff)) {
      return timestampDiff;
    }

    return left.id.localeCompare(right.id);
  });
}

function getLatestDashboardThreadMessage(messages: ChatMessage[] | undefined, fallback: ChatMessage) {
  return messages?.[messages.length - 1] || fallback;
}

function patchBrokerDashboardForChatMessage(
  current: BrokerDashboardData | null,
  row: ChatConversationMessageRealtimeRow,
  viewerUserId: string,
  activeConversationId: string | null
) {
  const content = getMessageContent(row);
  if (!current || !row.id || !row.conversation_id || !row.sender_id || !row.created_at || !content) {
    return current;
  }

  const messageId = row.id;
  const conversationId = row.conversation_id;
  const senderId = row.sender_id;
  const createdAt = row.created_at;
  const updatedAt = row.updated_at || createdAt;
  let changed = false;
  const nextChats = current.chats.map((group) => {
    let groupChanged = false;
    const nextConversations = group.conversations.map((conversation) => {
      if (conversation.conversationId !== conversationId) {
        return conversation;
      }

      const sender = conversation.participant?.id === senderId ? conversation.participant : null;
      const nextMessage: ChatMessage = {
        id: messageId,
        listing_id: group.listing.id,
        conversation_id: conversationId,
        sender_id: senderId,
        receiver_id: row.receiver_id || null,
        client_message_id: row.client_message_id || null,
        message_sequence: row.message_sequence ?? null,
        content,
        created_at: createdAt,
        updated_at: updatedAt,
        sender,
      };
      const nextMessages = upsertDashboardThreadMessage(conversation.messages, nextMessage);
      const lastMessage = getLatestDashboardThreadMessage(nextMessages, nextMessage);
      const messageAlreadyPresent =
        conversation.lastMessage?.id === messageId ||
        Boolean(
          row.client_message_id &&
            (conversation.lastMessage?.client_message_id === row.client_message_id ||
              conversation.messages?.some((message) => message.client_message_id === row.client_message_id))
        ) ||
        Boolean(conversation.messages?.some((message) => message.id === messageId));
      const nextMessageCount = messageAlreadyPresent
        ? Math.max(conversation.messageCount, nextMessages?.length || 0)
        : Math.max(conversation.messageCount + 1, nextMessages?.length || 0);
      const isIncomingForViewer = row.receiver_id ? row.receiver_id === viewerUserId : senderId !== viewerUserId;
      const shouldMarkRead = conversationId === activeConversationId;
      const nextUnreadCount = shouldMarkRead
        ? 0
        : !isIncomingForViewer || messageAlreadyPresent
          ? conversation.unreadCount
          : Math.max((conversation.unreadCount || 0) + 1, 1);

      changed = true;
      groupChanged = true;

      return {
        ...conversation,
        lastMessage,
        lastActivityAt: lastMessage.created_at,
        hasUnread: nextUnreadCount > 0,
        unreadCount: nextUnreadCount,
        lastReadAt: shouldMarkRead ? lastMessage.created_at : conversation.lastReadAt,
        lastReadSequence: shouldMarkRead ? lastMessage.message_sequence ?? conversation.lastReadSequence ?? null : conversation.lastReadSequence ?? null,
        lastMessageSequence: lastMessage.message_sequence ?? conversation.lastMessageSequence ?? null,
        messageCount: nextMessageCount,
        ...(nextMessages ? { messages: nextMessages } : {}),
      };
    });

    return groupChanged ? { ...group, conversations: nextConversations } : group;
  });

  return changed ? { ...current, chats: sortDashboardChatGroups(nextChats) } : current;
}

function patchBrokerDashboardForConversationUpdate(
  current: BrokerDashboardData | null,
  row: ChatConversationRealtimeRow,
  viewerUserId: string,
  activeConversationId: string | null
) {
  if (!current || !row.id || (row.owner_user_id !== viewerUserId && row.broker_user_id !== viewerUserId)) {
    return current;
  }

  const viewerLastReadAt = row.owner_user_id === viewerUserId ? row.owner_last_read_at || null : row.broker_last_read_at || null;
  const viewerLastReadSequence =
    row.owner_user_id === viewerUserId ? row.owner_last_read_sequence ?? null : row.broker_last_read_sequence ?? null;
  let changed = false;
  const nextChats = current.chats.map((group) => {
    let groupChanged = false;
    const nextConversations = group.conversations.map((conversation) => {
      if (conversation.conversationId !== row.id) {
        return conversation;
      }

      const lastActivityAt = row.last_message_at || row.updated_at || conversation.lastActivityAt;
      const lastMessageFromViewer = conversation.lastMessage?.sender_id === viewerUserId;
      const lastMessageSequence = conversation.lastMessage?.message_sequence ?? row.last_message_sequence ?? conversation.lastMessageSequence ?? null;
      const isActiveConversation = row.id === activeConversationId;
      const hasUnread = Boolean(
        !isActiveConversation &&
          conversation.lastMessage &&
          !lastMessageFromViewer &&
          ((typeof viewerLastReadSequence === "number" && typeof lastMessageSequence === "number"
            ? lastMessageSequence > viewerLastReadSequence
            : lastActivityAt && (!viewerLastReadAt || lastActivityAt.localeCompare(viewerLastReadAt) > 0)))
      );
      const unreadCount = hasUnread ? Math.max(conversation.unreadCount || 0, 1) : 0;

      changed = true;
      groupChanged = true;

      return {
        ...conversation,
        lastActivityAt,
        hasUnread,
        unreadCount,
        lastReadAt: viewerLastReadAt,
        lastReadSequence: viewerLastReadSequence,
        lastMessageSequence,
      };
    });

    return groupChanged ? { ...group, conversations: nextConversations } : group;
  });

  return changed ? { ...current, chats: sortDashboardChatGroups(nextChats) } : current;
}

function useDebouncedRealtimeRefresh<T>({
  enabled,
  path,
  setData,
}: {
  enabled: boolean;
  path: string;
  setData: SetSessionData<T>;
}) {
  const enabledRef = useRef(enabled);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const scheduleRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    scheduleRef.current = () => {
      if (!enabledRef.current) {
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const requestId = ++requestIdRef.current;

        void apiFetch<T>(path)
          .then((payload) => {
            if (enabledRef.current && requestId === requestIdRef.current) {
              setData(() => payload);
            }
          })
          .catch(() => undefined);
      }, NOTIFICATION_REFRESH_DEBOUNCE_MS);
    };
  }, [path, setData]);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    []
  );

  return scheduleRef;
}

export function useRealtimeNotificationRefresh({
  accountUser,
  adminEnabled,
  brokerEnabled,
  setAdminOverview,
  setBrokerDashboard,
}: {
  accountUser: AuthUser | null;
  adminEnabled: boolean;
  brokerEnabled: boolean;
  setAdminOverview: SetSessionData<AdminOverview>;
  setBrokerDashboard: SetSessionData<BrokerDashboardData>;
}) {
  const pathname = usePathname();
  const brokerRefreshRef = useDebouncedRealtimeRefresh<BrokerDashboardData>({
    enabled: brokerEnabled,
    path: BROKER_NOTIFICATION_REFRESH_PATH,
    setData: setBrokerDashboard,
  });
  const adminRefreshRef = useDebouncedRealtimeRefresh<AdminOverview>({
    enabled: adminEnabled,
    path: ADMIN_NOTIFICATION_REFRESH_PATH,
    setData: setAdminOverview,
  });
  const userId = accountUser?.platformUser?.id ?? accountUser?.uid ?? null;
  const brokerProfileId = accountUser?.brokerProfile?.id ?? null;
  const activeChatConversationIdRef = useRef(getActiveChatConversationId(pathname));
  const isDocumentVisibleRef = useRef(true);

  useEffect(() => {
    activeChatConversationIdRef.current = getActiveChatConversationId(pathname);
  }, [pathname]);

  useEffect(() => {
    const syncDocumentVisibility = () => {
      isDocumentVisibleRef.current = typeof document === "undefined" || document.visibilityState === "visible";
    };

    syncDocumentVisibility();
    document.addEventListener("visibilitychange", syncDocumentVisibility);
    window.addEventListener("focus", syncDocumentVisibility);
    window.addEventListener("pageshow", syncDocumentVisibility);

    return () => {
      document.removeEventListener("visibilitychange", syncDocumentVisibility);
      window.removeEventListener("focus", syncDocumentVisibility);
      window.removeEventListener("pageshow", syncDocumentVisibility);
    };
  }, []);

  useEffect(() => {
    if (!brokerEnabled || !userId) {
      return;
    }

    let didCleanup = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const scheduleRefresh = () => brokerRefreshRef.current();
    const handleChatMessageInsert = (rawRow: Partial<ChatConversationMessageRealtimeRow> | null | undefined) => {
      if (rawRow) {
        setBrokerDashboard((current) =>
          patchBrokerDashboardForChatMessage(
            current,
            rawRow,
            userId,
            isDocumentVisibleRef.current ? activeChatConversationIdRef.current : null
          )
        );
      }

      scheduleRefresh();
    };
    const handleConversationChange = (rawRow: Partial<ChatConversationRealtimeRow> | null | undefined) => {
      if (rawRow) {
        setBrokerDashboard((current) =>
          patchBrokerDashboardForConversationUpdate(
            current,
            rawRow,
            userId,
            isDocumentVisibleRef.current ? activeChatConversationIdRef.current : null
          )
        );
      }

      scheduleRefresh();
    };

    const subscribe = async () => {
      const accessToken = await syncSupabaseRealtimeAuth();
      if (didCleanup) {
        return;
      }

      if (!accessToken) {
        return;
      }

      channel = supabase
        .channel(`broker-notification-refresh-${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads", filter: `to_user_id=eq.${userId}` }, scheduleRefresh)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads", filter: `to_user_id=eq.${userId}` }, scheduleRefresh)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_conversation_messages", filter: `receiver_id=eq.${userId}` }, (payload) =>
          handleChatMessageInsert(payload.new as Partial<ChatConversationMessageRealtimeRow>)
        )
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_conversation_messages", filter: `sender_id=eq.${userId}` }, (payload) =>
          handleChatMessageInsert(payload.new as Partial<ChatConversationMessageRealtimeRow>)
        )
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_conversation_messages", filter: `receiver_id=eq.${userId}` }, (payload) =>
          handleChatMessageInsert(payload.new as Partial<ChatConversationMessageRealtimeRow>)
        )
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_conversation_messages", filter: `sender_id=eq.${userId}` }, (payload) =>
          handleChatMessageInsert(payload.new as Partial<ChatConversationMessageRealtimeRow>)
        )
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_conversations", filter: `owner_user_id=eq.${userId}` }, (payload) =>
          handleConversationChange(payload.new as Partial<ChatConversationRealtimeRow>)
        )
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_conversations", filter: `broker_user_id=eq.${userId}` }, (payload) =>
          handleConversationChange(payload.new as Partial<ChatConversationRealtimeRow>)
        )
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_conversations", filter: `owner_user_id=eq.${userId}` }, (payload) =>
          handleConversationChange(payload.new as Partial<ChatConversationRealtimeRow>)
        )
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_conversations", filter: `broker_user_id=eq.${userId}` }, (payload) =>
          handleConversationChange(payload.new as Partial<ChatConversationRealtimeRow>)
        )
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "listings", filter: `created_by=eq.${userId}` }, scheduleRefresh)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "listings", filter: `created_by=eq.${userId}` }, scheduleRefresh);

      if (brokerProfileId) {
        channel
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "broker_notifications", filter: `recipient_broker_id=eq.${brokerProfileId}` }, scheduleRefresh)
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "broker_notifications", filter: `recipient_broker_id=eq.${brokerProfileId}` }, scheduleRefresh)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "requirement_matches", filter: `sender_broker_id=eq.${brokerProfileId}` }, scheduleRefresh)
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "requirement_matches", filter: `sender_broker_id=eq.${brokerProfileId}` }, scheduleRefresh)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "requirement_matches", filter: `receiver_broker_id=eq.${brokerProfileId}` }, scheduleRefresh)
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "requirement_matches", filter: `receiver_broker_id=eq.${brokerProfileId}` }, scheduleRefresh)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "requirements", filter: `broker_id=eq.${brokerProfileId}` }, scheduleRefresh)
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "requirements", filter: `broker_id=eq.${brokerProfileId}` }, scheduleRefresh);
      }

      channel.subscribe();
    };

    void subscribe();

    return () => {
      didCleanup = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [brokerEnabled, brokerProfileId, brokerRefreshRef, setBrokerDashboard, userId]);

  useEffect(() => {
    if (!adminEnabled || !userId) {
      return;
    }

    let didCleanup = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const scheduleRefresh = () => adminRefreshRef.current();

    const subscribe = async () => {
      const accessToken = await syncSupabaseRealtimeAuth();
      if (didCleanup) {
        return;
      }

      if (!accessToken) {
        return;
      }

      channel = supabase
        .channel(`admin-notification-refresh-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "admin_priority_queue_notifications", filter: `admin_user_id=eq.${userId}` }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "users" }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "broker_profiles" }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "requirements" }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, scheduleRefresh)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_conversation_messages" }, scheduleRefresh);

      channel.subscribe();
    };

    void subscribe();

    return () => {
      didCleanup = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [adminEnabled, adminRefreshRef, userId]);
}
