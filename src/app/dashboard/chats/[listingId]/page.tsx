"use client";

import {
  AccessTimeRounded,
  AutoAwesomeRounded,
  BedRounded,
  CallRounded,
  ChatBubbleOutlineRounded,
  HomeWorkOutlined,
  MailOutlineRounded,
  NorthEastRounded,
  PlaceRounded,
  SearchRounded,
  SendRounded,
  StraightenRounded,
  WhatsApp,
} from "@mui/icons-material";
import { type ReactNode, type UIEvent, FormEvent, Suspense, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSnackbar } from "notistack";
import { AppShell } from "@/components/AppShell";
import { BackButton } from "@/components/BackButton";
import { BrokerAvatar } from "@/components/BrokerAvatar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SkeletonBlock } from "@/components/SkeletonBlock";
import { useAuth } from "@/auth/useAuth";
import { getClientSessionResetEpoch } from "@/lib/client-session";
import { apiFetch, apiFetchCached, getApiCacheKey, setCachedApiData } from "@/lib/deal-api";
import { invalidateChatCaches } from "@/lib/client-cache";
import { supabase, syncSupabaseRealtimeAuth } from "@/lib/supabase";
import { getSessionResource, getSessionResourceGeneration } from "@/lib/session-resource";
import type { BrokerDashboardData, BrokerListingDetail, ChatConversationSummary, ChatMessage, ChatUserSummary, Listing, ListingImage, Requirement } from "@/lib/deal-types";
import {
  cn,
  formatCurrency,
  formatDealType,
  formatListingStatus,
  formatNumber,
  formatPropertyType,
  getMailtoLink,
  getWhatsappLink,
  isActiveListingStatus,
} from "@/lib/deal-utils";
import { canAccessBrokerWorkspace, getDefaultRouteForUser } from "@/lib/route-access";

type ChatMessageDeliveryState = "pending" | "failed";
type ChatRenderableMessage = ChatMessage & {
  clientTempId?: string;
  deliveryState?: ChatMessageDeliveryState;
  errorMessage?: string | null;
  optimisticCreatedAt?: string;
  optimisticSequence?: number;
};

type ChatResponse = {
  conversationId: string | null;
  listing: {
    id: string;
    title: string;
    status: string;
    is_visible: boolean;
    canPost: boolean;
    isOwner: boolean;
    isActive: boolean;
    isAvailable: boolean;
  };
  participant: ChatUserSummary | null;
  messages: ChatRenderableMessage[];
  messagesHasMore?: boolean;
  messagesNextCursor?: ChatMessagePaginationCursor | null;
};

type ChatConversationMessageRealtimeRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id?: string | null;
  client_message_id?: string | null;
  message_sequence?: number | null;
  content?: string | null;
  body?: string | null;
  created_at: string;
  updated_at: string | null;
};

type ChatConversationRealtimeRow = {
  id: string;
  listing_id: string;
  owner_user_id: string;
  broker_user_id: string;
  created_at: string | null;
  updated_at: string | null;
  last_message_at: string | null;
  last_message_sequence?: number | null;
  owner_last_read_at?: string | null;
  broker_last_read_at?: string | null;
  owner_last_read_sequence?: number | null;
  broker_last_read_sequence?: number | null;
};

type SendConversationMessageResult = {
  success: true;
  messageId: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  message?: ChatConversationMessageRealtimeRow;
};
type SendListingChatMessageResult = SendConversationMessageResult & {
  conversationId: string;
};

type ChatConversationPaginationCursor = {
  lastSequence: number;
  id: string;
};
type ChatMessagePaginationCursor = {
  sequence?: number | null;
  createdAt?: string;
  id: string;
};
type ChatSendTarget = {
  initialConversationId: string | null;
  conversationId: string | null;
  draftListingId: string | null;
  isDraftChat: boolean;
  listingId: string | null;
  listingIsOwner: boolean;
  receiverId: string | null;
  routeConversationId: string | null;
};
type ConversationsResponse = {
  groups: ChatConversationSummary[];
  hasMore?: boolean;
  nextCursor?: ChatConversationPaginationCursor | null;
  totalRecentConversations?: number;
  totalUnreadConversations?: number;
  totalAllConversations?: number;
};
type RequirementDetailResponse = { requirement: Requirement };
type ThreadFilterId = "recent" | "unread" | "all";
type ConversationTabCounts = Record<ThreadFilterId, number>;
type SidebarThread = ChatConversationSummary["conversations"][number] & {
  listing: ChatConversationSummary["listing"];
};
type ConversationThreadSummary = ChatConversationSummary["conversations"][number];
type ChatSignalItem = {
  icon: ReactNode;
  label: string;
  tone: string;
};
type ContextDetailItem = {
  icon: ReactNode;
  value: string | null | undefined;
};
type ContextDetailSection = {
  title: string;
  subtitle?: string | null;
  emptyText?: string | null;
  items: ContextDetailItem[];
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const OPTIMISTIC_MESSAGE_ID_PREFIX = "optimistic-";
const CHAT_METADATA_TTL_MS = 60_000;
const CHAT_PAYLOAD_TTL_MS = 15_000;
const CHAT_DASHBOARD_TTL_MS = 45_000;
const CHAT_CONVERSATION_PAGE_SIZE = 10;
const CHAT_MESSAGE_PAGE_SIZE = 20;
const CHAT_SIDEBAR_LOAD_THRESHOLD_PX = 96;
const CHAT_MESSAGE_LOAD_THRESHOLD_PX = 96;
const CHAT_OUTBOX_STORAGE_PREFIX = "deal-exchange:broker-chat-outbox:";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMPTY_CONVERSATION_TAB_COUNTS: ConversationTabCounts = {
  recent: 0,
  unread: 0,
  all: 0,
};
const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const clockFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const shortDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const THREAD_FILTERS: Array<{ id: ThreadFilterId; label: string }> = [
  { id: "recent", label: "Recent" },
  { id: "unread", label: "Unread" },
  { id: "all", label: "All msgs" },
];

const getDisplayName = (firstName?: string | null, lastName?: string | null, fallback = "Broker") =>
  [firstName, lastName].filter(Boolean).join(" ").trim() || fallback;

const getMessagePreview = (message?: ChatMessage | null) =>
  String(message?.content || "").replace(/\s+/g, " ").trim() || "No message yet";

const getThreadActivityTime = (thread: Pick<ChatConversationSummary["conversations"][number], "lastActivityAt" | "lastMessage"> | null | undefined) =>
  thread?.lastActivityAt || thread?.lastMessage?.created_at || "";

const sortThreadsByRecentActivity = (threads: SidebarThread[]) =>
  [...threads].sort((left, right) => getThreadActivityTime(right).localeCompare(getThreadActivityTime(left)));

const getListingImage = (listingDetail: Listing | null, listingGroup: ChatConversationSummary | null): ListingImage | null => {
  const images = listingDetail?.listing_images?.length
    ? listingDetail.listing_images
    : listingGroup?.listing.listing_images?.length
      ? listingGroup.listing.listing_images
      : [];

  return images.find((image) => image.is_cover) || images[0] || null;
};

const formatPhoneHref = (value: string) => {
  const normalized = value.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : null;
};

function getCachedApiPayload<T>(path: string | null) {
  return path ? getSessionResource<T>(getApiCacheKey(path)) : null;
}

function getSafeCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function getConversationTabCountsFromPayload(payload: Partial<ConversationsResponse> | null | undefined): ConversationTabCounts | null {
  if (
    typeof payload?.totalRecentConversations !== "number" ||
    typeof payload.totalUnreadConversations !== "number" ||
    typeof payload.totalAllConversations !== "number"
  ) {
    return null;
  }

  return {
    recent: getSafeCount(payload.totalRecentConversations),
    unread: getSafeCount(payload.totalUnreadConversations),
    all: getSafeCount(payload.totalAllConversations),
  };
}

function serializeConversationTabCounts(counts: ConversationTabCounts) {
  return {
    totalRecentConversations: counts.recent,
    totalUnreadConversations: counts.unread,
    totalAllConversations: counts.all,
  };
}

function patchConversationTabCountsValue(
  counts: ConversationTabCounts,
  updater: (current: ConversationTabCounts) => ConversationTabCounts
) {
  const nextCounts = updater(counts);
  return {
    recent: getSafeCount(nextCounts.recent),
    unread: getSafeCount(nextCounts.unread),
    all: getSafeCount(nextCounts.all),
  };
}

function getConversationTabCount(counts: ConversationTabCounts, filter: ThreadFilterId) {
  return counts[filter] || 0;
}

function appendPaginationParam(url: string, key: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${encodeURIComponent(String(value))}`;
}

function getConversationsPagePath(filter: ThreadFilterId = "recent", cursor?: ChatConversationPaginationCursor | null) {
  let path = `/api/chat/conversations?limit=${CHAT_CONVERSATION_PAGE_SIZE}&filter=${filter}`;
  if (cursor) {
    path = appendPaginationParam(path, "cursor", JSON.stringify(cursor));
  }

  return path;
}

function getConversationChatPath(conversationId: string | null | undefined, cursor?: ChatMessagePaginationCursor | null) {
  if (!conversationId) {
    return null;
  }

  let path = `/api/chat/conversations/${conversationId}?limit=${CHAT_MESSAGE_PAGE_SIZE}`;
  if (cursor) {
    path = appendPaginationParam(path, "cursor", JSON.stringify(cursor));
  }

  return path;
}

function getConversationSummaryPath(conversationId: string | null | undefined) {
  return conversationId ? `/api/chat/conversations/${conversationId}/summary` : null;
}

function isBrowserDocumentVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function getListingChatPath(listingId: string | null | undefined, cursor?: ChatMessagePaginationCursor | null) {
  if (!listingId) {
    return null;
  }

  let path = `/api/chat/${listingId}?limit=${CHAT_MESSAGE_PAGE_SIZE}`;
  if (cursor) {
    path = appendPaginationParam(path, "cursor", JSON.stringify(cursor));
  }

  return path;
}

function getMessageTimestamp(value: string | null | undefined) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getMessageOptimisticSequence(message: Pick<ChatRenderableMessage, "optimisticSequence">) {
  return typeof message.optimisticSequence === "number" && Number.isFinite(message.optimisticSequence)
    ? message.optimisticSequence
    : null;
}

function getMessageSequence(message: Pick<ChatRenderableMessage, "message_sequence">) {
  return typeof message.message_sequence === "number" && Number.isFinite(message.message_sequence)
    ? message.message_sequence
    : null;
}

function getMessageClientId(message: Pick<ChatRenderableMessage, "client_message_id" | "clientTempId">) {
  return message.client_message_id || message.clientTempId || null;
}

function getMessageStableId(message: Pick<ChatRenderableMessage, "client_message_id" | "clientTempId" | "id">) {
  return message.client_message_id || message.clientTempId || message.id || "";
}

function createClientMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const randomValue = Math.floor(Math.random() * 16);
    const value = token === "x" ? randomValue : (randomValue & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getPersistedConversationId(value: string | null | undefined) {
  const normalizedValue = value?.trim();
  return normalizedValue && UUID_PATTERN.test(normalizedValue) ? normalizedValue : null;
}

function isConversationNotFoundError(error: unknown) {
  return error instanceof Error && error.message === "Conversation not found.";
}

function isConversationAccessError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message === "Conversation not found." || error.message === "You cannot access this conversation.")
  );
}

function getMessageConversationId(message: Pick<ChatMessage, "conversation_id"> | null | undefined) {
  return message?.conversation_id || null;
}

function getMessageReceiverId(message: Pick<ChatMessage, "receiver_id"> | null | undefined) {
  return message?.receiver_id || null;
}

function compareChatMessages(left: ChatRenderableMessage, right: ChatRenderableMessage) {
  const leftServerSequence = getMessageSequence(left);
  const rightServerSequence = getMessageSequence(right);
  if (leftServerSequence !== null || rightServerSequence !== null) {
    if (leftServerSequence !== null && rightServerSequence !== null && leftServerSequence !== rightServerSequence) {
      return leftServerSequence - rightServerSequence;
    }

    if (leftServerSequence !== null && rightServerSequence === null) {
      return -1;
    }

    if (leftServerSequence === null && rightServerSequence !== null) {
      return 1;
    }
  }

  const leftSequence = getMessageOptimisticSequence(left);
  const rightSequence = getMessageOptimisticSequence(right);
  if (leftSequence !== null && rightSequence !== null && leftSequence !== rightSequence) {
    return leftSequence - rightSequence;
  }

  const leftTimestamp = getMessageTimestamp(left.created_at);
  const rightTimestamp = getMessageTimestamp(right.created_at);
  const timestampDiff = leftTimestamp - rightTimestamp;
  if (timestampDiff !== 0) {
    return timestampDiff;
  }

  return getMessageStableId(left).localeCompare(getMessageStableId(right));
}

function mergeReplacementMessage(existingMessage: ChatRenderableMessage, nextMessage: ChatRenderableMessage) {
  return {
    ...nextMessage,
    clientTempId: nextMessage.clientTempId || existingMessage.clientTempId || existingMessage.id,
    client_message_id: nextMessage.client_message_id || existingMessage.client_message_id || existingMessage.clientTempId || null,
    message_sequence: nextMessage.message_sequence ?? existingMessage.message_sequence ?? null,
    optimisticCreatedAt: nextMessage.optimisticCreatedAt || existingMessage.optimisticCreatedAt || existingMessage.created_at,
    optimisticSequence: nextMessage.optimisticSequence ?? existingMessage.optimisticSequence,
    sender: nextMessage.sender || existingMessage.sender || null,
  };
}

function sortChatMessages(messages: ChatRenderableMessage[]) {
  const uniqueMessages: ChatRenderableMessage[] = [];

  for (const message of messages) {
    const existingMessageIndex = uniqueMessages.findIndex(
      (existingMessage) =>
        existingMessage.id === message.id ||
        Boolean(getMessageClientId(existingMessage) && getMessageClientId(existingMessage) === getMessageClientId(message))
    );

    if (existingMessageIndex === -1) {
      uniqueMessages.push(message);
      continue;
    }

    uniqueMessages[existingMessageIndex] = mergeReplacementMessage(uniqueMessages[existingMessageIndex], message);
  }

  return uniqueMessages.sort(compareChatMessages);
}

function isMatchingPersistedMessage(left: ChatRenderableMessage, right: ChatRenderableMessage) {
  if (left.id === right.id) {
    return true;
  }

  const leftClientId = getMessageClientId(left);
  const rightClientId = getMessageClientId(right);
  return Boolean(leftClientId && rightClientId && leftClientId === rightClientId);
}

function findOptimisticReplacementIndex(messages: ChatRenderableMessage[], nextMessage: ChatRenderableMessage) {
  const nextClientId = getMessageClientId(nextMessage);
  if (!nextClientId) {
    return -1;
  }

  return messages.findIndex((existingMessage) => existingMessage.deliveryState && getMessageClientId(existingMessage) === nextClientId);
}

function findMessageReplacementIndex(messages: ChatRenderableMessage[], nextMessage: ChatRenderableMessage, replaceMessageId?: string) {
  if (replaceMessageId) {
    const explicitIndex = messages.findIndex((message) => message.id === replaceMessageId || message.clientTempId === replaceMessageId);
    if (explicitIndex !== -1) {
      return explicitIndex;
    }
  }

  const identityIndex = messages.findIndex(
    (message) =>
      message.id === nextMessage.id ||
      Boolean(getMessageClientId(message) && getMessageClientId(message) === getMessageClientId(nextMessage))
  );
  if (identityIndex !== -1) {
    return identityIndex;
  }

  return findOptimisticReplacementIndex(messages, nextMessage);
}

function shouldReplaceMessageWithIncoming(existingMessage: ChatRenderableMessage, nextMessage: ChatRenderableMessage, replaceMessageId?: string) {
  const existingConversationId = getMessageConversationId(existingMessage);
  const nextConversationId = getMessageConversationId(nextMessage);
  if (existingConversationId && nextConversationId && existingConversationId !== nextConversationId) {
    return false;
  }

  if (
    existingMessage.id === nextMessage.id ||
    (replaceMessageId && (existingMessage.id === replaceMessageId || existingMessage.clientTempId === replaceMessageId)) ||
    Boolean(getMessageClientId(existingMessage) && getMessageClientId(existingMessage) === getMessageClientId(nextMessage))
  ) {
    return true;
  }

  return Boolean(existingMessage.deliveryState && !nextMessage.deliveryState && isMatchingPersistedMessage(existingMessage, nextMessage));
}

function hasMatchingMessage(messages: ChatRenderableMessage[] | undefined, nextMessage: ChatRenderableMessage, replaceMessageId?: string) {
  return !!messages?.some((message) => shouldReplaceMessageWithIncoming(message, nextMessage, replaceMessageId));
}

function threadHasMatchingMessage(
  thread: ConversationThreadSummary | null | undefined,
  nextMessage: ChatRenderableMessage,
  replaceMessageId?: string
) {
  return Boolean(
    hasMatchingMessage(thread?.messages, nextMessage, replaceMessageId) ||
      (thread?.lastMessage && shouldReplaceMessageWithIncoming(thread.lastMessage as ChatRenderableMessage, nextMessage, replaceMessageId))
  );
}

function mergeChatMessagesWithIncoming(
  messages: ChatRenderableMessage[] | undefined,
  nextMessage: ChatRenderableMessage,
  replaceMessageId?: string
) {
  const currentMessages = [...(messages || [])];
  const replacementIndex = findMessageReplacementIndex(currentMessages, nextMessage, replaceMessageId);

  if (replacementIndex === -1) {
    return sortChatMessages([...currentMessages, nextMessage]);
  }

  currentMessages[replacementIndex] = mergeReplacementMessage(currentMessages[replacementIndex], nextMessage);
  return sortChatMessages(currentMessages);
}

function mergeTransientChatPayloadMessages(incoming: ChatResponse, current: ChatResponse | null) {
  const currentMessages =
    current?.messages.filter(
      (message) => !incoming.conversationId || !getMessageConversationId(message) || getMessageConversationId(message) === incoming.conversationId
    ) || [];

  if (!currentMessages.length) {
    return {
      ...incoming,
      messages: sortChatMessages(incoming.messages),
    };
  }

  const mergedMessages = incoming.messages.reduce(
    (messages, incomingMessage) => mergeChatMessagesWithIncoming(messages, incomingMessage),
    currentMessages
  );

  return {
    ...incoming,
    messages: sortChatMessages(mergedMessages),
    messagesHasMore:
      current?.conversationId && current.conversationId === incoming.conversationId
        ? current.messagesHasMore ?? incoming.messagesHasMore
        : incoming.messagesHasMore,
    messagesNextCursor:
      current?.conversationId && current.conversationId === incoming.conversationId
        ? current.messagesNextCursor ?? incoming.messagesNextCursor
        : incoming.messagesNextCursor,
  };
}

function buildLocalChatMessage({
  clientMessageId,
  clientTempId,
  content,
  conversationId,
  createdAt,
  deliveryState,
  errorMessage,
  listingId,
  messageId,
  messageSequence,
  optimisticCreatedAt,
  optimisticSequence,
  receiverId,
  sender,
  senderId,
  updatedAt,
}: {
  clientMessageId?: string | null;
  clientTempId?: string;
  content: string;
  conversationId: string | null;
  createdAt: string;
  deliveryState?: ChatMessageDeliveryState;
  errorMessage?: string | null;
  listingId: string;
  messageId: string;
  messageSequence?: number | null;
  optimisticCreatedAt?: string;
  optimisticSequence?: number;
  receiverId?: string | null;
  sender: ChatMessage["sender"];
  senderId: string;
  updatedAt?: string | null;
}): ChatRenderableMessage {
  return {
    id: messageId,
    clientTempId,
    listing_id: listingId,
    conversation_id: conversationId || undefined,
    sender_id: senderId,
    receiver_id: receiverId || null,
    client_message_id: clientMessageId || clientTempId || null,
    message_sequence: messageSequence ?? null,
    content,
    created_at: createdAt,
    updated_at: updatedAt || createdAt,
    deliveryState,
    errorMessage,
    optimisticCreatedAt,
    optimisticSequence,
    sender,
  };
}

function upsertChatPayloadMessage(current: ChatResponse | null, nextMessage: ChatRenderableMessage, nextConversationId: string | null) {
  if (!current) {
    return current;
  }

  const currentConversationId = current.conversationId || null;
  const messageConversationId = getMessageConversationId(nextMessage);
  if (
    currentConversationId &&
    ((messageConversationId && messageConversationId !== currentConversationId) ||
      (nextConversationId && nextConversationId !== currentConversationId))
  ) {
    return current;
  }

  return {
    ...current,
    conversationId: nextConversationId,
    messages: mergeChatMessagesWithIncoming(current.messages, nextMessage),
  };
}

function replaceChatPayloadMessage(
  current: ChatResponse | null,
  optimisticMessageId: string,
  nextMessage: ChatRenderableMessage,
  nextConversationId: string | null
) {
  if (!current) {
    return current;
  }

  const currentConversationId = current.conversationId || null;
  const messageConversationId = getMessageConversationId(nextMessage);
  const hasLocalReplacement = current.messages.some(
    (message) => message.id === optimisticMessageId || message.clientTempId === optimisticMessageId
  );
  if (
    currentConversationId &&
    ((messageConversationId && messageConversationId !== currentConversationId) ||
      (nextConversationId && nextConversationId !== currentConversationId)) &&
    !hasLocalReplacement
  ) {
    return current;
  }

  return {
    ...current,
    conversationId: nextConversationId,
    messages: mergeChatMessagesWithIncoming(current.messages, nextMessage, optimisticMessageId),
  };
}

function patchChatPayloadMessage(
  current: ChatResponse | null,
  messageId: string,
  updater: (message: ChatRenderableMessage) => ChatRenderableMessage
) {
  if (!current) {
    return current;
  }

  const existingMessageIndex = current.messages.findIndex((message) => message.id === messageId || message.clientTempId === messageId);
  if (existingMessageIndex === -1) {
    return current;
  }

  return {
    ...current,
    messages: sortChatMessages(
      current.messages.map((message) => (message.id === messageId || message.clientTempId === messageId ? updater(message) : message))
    ),
  };
}

function normalizeConversationThread(thread: ChatConversationSummary["conversations"][number]) {
  const messages = thread.messages ? sortChatMessages(thread.messages as ChatRenderableMessage[]) : undefined;
  const lastMessage = getLatestChatMessageFromCandidates([...(messages || []), thread.lastMessage]) || thread.lastMessage || null;

  return {
    ...thread,
    lastMessage,
    lastActivityAt: getNewestChatTimestamp(thread.lastActivityAt, lastMessage?.created_at),
    lastMessageSequence: thread.lastMessageSequence ?? lastMessage?.message_sequence ?? null,
    messageCount: Math.max(thread.messageCount || 0, messages?.length || 0),
    ...(messages ? { messages } : {}),
  };
}

function sortConversationGroups(groups: ChatConversationSummary[]) {
  return groups
    .map((group) => ({
      ...group,
      conversations: group.conversations
        .map((conversation) => normalizeConversationThread(conversation))
        .sort((left, right) => getThreadActivityTime(right).localeCompare(getThreadActivityTime(left))),
    }))
    .sort((left, right) => getThreadActivityTime(right.conversations[0]).localeCompare(getThreadActivityTime(left.conversations[0])));
}

function patchConversationGroupsThread(
  groups: ChatConversationSummary[],
  conversationId: string | null | undefined,
  updater: (thread: ChatConversationSummary["conversations"][number]) => ChatConversationSummary["conversations"][number]
) {
  if (!conversationId) {
    return groups;
  }

  let changed = false;
  const nextGroups = groups.map((group) => {
    let groupChanged = false;
    const nextConversations = group.conversations.map((thread) => {
      if (thread.conversationId !== conversationId) {
        return thread;
      }

      changed = true;
      groupChanged = true;
      return updater(thread);
    });

    return groupChanged ? { ...group, conversations: nextConversations } : group;
  });

  return changed ? sortConversationGroups(nextGroups) : groups;
}

function upsertThreadMessage(messages: ChatMessage[] | undefined, nextMessage: ChatRenderableMessage, replaceMessageId?: string) {
  return mergeChatMessagesWithIncoming(messages, nextMessage, replaceMessageId);
}

function getLatestChatMessage(messages: ChatRenderableMessage[] | ChatMessage[] | undefined, fallback: ChatRenderableMessage) {
  return getLatestChatMessageFromCandidates([...(messages || []), fallback]) || fallback;
}

function getThreadUnreadCount(thread: Pick<ChatConversationSummary["conversations"][number], "unreadCount" | "hasUnread">) {
  return Math.max(thread.unreadCount || 0, thread.hasUnread ? 1 : 0);
}

function getNewestChatTimestamp(...values: Array<string | null | undefined>) {
  return values.reduce<string | null>((newest, value) => {
    if (!value) return newest;
    return !newest || value.localeCompare(newest) > 0 ? value : newest;
  }, null);
}

function getLatestChatMessageFromCandidates(messages: Array<ChatRenderableMessage | ChatMessage | null | undefined>) {
  const sortedMessages = sortChatMessages(messages.filter(Boolean) as ChatRenderableMessage[]);
  return sortedMessages[sortedMessages.length - 1] || null;
}

function getHighestMessageSequence(messages: Array<Pick<ChatRenderableMessage, "message_sequence">> | undefined) {
  return (messages || []).reduce<number | null>((highest, message) => {
    const sequence = getMessageSequence(message);
    if (sequence === null) {
      return highest;
    }

    return highest === null || sequence > highest ? sequence : highest;
  }, null);
}

function countUnreadMessages(
  messages: ChatMessage[] | undefined,
  viewerUserId: string | null,
  lastReadAt: string | null,
  lastReadSequence: number | null | undefined,
  isActiveConversation: boolean
) {
  if (!viewerUserId || isActiveConversation) {
    return 0;
  }

  return (messages || []).reduce((count, message) => {
    const receiverId = getMessageReceiverId(message);
    if (receiverId ? receiverId !== viewerUserId : message.sender_id === viewerUserId) {
      return count;
    }

    const messageSequence = message.message_sequence ?? null;
    if (typeof lastReadSequence === "number" && typeof messageSequence === "number" && messageSequence <= lastReadSequence) {
      return count;
    }

    if (lastReadAt && messageSequence === null && message.created_at.localeCompare(lastReadAt) <= 0) {
      return count;
    }

    return count + 1;
  }, 0);
}

function mergeThreadSummariesForRealtime({
  activeConversationId,
  authoritativeUnreadCount,
  currentThread,
  incomingThread,
  viewerUserId,
}: {
  activeConversationId: string | null;
  authoritativeUnreadCount?: number | null;
  currentThread?: ConversationThreadSummary | null;
  incomingThread: ConversationThreadSummary;
  viewerUserId: string | null;
}): ConversationThreadSummary {
  const conversationId = incomingThread.conversationId || currentThread?.conversationId;
  const isActiveConversation = Boolean(conversationId && activeConversationId === conversationId);
  const mergedMessages = sortChatMessages([
    ...(incomingThread.messages || []),
    ...(incomingThread.lastMessage ? [incomingThread.lastMessage] : []),
    ...(currentThread?.messages || []),
    ...(currentThread?.lastMessage ? [currentThread.lastMessage] : []),
  ] as ChatRenderableMessage[]);
  const lastMessage =
    getLatestChatMessageFromCandidates([
      ...mergedMessages,
      incomingThread.lastMessage,
      currentThread?.lastMessage,
    ]) ||
    incomingThread.lastMessage ||
    currentThread?.lastMessage ||
    null;
  const lastActivityAt = getNewestChatTimestamp(
    incomingThread.lastActivityAt,
    currentThread?.lastActivityAt,
    lastMessage?.created_at
  );
  const lastReadAt = getNewestChatTimestamp(
    incomingThread.lastReadAt,
    currentThread?.lastReadAt,
    isActiveConversation ? lastActivityAt : null
  );
  const lastReadSequence = isActiveConversation
    ? lastMessage?.message_sequence ?? incomingThread.lastReadSequence ?? currentThread?.lastReadSequence ?? null
    : Math.max(incomingThread.lastReadSequence ?? 0, currentThread?.lastReadSequence ?? 0) || null;
  const locallyComputedUnreadCount = mergedMessages.length
    ? countUnreadMessages(mergedMessages, viewerUserId, lastReadAt, lastReadSequence, isActiveConversation)
    : isActiveConversation
      ? 0
      : Math.max(getThreadUnreadCount(incomingThread), currentThread ? getThreadUnreadCount(currentThread) : 0);
  const unreadCount = isActiveConversation
    ? 0
    : typeof authoritativeUnreadCount === "number"
      ? getSafeCount(authoritativeUnreadCount)
      : locallyComputedUnreadCount;

  return {
    ...(currentThread || {}),
    ...incomingThread,
    participant: incomingThread.participant || currentThread?.participant || null,
    lastMessage,
    lastActivityAt,
    hasUnread: unreadCount > 0,
    unreadCount,
    lastReadAt,
    lastReadSequence,
    lastMessageSequence: lastMessage?.message_sequence ?? incomingThread.lastMessageSequence ?? currentThread?.lastMessageSequence ?? null,
    messageCount: Math.max(incomingThread.messageCount || 0, currentThread?.messageCount || 0, mergedMessages.length),
    messages: mergedMessages,
    contextType: incomingThread.contextType || currentThread?.contextType,
    requirement: incomingThread.requirement || currentThread?.requirement || null,
    requirementMatch: incomingThread.requirementMatch || currentThread?.requirementMatch || null,
  };
}

function mergeConversationGroupsForRealtime({
  activeConversationId,
  currentGroups,
  incomingGroups,
  viewerUserId,
}: {
  activeConversationId: string | null;
  currentGroups: ChatConversationSummary[];
  incomingGroups: ChatConversationSummary[];
  viewerUserId: string | null;
}) {
  if (!currentGroups.length) {
    return sortConversationGroups(
      incomingGroups.map((group) => ({
        ...group,
        conversations: group.conversations.map((conversation) =>
          mergeThreadSummariesForRealtime({
            activeConversationId,
            authoritativeUnreadCount: conversation.unreadCount,
            incomingThread: conversation,
            viewerUserId,
          })
        ),
      }))
    );
  }

  const currentEntriesByConversationId = new Map<string, { group: ChatConversationSummary; conversation: ConversationThreadSummary }>();
  currentGroups.forEach((group) => {
    group.conversations.forEach((conversation) => {
      currentEntriesByConversationId.set(conversation.conversationId, { group, conversation });
    });
  });

  const incomingConversationIds = new Set<string>();
  const mergedGroups = incomingGroups.map((group) => ({
    ...group,
    conversations: group.conversations.map((incomingThread) => {
      incomingConversationIds.add(incomingThread.conversationId);
      return mergeThreadSummariesForRealtime({
        activeConversationId,
        authoritativeUnreadCount: incomingThread.unreadCount,
        currentThread: currentEntriesByConversationId.get(incomingThread.conversationId)?.conversation || null,
        incomingThread,
        viewerUserId,
      });
    }),
  }));

  currentGroups.forEach((currentGroup) => {
    const missingThreads = currentGroup.conversations.filter((conversation) => !incomingConversationIds.has(conversation.conversationId));
    if (!missingThreads.length) {
      return;
    }

    let targetGroup = mergedGroups.find((group) => group.listing.id === currentGroup.listing.id);
    if (!targetGroup) {
      targetGroup = { ...currentGroup, conversations: [] };
      mergedGroups.push(targetGroup);
    }

    targetGroup.conversations = [
      ...targetGroup.conversations,
      ...missingThreads.map((thread) =>
        mergeThreadSummariesForRealtime({
          activeConversationId,
          incomingThread: thread,
          viewerUserId,
        })
      ),
    ];
  });

  return sortConversationGroups(mergedGroups);
}

function syncConversationGroupsCache(groups: ChatConversationSummary[], counts?: ConversationTabCounts | null, filter: ThreadFilterId = "recent") {
  const currentPayload = getCachedApiPayload<ConversationsResponse>(getConversationsPagePath(filter)) || {};

  setCachedApiData(
    getConversationsPagePath(filter),
    {
      ...currentPayload,
      groups,
      ...(counts ? serializeConversationTabCounts(counts) : {}),
    },
    {},
    CHAT_METADATA_TTL_MS
  );
}

function syncBrokerDashboardChatsCache(groups: ChatConversationSummary[]) {
  ["/api/dashboard/chats"].forEach((path) => {
    const currentDashboard = getCachedApiPayload<BrokerDashboardData>(path);
    if (!currentDashboard) {
      return;
    }

    setCachedApiData(
      path,
      {
        ...currentDashboard,
        chats: groups,
      },
      {},
      CHAT_DASHBOARD_TTL_MS
    );
  });
}

function buildChatSendTarget({
  chatSnapshot,
  draftListingId,
  isDraftChat,
  routeConversationId,
}: {
  chatSnapshot: ChatResponse;
  draftListingId: string | null;
  isDraftChat: boolean;
  routeConversationId: string | null;
}): ChatSendTarget {
  const conversationId =
    getPersistedConversationId(chatSnapshot.conversationId) || (isDraftChat ? null : getPersistedConversationId(routeConversationId));

  return {
    initialConversationId: chatSnapshot.conversationId || null,
    conversationId,
    draftListingId,
    isDraftChat,
    listingId: chatSnapshot.listing.id || draftListingId || null,
    listingIsOwner: chatSnapshot.listing.isOwner,
    receiverId: chatSnapshot.participant?.id || null,
    routeConversationId: routeConversationId || null,
  };
}

function getChatSendQueueKey(sendTarget: ChatSendTarget) {
  return sendTarget.conversationId
    ? `conversation:${sendTarget.conversationId}`
    : sendTarget.listingId
      ? `listing:${sendTarget.listingId}`
      : `draft:${sendTarget.routeConversationId || sendTarget.initialConversationId || "unknown"}`;
}

function isChatPayloadForSendTarget(current: ChatResponse | null, sendTarget: ChatSendTarget, nextConversationId?: string | null) {
  if (!current) {
    return false;
  }

  const currentConversationId = current.conversationId || null;
  if (sendTarget.conversationId) {
    return currentConversationId === sendTarget.conversationId;
  }

  if (nextConversationId && currentConversationId === nextConversationId) {
    return true;
  }

  return currentConversationId === sendTarget.initialConversationId && current.listing.id === sendTarget.listingId;
}

function ChatBackButton() {
  return (
    <BackButton
      fallbackHref="/dashboard/chats"
      ariaLabel="Back to chat list"
      className="inline-flex shrink-0 items-center justify-center rounded-[8px] border border-white/20 bg-white/10 px-2.5 py-1.5 text-[12.5px] font-medium text-white shadow-[0_14px_28px_rgba(31,47,82,0.12)] transition hover:bg-white/15 sm:px-3 sm:py-2 sm:text-[13px] md:px-3 md:py-2 md:text-[14px]"
    >
      <span>Back</span>
    </BackButton>
  );
}

function getAvatarAlt(name?: string | null, fallback = "Broker") {
  return `${name?.trim() || fallback} profile photo`;
}

function getConversationGroupForListing(listingId: string | null | undefined, groups?: ChatConversationSummary[] | null) {
  if (!listingId || !groups?.length) {
    return null;
  }

  return groups.find((group) => group.listing.id === listingId) || null;
}

function getConversationEntryById(groups: ChatConversationSummary[] | null | undefined, conversationId: string | null | undefined) {
  if (!conversationId || !groups?.length) {
    return null;
  }

  for (const group of groups) {
    const conversation = group.conversations.find((thread) => thread.conversationId === conversationId);
    if (conversation) {
      return { group, conversation };
    }
  }

  return null;
}

function getFirstConversationEntry(groups: ChatConversationSummary[] | null | undefined) {
  if (!groups?.length) {
    return null;
  }

  for (const group of groups) {
    const [conversation] = group.conversations;
    if (conversation) {
      return { group, conversation };
    }
  }

  return null;
}

function flattenSidebarThreads(groups: ChatConversationSummary[]) {
  return groups.flatMap((group) =>
    group.conversations.map((conversation) => ({
      ...conversation,
      listing: group.listing,
    }))
  );
}

function getMessagePaginationCursor(message: ChatRenderableMessage | ChatMessage | null | undefined): ChatMessagePaginationCursor | null {
  if (!message?.id) {
    return null;
  }

  return {
    sequence: typeof message.message_sequence === "number" && Number.isFinite(message.message_sequence) ? message.message_sequence : null,
    createdAt: message.created_at,
    id: message.id,
  };
}

function buildChatFromConversationSummary(
  group: ChatConversationSummary,
  conversation: ChatConversationSummary["conversations"][number]
): ChatResponse {
  const isAvailable = !group.listing.deleted_at;
  const isActive = isActiveListingStatus(group.listing.status);
  const messages = conversation.messages?.length
    ? conversation.messages
    : conversation.lastMessage
      ? [conversation.lastMessage]
      : [];
  const sortedMessages = sortChatMessages(messages);
  const messageCount = Math.max(conversation.messageCount || 0, sortedMessages.length);
  const messagesHasMore = messageCount > sortedMessages.length;

  return {
    conversationId: conversation.conversationId,
    listing: {
      id: group.listing.id,
      title: group.listing.title,
      status: group.listing.status,
      is_visible: group.listing.is_visible,
      canPost: isAvailable && group.listing.is_visible && isActive,
      isOwner: !!group.listing.isOwner,
      isActive,
      isAvailable,
    },
    participant: conversation.participant,
    messages: sortedMessages,
    messagesHasMore,
    messagesNextCursor: messagesHasMore ? getMessagePaginationCursor(sortedMessages[0]) : null,
  };
}

function normalizeChatResponse(chatPayload: ChatResponse | null) {
  return chatPayload
    ? {
        ...chatPayload,
        messages: sortChatMessages(chatPayload.messages || []),
      }
    : null;
}

type BrokerChatMemory = {
  viewerUserId: string | null;
  sessionResetEpoch: number;
  conversationGroups: ChatConversationSummary[] | null;
  conversationTabCounts: ConversationTabCounts | null;
  chatsByConversationId: Map<string, ChatResponse>;
  chatsByListingId: Map<string, ChatResponse>;
  listingDetailsById: Map<string, Listing>;
  requirementsById: Map<string, Requirement>;
  scrollTopByConversationId: Map<string, number>;
  sidebarScrollTop: number;
  mobileSidebarScrollTop: number;
  lastVisibleChat: ChatResponse | null;
};

const brokerChatMemory: BrokerChatMemory = {
  viewerUserId: null,
  sessionResetEpoch: getClientSessionResetEpoch(),
  conversationGroups: null,
  conversationTabCounts: null,
  chatsByConversationId: new Map(),
  chatsByListingId: new Map(),
  listingDetailsById: new Map(),
  requirementsById: new Map(),
  scrollTopByConversationId: new Map(),
  sidebarScrollTop: 0,
  mobileSidebarScrollTop: 0,
  lastVisibleChat: null,
};

function clearBrokerChatMemory() {
  brokerChatMemory.viewerUserId = null;
  brokerChatMemory.sessionResetEpoch = getClientSessionResetEpoch();
  brokerChatMemory.conversationGroups = null;
  brokerChatMemory.conversationTabCounts = null;
  brokerChatMemory.chatsByConversationId.clear();
  brokerChatMemory.chatsByListingId.clear();
  brokerChatMemory.listingDetailsById.clear();
  brokerChatMemory.requirementsById.clear();
  brokerChatMemory.scrollTopByConversationId.clear();
  brokerChatMemory.sidebarScrollTop = 0;
  brokerChatMemory.mobileSidebarScrollTop = 0;
  brokerChatMemory.lastVisibleChat = null;
}

function getChatOutboxStorageKey(viewerUserId: string | null) {
  return viewerUserId ? `${CHAT_OUTBOX_STORAGE_PREFIX}${viewerUserId}` : null;
}

function readChatOutboxMessages(viewerUserId: string | null): ChatRenderableMessage[] {
  const key = getChatOutboxStorageKey(viewerUserId);
  if (!key || typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? (parsed as ChatRenderableMessage[]).filter((message) => message.deliveryState) : [];
  } catch {
    return [];
  }
}

function writeChatOutboxMessages(viewerUserId: string | null, messages: ChatRenderableMessage[]) {
  const key = getChatOutboxStorageKey(viewerUserId);
  if (!key || typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(key, JSON.stringify(sortChatMessages(messages).slice(-50)));
  } catch {
    // Storage is a best-effort retry safety net.
  }
}

function rememberChatOutboxMessage(viewerUserId: string | null, message: ChatRenderableMessage) {
  if (!viewerUserId || !message.deliveryState) {
    return;
  }

  const messages = readChatOutboxMessages(viewerUserId);
  writeChatOutboxMessages(viewerUserId, mergeChatMessagesWithIncoming(messages, message, message.clientTempId || message.id));
}

function forgetChatOutboxMessage(viewerUserId: string | null, message: Pick<ChatRenderableMessage, "id" | "client_message_id" | "clientTempId">) {
  const messages = readChatOutboxMessages(viewerUserId);
  if (!messages.length) {
    return;
  }

  const messageClientId = getMessageClientId(message);
  writeChatOutboxMessages(
    viewerUserId,
    messages.filter((entry) => {
      const entryClientId = getMessageClientId(entry);
      return entry.id !== message.id && entry.clientTempId !== message.clientTempId && (!messageClientId || entryClientId !== messageClientId);
    })
  );
}

function mergeChatOutboxMessages(chatPayload: ChatResponse | null, viewerUserId: string | null) {
  if (!chatPayload || !viewerUserId) {
    return chatPayload;
  }

  const outboxMessages = readChatOutboxMessages(viewerUserId).filter((message) => {
    const conversationId = getMessageConversationId(message);
    return (
      (chatPayload.conversationId && conversationId === chatPayload.conversationId) ||
      (!conversationId && message.listing_id === chatPayload.listing.id)
    );
  });

  if (!outboxMessages.length) {
    return chatPayload;
  }

  return {
    ...chatPayload,
    messages: sortChatMessages([...chatPayload.messages, ...outboxMessages]),
  };
}

function canReadBrokerChatMemory(viewerUserId: string | null) {
  const currentSessionResetEpoch = getClientSessionResetEpoch();
  return Boolean(
    viewerUserId &&
      brokerChatMemory.sessionResetEpoch === currentSessionResetEpoch &&
      (!brokerChatMemory.viewerUserId || brokerChatMemory.viewerUserId === viewerUserId)
  );
}

function rememberBrokerChatViewer(viewerUserId: string | null) {
  const currentSessionResetEpoch = getClientSessionResetEpoch();
  if (brokerChatMemory.sessionResetEpoch !== currentSessionResetEpoch) {
    clearBrokerChatMemory();
  }

  if (!viewerUserId) {
    clearBrokerChatMemory();
    return;
  }

  if (brokerChatMemory.viewerUserId && brokerChatMemory.viewerUserId !== viewerUserId) {
    clearBrokerChatMemory();
  }

  brokerChatMemory.sessionResetEpoch = currentSessionResetEpoch;
  brokerChatMemory.viewerUserId = viewerUserId;
}

function hasThreadMessageCache(thread: ChatConversationSummary["conversations"][number] | null | undefined) {
  return Array.isArray(thread?.messages);
}

function rememberBrokerChatPayload(chatPayload: ChatResponse | null | undefined, options: { visible?: boolean } = {}) {
  const normalizedChatPayload = normalizeChatResponse(chatPayload || null);
  if (!normalizedChatPayload) {
    return;
  }

  if (options.visible !== false) {
    brokerChatMemory.lastVisibleChat = normalizedChatPayload;
  }

  if (normalizedChatPayload.conversationId) {
    brokerChatMemory.chatsByConversationId.set(normalizedChatPayload.conversationId, normalizedChatPayload);
  }

  if (normalizedChatPayload.listing.id) {
    brokerChatMemory.chatsByListingId.set(normalizedChatPayload.listing.id, normalizedChatPayload);
  }
}

function rememberBrokerConversationGroups(groups: ChatConversationSummary[], counts?: ConversationTabCounts | null, filter: ThreadFilterId = "recent") {
  const normalizedGroups = sortConversationGroups(groups);
  brokerChatMemory.conversationGroups = normalizedGroups;
  if (counts) {
    brokerChatMemory.conversationTabCounts = counts;
  }
  syncConversationGroupsCache(normalizedGroups, counts || brokerChatMemory.conversationTabCounts, filter);
  syncBrokerDashboardChatsCache(normalizedGroups);

  normalizedGroups.forEach((group) => {
    group.conversations.forEach((conversation) => {
      if (hasThreadMessageCache(conversation)) {
        rememberBrokerChatPayload(buildChatFromConversationSummary(group, conversation), { visible: false });
      }
    });
  });
}

function rememberBrokerListingDetail(listing: Listing | null | undefined) {
  if (listing?.id) {
    brokerChatMemory.listingDetailsById.set(listing.id, listing);
  }
}

function rememberBrokerRequirement(requirement: Requirement | null | undefined) {
  if (requirement?.id) {
    brokerChatMemory.requirementsById.set(requirement.id, requirement);
  }
}

function getBrokerChatMemoryForConversation(conversationId: string | null | undefined) {
  return conversationId ? brokerChatMemory.chatsByConversationId.get(conversationId) || null : null;
}

function getBrokerChatMemoryForPath(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  const conversationMatch = path.match(/^\/api\/chat\/conversations\/([^/?#]+)/);
  if (conversationMatch?.[1]) {
    return getBrokerChatMemoryForConversation(conversationMatch[1]);
  }

  const listingMatch = path.match(/^\/api\/chat\/([^/?#]+)/);
  if (listingMatch?.[1]) {
    return brokerChatMemory.chatsByListingId.get(listingMatch[1]) || null;
  }

  return null;
}

function getRequirementLabel(requirement: Pick<Requirement, "title" | "area"> | null | undefined) {
  if (!requirement) return "Buyer requirement";
  return requirement.title || (requirement.area ? `Requirement in ${requirement.area}` : "Buyer requirement");
}

function getRequirementBudgetLabel(requirement: Pick<Requirement, "budget_min" | "budget_max">) {
  if (requirement.budget_min !== null && requirement.budget_min !== undefined && requirement.budget_max !== null && requirement.budget_max !== undefined) {
    return `${formatCurrency(requirement.budget_min)} - ${formatCurrency(requirement.budget_max)}`;
  }

  if (requirement.budget_max !== null && requirement.budget_max !== undefined) {
    return `Up to ${formatCurrency(requirement.budget_max)}`;
  }

  if (requirement.budget_min !== null && requirement.budget_min !== undefined) {
    return `From ${formatCurrency(requirement.budget_min)}`;
  }

  return "Budget on request";
}

function getRequirementBedroomsLabel(value: string | null | undefined) {
  if (!value) return null;
  const normalizedValue = value.replace(/_/g, " ").trim();
  return normalizedValue ? normalizedValue.replace(/\b\w/g, (letter) => letter.toUpperCase()) : null;
}

function isRequirementMatchThread(thread: Pick<SidebarThread, "contextType" | "requirement" | "requirementMatch"> | null | undefined) {
  return Boolean(thread?.contextType === "requirement_match" || thread?.requirement || thread?.requirementMatch);
}

function getChatTypeLabel(thread: Pick<SidebarThread, "contextType" | "requirement" | "requirementMatch"> | null | undefined, variant: "full" | "short" = "full") {
  if (!isRequirementMatchThread(thread)) return null;
  return variant === "short" ? "RM" : "Requirement Match";
}

function getValidBrokerId(value: string | null | undefined) {
  const normalizedValue = value?.trim();
  if (!normalizedValue || normalizedValue === "null" || normalizedValue === "undefined") return null;
  return normalizedValue;
}

function hasConversationActivity(thread: ChatConversationSummary["conversations"][number]) {
  return thread.messageCount > 0 || Boolean(thread.lastMessage) || Boolean(thread.messages?.length);
}

function filterConversationGroupsForTab(groups: ChatConversationSummary[], filter: ThreadFilterId) {
  if (filter === "all") {
    return groups;
  }

  const filteredGroups = groups.flatMap((group) => {
    const conversations = group.conversations.filter((thread) =>
      filter === "unread" ? getThreadUnreadCount(thread) > 0 : hasConversationActivity(thread)
    );

    return conversations.length ? [{ ...group, conversations }] : [];
  });

  return sortConversationGroups(filteredGroups);
}

function getUniqueBrokerChatCountForListing(group: ChatConversationSummary | null | undefined, ownerUserId?: string | null) {
  const brokerIds = new Set<string>();
  const ownerId = getValidBrokerId(ownerUserId);

  group?.conversations.forEach((thread) => {
    if (!hasConversationActivity(thread)) return;

    const participantId = getValidBrokerId(thread.participant?.id);
    if (participantId && participantId !== ownerId) {
      brokerIds.add(participantId);
      return;
    }

    thread.messages?.forEach((message) => {
      const senderId = getValidBrokerId(message.sender_id);
      if (senderId && senderId !== ownerId) {
        brokerIds.add(senderId);
      }
    });
  });

  return brokerIds.size;
}

function formatRelativeTime(value: string | null | undefined) {
  if (!value) return "Just now";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Just now";

  const diff = timestamp - Date.now();
  const absolute = Math.abs(diff);
  if (absolute < 45_000) return "Just now";

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 365 * DAY_IN_MS],
    ["month", 30 * DAY_IN_MS],
    ["week", 7 * DAY_IN_MS],
    ["day", DAY_IN_MS],
    ["hour", 60 * 60 * 1000],
    ["minute", 60 * 1000],
  ];

  for (const [unit, size] of units) {
    if (absolute >= size || unit === "minute") {
      const rounded = Math.round(diff / size);
      return relativeTimeFormatter.format(rounded === 0 ? -1 : rounded, unit);
    }
  }

  return "Just now";
}

function formatThreadTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (now.toDateString() === date.toDateString()) return clockFormatter.format(date);
  if (diff < 7 * DAY_IN_MS) return weekdayFormatter.format(date);
  return shortDateFormatter.format(date);
}

function formatClockTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : clockFormatter.format(date);
}

type ConversationSidebarContentProps = {
  activeConversationId: string | null;
  filteredSidebarThreads: SidebarThread[];
  isLoadingMore?: boolean;
  onSelectConversation: (conversationId: string) => void;
  onSidebarQueryChange: (value: string) => void;
  onSidebarScroll?: (event: UIEvent<HTMLDivElement>) => void;
  onScrollContainerChange?: (element: HTMLDivElement | null) => void;
  onThreadFilterChange: (filter: ThreadFilterId) => void;
  sidebarEmptyLabel: string;
  sidebarQuery: string;
  tabCounts: ConversationTabCounts;
  threadFilter: ThreadFilterId;
  className?: string;
};

function ConversationSidebarContent({
  activeConversationId,
  filteredSidebarThreads,
  isLoadingMore = false,
  onSelectConversation,
  onSidebarQueryChange,
  onSidebarScroll,
  onScrollContainerChange,
  onThreadFilterChange,
  sidebarEmptyLabel,
  sidebarQuery,
  tabCounts,
  threadFilter,
  className,
}: ConversationSidebarContentProps) {
  const displayedConversationCount = sidebarQuery.trim().length
    ? filteredSidebarThreads.length
    : getConversationTabCount(tabCounts, threadFilter);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden bg-[#fafbfe]", className)}>
      <div className="border-b border-[#e7edf5] px-4 py-4">
        <div className="relative">
          <SearchRounded className="pointer-events-none absolute left-3 top-1/2 !h-[18px] !w-[18px] -translate-y-1/2 text-[#8b96ab]" />
          <input
            type="search"
            value={sidebarQuery}
            onChange={(event) => onSidebarQueryChange(event.target.value)}
            placeholder="Search..."
            className="h-11 w-full rounded-[14px] border border-[#dfe5ef] bg-white pl-10 pr-4 text-[14px] text-[#1f2940] outline-none transition placeholder:text-[#9aa3b6] focus:border-[#cbb05c] focus:shadow-[0_0_0_4px_rgba(212,175,55,0.14)]"
          />
        </div>

        <div className="mt-4 flex items-center gap-1 rounded-[13px] bg-[#f2f5fa] p-1">
          {THREAD_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => onThreadFilterChange(filter.id)}
              className={cn(
                "flex-1 rounded-[10px] px-3 py-2 text-[13px] font-medium transition",
                threadFilter === filter.id ? "bg-white text-[#1f2940] shadow-[0_8px_18px_rgba(31,47,82,0.08)]" : "text-[#7b879d] hover:text-[#25314c]"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={onScrollContainerChange} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" onScroll={onSidebarScroll}>
        <p className="px-1 pb-3 pt-2 pl-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d97ab]">
          {displayedConversationCount} conversation{displayedConversationCount === 1 ? "" : "s"}
        </p>

        <div>
          {filteredSidebarThreads.length ? (
            filteredSidebarThreads.map((conversation) => {
              const participantName = getDisplayName(conversation.participant?.first_name, conversation.participant?.last_name);
              const isActive = conversation.conversationId === activeConversationId;
              const chatTypeLabel = getChatTypeLabel(conversation, "short");
              const isRequirementMatch = Boolean(chatTypeLabel);
              const unreadCount = getThreadUnreadCount(conversation);

              return (
                <button
                  key={conversation.conversationId}
                  type="button"
                  onClick={() => onSelectConversation(conversation.conversationId)}
                  className={cn(
                    "w-full border px-3 py-3 text-left transition",
                    isActive
                      ? "border-[#d7e0ef] bg-[linear-gradient(135deg,#eef3ff_0%,#e9effc_100%)] shadow-[0_12px_28px_rgba(31,47,82,0.08)]"
                      : "border-transparent bg-transparent hover:border-[#e3e9f3] hover:bg-white"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <BrokerAvatar
                        src={conversation.participant?.profile_photo}
                        alt={getAvatarAlt(participantName)}
                        className="h-12 w-12 border border-white bg-[#edf2fa] shadow-[0_8px_18px_rgba(31,47,82,0.08)]"
                      />
                      {/* <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#55b782]" /> */}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p className="min-w-0 truncate text-[15px] font-semibold tracking-[-0.02em] text-[#1f2940]">{participantName}</p>
                          {unreadCount > 0 ? (
                            <>
                              <span className="h-2 w-2 shrink-0 rounded-full bg-[#d4a24a]" aria-hidden="true" />
                              <span className="inline-flex min-w-[1.15rem] shrink-0 items-center justify-center rounded-full bg-[#d4a24a] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </span>
                            </>
                          ) : null}
                          {chatTypeLabel ? (
                            <span
                              className={cn(
                                "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]",
                                isRequirementMatch
                                  ? "border-[#ead39a] bg-[#fff7e3] text-[#a97718]"
                                  : "border-[#d7e0ef] bg-[#eef3ff] text-[#173972]"
                              )}
                            >
                              {chatTypeLabel}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2 pt-0.5">
                          <span className="text-[12px] font-medium text-[#7f8aa1]">{formatThreadTime(conversation.lastActivityAt)}</span>
                        </div>
                      </div>
                      <p className="mt-1 truncate text-[13px] text-[#5b677f]">{conversation.participant?.email || "Email unavailable"}</p>
                      <p className={cn("mt-1 truncate text-[12px]", conversation.hasUnread ? "font-medium text-[#272c35]" : "text-[#97a1b5]")}>
                        {getMessagePreview(conversation.lastMessage)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          ) : isLoadingMore ? null : (
            <div className="rounded-[18px] border border-dashed border-[#dbe2ec] bg-white px-4 py-10 text-center text-[13px] leading-6 text-[#7f8aa1]">
              {sidebarEmptyLabel}
            </div>
          )}
        </div>
        {isLoadingMore ? (
          <div className="px-4 py-3 text-center text-[12px] font-medium text-[#7f8aa1]">Loading more...</div>
        ) : null}
      </div>
    </div>
  );
}

type ListingDetailsPanelProps = {
  brokerCallHref: string | null;
  brokerWhatsappHref: string | null;
  listingBedsLabel: string | null;
  listingDealTypeLabel: string;
  listingDetailLoading: boolean;
  listingImage: ReturnType<typeof getListingImage>;
  listingLocationLabel: string;
  listingPriceLabel: string;
  listingPropertyTypeLabel: string | null;
  listingSqftLabel: string | null;
  listingTitle: string;
  signalItems: ChatSignalItem[];
  className?: string;
  emptyImageLabel?: string;
  contextSections?: ContextDetailSection[];
};

function ListingDetailsPanel({
  brokerCallHref,
  brokerWhatsappHref,
  emptyImageLabel = "No property image available",
  listingBedsLabel,
  listingDealTypeLabel,
  listingDetailLoading,
  listingImage,
  listingLocationLabel,
  listingPriceLabel,
  listingPropertyTypeLabel,
  listingSqftLabel,
  listingTitle,
  signalItems,
  className,
  contextSections = [],
}: ListingDetailsPanelProps) {
  return (
    <div className={cn("h-full min-h-0 overflow-y-auto bg-[#fbfcfe] overscroll-contain", className)}>
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.78),transparent_32%),linear-gradient(135deg,#e7edf5_0%,#dce4ee_100%)]">
        {listingImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listingImage.public_url} alt={listingTitle} className="aspect-[1.55] w-full object-cover" />
        ) : (
          <div className="flex aspect-[1.55] items-center justify-center px-6 text-center text-sm text-[#7f8aa1]">
            {listingDetailLoading ? "Loading details..." : emptyImageLabel}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="min-w-0">
          <p className="truncate text-[1.25rem] font-bold text-[#102b61]">{listingTitle}</p>

          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-[1.02rem] font-semibold tracking-[-0.02em] text-[#24314c]">{listingPriceLabel}</p>

            <span className="inline-flex shrink-0 items-center rounded-full bg-[#f4ead4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9d6c13]">
              {listingDealTypeLabel}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3">
            <PlaceRounded className="mt-0.5 !h-4 !w-4 shrink-0 text-[#7c87a0]" />
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-[#24314c]">{listingLocationLabel || "Location pending"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <HomeWorkOutlined className="mt-0.5 !h-4 !w-4 shrink-0 text-[#7c87a0]" />
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-[#24314c]">{listingPropertyTypeLabel || "Property type pending"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <StraightenRounded className="mt-0.5 !h-4 !w-4 shrink-0 text-[#7c87a0]" />
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-[#24314c]">{listingSqftLabel || "Area pending"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <BedRounded className="mt-0.5 !h-4 !w-4 shrink-0 text-[#7c87a0]" />
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-[#24314c]">{listingBedsLabel || "Bedrooms pending"}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-2">
          <a
            href={brokerCallHref || undefined}
            aria-disabled={!brokerCallHref}
            className={cn(
              "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-[14px] font-semibold transition",
              brokerCallHref
                ? "bg-[linear-gradient(135deg,#173972_0%,#0F2A5F_58%,#0C214B_100%)] text-white shadow-[0_14px_28px_rgba(15,42,95,0.18)] hover:-translate-y-0.5"
                : "cursor-not-allowed border border-[#e0e6f0] bg-[#f4f6fa] text-[#9aa3b6]"
            )}
          >
            <CallRounded className="!h-[18px] !w-[18px]" />
            Call Broker
          </a>

          <a
            href={brokerWhatsappHref || undefined}
            target={brokerWhatsappHref ? "_blank" : undefined}
            rel={brokerWhatsappHref ? "noreferrer" : undefined}
            aria-disabled={!brokerWhatsappHref}
            className={cn(
              "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-[14px] font-semibold transition",
              brokerWhatsappHref
                ? "border border-[#d3ab44] bg-[linear-gradient(135deg,#E7BE57_0%,#D5A83A_54%,#BF8D1D_100%)] text-white shadow-[0_14px_28px_rgba(191,141,29,0.18)] hover:-translate-y-0.5"
                : "cursor-not-allowed border border-[#e0e6f0] bg-[#f4f6fa] text-[#9aa3b6]"
            )}
          >
            <WhatsApp className="!h-[18px] !w-[18px]" />
            WhatsApp
          </a>
        </div>

        {contextSections.length ? (
          <div className="mt-5 space-y-5 border-t border-[#e7edf5] pt-4">
            {contextSections.map((section) => (
              <section key={section.title}>
                <h4 className="text-[0.9rem] font-semibold tracking-[-0.02em] text-[#2a3550]">{section.title}</h4>
                {section.subtitle ? <p className="mt-1 break-words text-[13px] leading-5 text-[#6b7690]">{section.subtitle}</p> : null}
                {section.items.length ? (
                  <div className="mt-3 space-y-2.5">
                    {section.items.map((item, index) => (
                      <div key={`${section.title}-${index}`} className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0 text-[#7c87a0]">{item.icon}</span>
                        <p className="min-w-0 break-words text-[14px] font-medium text-[#24314c]">{item.value || "Not available"}</p>
                      </div>
                    ))}
                  </div>
                ) : section.emptyText ? (
                  <p className="mt-3 text-[13px] leading-6 text-[#7f8aa1]">{section.emptyText}</p>
                ) : null}
              </section>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-6 px-4 pb-4">
        <h4 className="text-[0.98rem] font-semibold tracking-[-0.02em] text-[#2a3550]">Deal Signals</h4>
        <div className="mt-3 space-y-2.5">
          {signalItems.map((signal) => (
            <div key={signal.label} className="flex items-start gap-3 text-[14px] text-[#4f5d79]">
              <span className={cn("mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full", signal.tone)}>{signal.icon}</span>
              <p className="leading-6">{signal.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListingChatLoadingShell() {
  return (
    <AppShell
      hidePageHeader
      mainClassName="flex h-[calc(100dvh-5.2rem)] flex-col !max-w-[1520px] !px-0 !pb-0 !pt-0 lg:!px-8 xl:!px-10"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="w-full bg-[url('/assets/header_background.png')] bg-cover bg-top bg-no-repeat shadow-[0_14px_28px_rgba(31,47,82,0.06)]">
          <div className="mx-auto flex w-full max-w-[1540px] flex-nowrap items-center justify-between gap-3 px-4 py-2 sm:gap-4 sm:px-6 lg:px-8 xl:px-10 2xl:max-w-none">
            <div className="flex min-w-0 items-center gap-3">
              <ChatBackButton />
              <h1 className="min-w-0 truncate pr-2 font-heading text-[1.45rem] font-semibold tracking-[-0.045em] text-brand-white sm:text-[1.7rem]">
                Chats
              </h1>
            </div>
            <Link
              href="/post-listing"
              className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[8px] bg-[linear-gradient(135deg,#E7BE57_0%,#D5A83A_54%,#BF8D1D_100%)] px-2.5 py-1.5 text-[12.5px] font-medium text-white shadow-[0_14px_28px_rgba(191,141,29,0.2)] sm:px-3 sm:py-2 sm:text-[13px] md:px-3 md:py-2 md:text-[14px]"
            >
              + Add New Listing
            </Link>
          </div>
        </div>

        <section className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border border-[#dbe3ee] bg-white shadow-[0_22px_58px_rgba(31,47,82,0.1)]">
            <div className="flex h-full min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] lg:grid lg:grid-cols-[18.85rem_minmax(0,1fr)] lg:grid-rows-none">
              <aside className="hidden min-h-0 flex-col overflow-hidden lg:flex lg:border-r lg:border-[#e7edf5]">
                <div className="border-b border-[#e7edf5] px-4 py-4">
                  <SkeletonBlock className="h-11 w-full rounded-[14px]" />
                  <div className="mt-4 flex gap-1 rounded-[13px] bg-[#f2f5fa] p-1">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <SkeletonBlock key={`chat-filter-${index}`} className="h-9 flex-1 rounded-[10px]" />
                    ))}
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`chat-thread-${index}`} className="rounded-[16px] border border-[#e3e9f3] bg-white px-3 py-3">
                      <div className="flex items-start gap-3">
                        <SkeletonBlock className="h-12 w-12 rounded-full" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <SkeletonBlock className="h-4 w-24 rounded-xl" />
                            <SkeletonBlock className="h-3 w-10 rounded-xl" />
                          </div>
                          <SkeletonBlock className="mt-2 h-3 w-32 rounded-xl" />
                          <SkeletonBlock className="mt-2 h-3 w-full rounded-xl" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="border-b border-[#e7edf5] bg-white px-4 py-4 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                      <SkeletonBlock className="h-12 w-12 rounded-full sm:h-14 sm:w-14" />
                      <div className="min-w-0 flex-1">
                        <SkeletonBlock className="h-5 w-full max-w-[9rem] rounded-xl" />
                        <SkeletonBlock className="mt-2 h-4 w-full max-w-[12rem] rounded-xl" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <SkeletonBlock className="h-10 w-10 rounded-full" />
                      <SkeletonBlock className="h-10 w-10 rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:grid xl:grid-cols-[minmax(0,1fr)_19rem]">
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <div className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),linear-gradient(180deg,#fbfcff_0%,#f6f8fc_100%)]">
                      <div className="h-full min-h-0 space-y-4 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={`chat-bubble-${index}`} className={cn("flex", index % 2 === 0 ? "justify-start" : "justify-end")}>
                            <div className={cn("max-w-[78%] space-y-2", index % 2 === 0 ? "items-start" : "items-end")}>
                              <SkeletonBlock className={cn("h-4 rounded-xl", index % 2 === 0 ? "w-20" : "ml-auto w-12")} />
                              <SkeletonBlock className={cn("h-16 max-w-full rounded-[18px]", index % 2 === 0 ? "w-48 sm:w-64" : "ml-auto w-44 sm:w-56")} />
                              <SkeletonBlock className={cn("h-3 rounded-xl", index % 2 === 0 ? "w-12" : "ml-auto w-10")} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-[#e7edf5] bg-white px-3 py-3 sm:px-4 md:px-5 lg:px-5">
                      <div className="flex items-center gap-3 rounded-[16px] border border-[#dbe3ee] bg-white px-3 py-2 shadow-[0_12px_24px_rgba(31,47,82,0.06)]">
                        <SkeletonBlock className="h-11 flex-1 rounded-[12px]" />
                        <SkeletonBlock className="h-11 w-11 rounded-full lg:w-24 lg:rounded-[12px]" />
                      </div>
                    </div>
                  </div>

                  <aside className="hidden min-h-0 overflow-hidden border-l border-[#e7edf5] bg-[#fbfcfe] xl:block">
                    <div className="space-y-4 p-4">
                      <SkeletonBlock className="aspect-[1.55] w-full rounded-[18px]" />
                      <SkeletonBlock className="h-6 w-3/4 rounded-xl" />
                      <SkeletonBlock className="h-5 w-1/2 rounded-xl" />
                      {Array.from({ length: 4 }).map((_, index) => (
                        <SkeletonBlock key={`chat-detail-${index}`} className="h-4 w-full rounded-xl" />
                      ))}
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default function ListingChatPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading conversation..." />}>
      <ListingChatPageContent />
    </Suspense>
  );
}

function ListingChatPageContent() {
  const autoScrollThreshold = 96;
  const params = useParams<{ listingId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { user, loading } = useAuth();
  const currentUserId = user?.platformUser?.id || user?.uid || null;
  const [message, setMessage] = useState("");
  const [isDocumentVisible, setIsDocumentVisible] = useState(() => isBrowserDocumentVisible());
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [threadFilter, setThreadFilter] = useState<ThreadFilterId>("recent");
  const [mobileThreadsOpen, setMobileThreadsOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [pendingRouteConversationId, setPendingRouteConversationId] = useState<string | null>(null);
  const deferredSidebarQuery = useDeferredValue(sidebarQuery);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const activeConversationRef = useRef<string | null>(null);
  const renderedConversationRef = useRef<string | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const shouldResumePinnedRef = useRef(true);
  const resumePinFrameRef = useRef<number | null>(null);
  const isNearBottom = useCallback((container: HTMLDivElement) => {
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= autoScrollThreshold;
  }, [autoScrollThreshold]);
  const pinMessagesToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, []);
  const clearResumePinFrame = useCallback(() => {
    if (resumePinFrameRef.current === null) return;
    window.cancelAnimationFrame(resumePinFrameRef.current);
    resumePinFrameRef.current = null;
  }, []);
  const scheduleResumePin = useCallback(() => {
    clearResumePinFrame();
    const run = (remainingFrames: number) => {
      resumePinFrameRef.current = window.requestAnimationFrame(() => {
        if (remainingFrames > 0) return run(remainingFrames - 1);
        pinMessagesToBottom();
        resumePinFrameRef.current = null;
      });
    };
    run(2);
  }, [clearResumePinFrame, pinMessagesToBottom]);

  const resolvedSearchParams = searchParams ?? new URLSearchParams();
  const draftListingId = resolvedSearchParams.get("listingId");
  const requirementId = resolvedSearchParams.get("requirementId");
  const matchId = resolvedSearchParams.get("matchId");
  const notificationId = resolvedSearchParams.get("notificationId");
  const isDraftChat = !!draftListingId;
  const routeConversationId = params?.listingId;
  const routePersistedConversationId = isDraftChat ? null : getPersistedConversationId(routeConversationId);
  const activeRouteConversationId = pendingRouteConversationId || routePersistedConversationId;
  const chatRequestPath = draftListingId
    ? getListingChatPath(draftListingId)
    : routePersistedConversationId
      ? getConversationChatPath(routePersistedConversationId)
      : null;
  const canUseBrokerMemory = canReadBrokerChatMemory(currentUserId);
  const initialSidebarScrollTop = canUseBrokerMemory ? brokerChatMemory.sidebarScrollTop : 0;
  const initialMobileSidebarScrollTop = canUseBrokerMemory ? brokerChatMemory.mobileSidebarScrollTop : 0;
  const cachedConversationGroupsPayload = getCachedApiPayload<ConversationsResponse>(getConversationsPagePath());
  const cachedConversationGroups = cachedConversationGroupsPayload?.groups || (canUseBrokerMemory ? brokerChatMemory.conversationGroups : null) || [];
  const cachedConversationTabCounts =
    getConversationTabCountsFromPayload(cachedConversationGroupsPayload) ||
    (canUseBrokerMemory ? brokerChatMemory.conversationTabCounts : null) ||
    EMPTY_CONVERSATION_TAB_COUNTS;
  const cachedConversationEntry = getConversationEntryById(cachedConversationGroups, activeRouteConversationId);
  const cachedSummaryChat = cachedConversationEntry && hasThreadMessageCache(cachedConversationEntry.conversation)
    ? buildChatFromConversationSummary(cachedConversationEntry.group, cachedConversationEntry.conversation)
    : null;
  const cachedDirectChat = getCachedApiPayload<ChatResponse>(chatRequestPath) || (canUseBrokerMemory ? getBrokerChatMemoryForPath(chatRequestPath) : null);
  const cachedChat = cachedDirectChat || cachedSummaryChat || null;
  const cachedRequirement =
    (requirementId ? getCachedApiPayload<RequirementDetailResponse>(`/api/requirements/${requirementId}`) : null) ||
    (canUseBrokerMemory && requirementId && brokerChatMemory.requirementsById.has(requirementId)
      ? { requirement: brokerChatMemory.requirementsById.get(requirementId) as Requirement }
      : null);
  const cachedListingDetailPath = cachedChat?.listing.id ? `/api/listings/${cachedChat.listing.id}` : draftListingId ? `/api/listings/${draftListingId}` : null;
  const cachedListingDetail = getCachedApiPayload<BrokerListingDetail>(cachedListingDetailPath);
  const cachedListingDetailFromMemory =
    (canUseBrokerMemory && cachedChat?.listing.id ? brokerChatMemory.listingDetailsById.get(cachedChat.listing.id) : null) ||
    (canUseBrokerMemory && draftListingId ? brokerChatMemory.listingDetailsById.get(draftListingId) : null) ||
    null;
  const cachedEntryHasRequirementContext = Boolean(
    cachedConversationEntry?.conversation.contextType === "requirement_match" ||
      cachedConversationEntry?.conversation.requirement ||
      cachedConversationEntry?.conversation.requirementMatch
  );
  const cachedLinkedRequirement =
    cachedEntryHasRequirementContext || isDraftChat
      ? cachedRequirement?.requirement || cachedConversationEntry?.conversation.requirement || null
      : null;
  const [chat, setChat] = useState<ChatResponse | null>(() => cachedChat);
  const [conversationGroups, setConversationGroups] = useState<ChatConversationSummary[]>(() => cachedConversationGroups);
  const [conversationTabCounts, setConversationTabCounts] = useState<ConversationTabCounts>(() => cachedConversationTabCounts);
  const [listingDetail, setListingDetail] = useState<Listing | null>(() => cachedListingDetail?.listing || cachedListingDetailFromMemory);
  const [listingDetailLoading, setListingDetailLoading] = useState(false);
  const [linkedRequirement, setLinkedRequirement] = useState<Requirement | null>(() => cachedLinkedRequirement);
  const [pageLoading, setPageLoading] = useState(() => !cachedChat);
  const [conversationHasMore, setConversationHasMore] = useState(() => cachedConversationGroupsPayload?.hasMore ?? true);
  const [conversationNextCursor, setConversationNextCursor] = useState<ChatConversationPaginationCursor | null>(
    () => cachedConversationGroupsPayload?.nextCursor || null
  );
  const [conversationLoadingMore, setConversationLoadingMore] = useState(false);
  const [olderMessagesLoading, setOlderMessagesLoading] = useState(false);
  const chatRef = useRef<ChatResponse | null>(cachedChat);
  const messageDraftRef = useRef(message);
  const sidebarScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileSidebarScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sidebarScrollTopRef = useRef(initialSidebarScrollTop);
  const mobileSidebarScrollTopRef = useRef(initialMobileSidebarScrollTop);
  const sidebarScrollRestoreFrameRef = useRef<number | null>(null);
  const sidebarScrollRestorePendingRef = useRef(false);
  const latestChatLoadRequestIdRef = useRef(0);
  const routeConversationIdRef = useRef(routeConversationId);
  const draftListingIdRef = useRef(draftListingId);
  const threadFilterRef = useRef<ThreadFilterId>(threadFilter);
  const optimisticMessageCounterRef = useRef(0);
  const activeSendIdsRef = useRef(new Set<string>());
  const sendQueueRef = useRef(new Map<string, Promise<void>>());
  const conversationHasMoreRef = useRef(conversationHasMore);
  const conversationNextCursorRef = useRef<ChatConversationPaginationCursor | null>(conversationNextCursor);
  const conversationLoadingMoreRef = useRef(false);
  const olderMessagesLoadingRef = useRef(false);
  const loadOlderMessagesRef = useRef<(() => Promise<void>) | null>(null);
  const conversationRefreshTimerRef = useRef<number | null>(null);
  const conversationSummaryRefreshesRef = useRef(new Map<string, Promise<ChatConversationSummary[]>>());
  const hasRealtimeSubscribedRef = useRef(false);
  const isDocumentVisibleRef = useRef(isDocumentVisible);
  const preservedContextQuery = useMemo(() => {
    const query = new URLSearchParams();
    if (requirementId) query.set("requirementId", requirementId);
    if (matchId) query.set("matchId", matchId);
    if (notificationId) query.set("notificationId", notificationId);
    return query.toString();
  }, [matchId, notificationId, requirementId]);

  const commitChatUpdate = useCallback((updater: (current: ChatResponse | null) => ChatResponse | null) => {
    const nextChat = mergeChatOutboxMessages(normalizeChatResponse(updater(chatRef.current)), currentUserId);
    chatRef.current = nextChat;
    rememberBrokerChatPayload(nextChat);
    setChat(nextChat);
    return nextChat;
  }, [currentUserId]);

  const updateConversationPagination = useCallback(
    ({
      hasMore,
      isLoadingMore,
      nextCursor,
    }: {
      hasMore?: boolean;
      isLoadingMore?: boolean;
      nextCursor?: ChatConversationPaginationCursor | null;
    }) => {
      if (hasMore !== undefined) {
        conversationHasMoreRef.current = hasMore;
        setConversationHasMore(hasMore);
      }

      if (nextCursor !== undefined) {
        conversationNextCursorRef.current = nextCursor;
        setConversationNextCursor(nextCursor);
      }

      if (isLoadingMore !== undefined) {
        conversationLoadingMoreRef.current = isLoadingMore;
        setConversationLoadingMore(isLoadingMore);
      }
    },
    []
  );

  const applySidebarScrollPosition = useCallback((container: HTMLDivElement | null, scrollTop: number) => {
    if (!container) {
      return;
    }

    container.scrollTop = Math.min(scrollTop, Math.max(container.scrollHeight - container.clientHeight, 0));
  }, []);

  const restoreSidebarScrollPosition = useCallback(() => {
    applySidebarScrollPosition(sidebarScrollContainerRef.current, sidebarScrollTopRef.current);
    applySidebarScrollPosition(mobileSidebarScrollContainerRef.current, mobileSidebarScrollTopRef.current);
  }, [applySidebarScrollPosition]);

  const clearSidebarScrollRestoreFrame = useCallback(() => {
    if (sidebarScrollRestoreFrameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(sidebarScrollRestoreFrameRef.current);
    sidebarScrollRestoreFrameRef.current = null;
  }, []);

  const scheduleSidebarScrollRestore = useCallback(() => {
    clearSidebarScrollRestoreFrame();
    sidebarScrollRestoreFrameRef.current = window.requestAnimationFrame(() => {
      restoreSidebarScrollPosition();
      sidebarScrollRestoreFrameRef.current = window.requestAnimationFrame(() => {
        restoreSidebarScrollPosition();
        sidebarScrollRestoreFrameRef.current = null;
      });
    });
  }, [clearSidebarScrollRestoreFrame, restoreSidebarScrollPosition]);

  const saveSidebarScrollPosition = useCallback(() => {
    if (sidebarScrollContainerRef.current) {
      sidebarScrollTopRef.current = sidebarScrollContainerRef.current.scrollTop;
      brokerChatMemory.sidebarScrollTop = sidebarScrollTopRef.current;
    }

    if (mobileSidebarScrollContainerRef.current) {
      mobileSidebarScrollTopRef.current = mobileSidebarScrollContainerRef.current.scrollTop;
      brokerChatMemory.mobileSidebarScrollTop = mobileSidebarScrollTopRef.current;
    }
  }, []);

  const rememberSidebarScrollFromContainer = useCallback((container: HTMLDivElement) => {
    if (container === mobileSidebarScrollContainerRef.current) {
      mobileSidebarScrollTopRef.current = container.scrollTop;
      brokerChatMemory.mobileSidebarScrollTop = container.scrollTop;
      return;
    }

    sidebarScrollTopRef.current = container.scrollTop;
    brokerChatMemory.sidebarScrollTop = container.scrollTop;
  }, []);

  const handleSidebarScrollContainerChange = useCallback(
    (element: HTMLDivElement | null) => {
      sidebarScrollContainerRef.current = element;
      if (element) {
        applySidebarScrollPosition(element, sidebarScrollTopRef.current);
      }
    },
    [applySidebarScrollPosition]
  );

  const handleMobileSidebarScrollContainerChange = useCallback(
    (element: HTMLDivElement | null) => {
      mobileSidebarScrollContainerRef.current = element;
      if (element) {
        applySidebarScrollPosition(element, mobileSidebarScrollTopRef.current);
      }
    },
    [applySidebarScrollPosition]
  );

  const storeConversationTabCounts = useCallback((counts: ConversationTabCounts) => {
    const normalizedCounts = patchConversationTabCountsValue(EMPTY_CONVERSATION_TAB_COUNTS, () => counts);
    conversationTabCountsRef.current = normalizedCounts;
    brokerChatMemory.conversationTabCounts = normalizedCounts;
    setConversationTabCounts(normalizedCounts);
    syncConversationGroupsCache(conversationGroupsRef.current, normalizedCounts, threadFilterRef.current);
    return normalizedCounts;
  }, []);

  const storeConversationTabCountsFromPayload = useCallback(
    (payload: Partial<ConversationsResponse> | null | undefined) => {
      const counts = getConversationTabCountsFromPayload(payload);
      return counts ? storeConversationTabCounts(counts) : null;
    },
    [storeConversationTabCounts]
  );

  const patchConversationTabCounts = useCallback(
    (updater: (current: ConversationTabCounts) => ConversationTabCounts) =>
      storeConversationTabCounts(patchConversationTabCountsValue(conversationTabCountsRef.current, updater)),
    [storeConversationTabCounts]
  );

  const setMessageDraft = useCallback((value: string) => {
    messageDraftRef.current = value;
    setMessage(value);
  }, []);

  const enqueueChatSend = useCallback((queueKey: string, task: () => Promise<void>) => {
    const previousSend = sendQueueRef.current.get(queueKey) || Promise.resolve();
    const queuedSend = previousSend.catch(() => undefined).then(task);

    sendQueueRef.current.set(queueKey, queuedSend);
    void queuedSend.finally(() => {
      if (sendQueueRef.current.get(queueKey) === queuedSend) {
        sendQueueRef.current.delete(queueKey);
      }
    });

    return queuedSend;
  }, []);

  const saveVisibleScrollPosition = useCallback(() => {
    const container = messagesContainerRef.current;
    const visibleConversationId = chatRef.current?.conversationId;
    if (!container || !visibleConversationId) {
      return;
    }

    brokerChatMemory.scrollTopByConversationId.set(visibleConversationId, container.scrollTop);
  }, []);

  const restoreVisibleScrollPosition = useCallback(
    (targetConversationId: string) => {
      const container = messagesContainerRef.current;
      if (!container) {
        return false;
      }

      const savedScrollTop = brokerChatMemory.scrollTopByConversationId.get(targetConversationId);
      if (savedScrollTop === undefined) {
        pinMessagesToBottom();
        return false;
      }

      container.scrollTop = Math.min(savedScrollTop, Math.max(container.scrollHeight - container.clientHeight, 0));
      return true;
    },
    [pinMessagesToBottom]
  );

  useEffect(() => {
    routeConversationIdRef.current = routeConversationId;
    draftListingIdRef.current = draftListingId;
    threadFilterRef.current = threadFilter;
    if (!isDraftChat) {
      activeConversationRef.current = activeRouteConversationId;
    }
  }, [activeRouteConversationId, draftListingId, isDraftChat, routeConversationId, threadFilter]);

  useEffect(() => {
    isDocumentVisibleRef.current = isDocumentVisible;
  }, [isDocumentVisible]);

  useEffect(() => {
    const syncDocumentVisibility = () => {
      const nextIsVisible = isBrowserDocumentVisible();
      isDocumentVisibleRef.current = nextIsVisible;
      setIsDocumentVisible(nextIsVisible);
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
    if (!pendingRouteConversationId) {
      return;
    }

    if (routePersistedConversationId === pendingRouteConversationId) {
      setPendingRouteConversationId(null);
    }
  }, [pendingRouteConversationId, routePersistedConversationId]);

  const mergeAndStoreConversationGroups = useCallback((incomingGroups: ChatConversationSummary[], counts?: ConversationTabCounts | null, options: { replace?: boolean; filter?: ThreadFilterId } = {}) => {
    if (counts) {
      storeConversationTabCounts(counts);
    }

    const filter = options.filter || threadFilterRef.current;
    const mergedGroups = filterConversationGroupsForTab(
      mergeConversationGroupsForRealtime({
        activeConversationId: isDocumentVisibleRef.current ? activeConversationRef.current || null : null,
        currentGroups: options.replace ? [] : conversationGroupsRef.current,
        incomingGroups,
        viewerUserId: currentUserIdRef.current,
      }),
      filter
    );
    conversationGroupsRef.current = mergedGroups;
    rememberBrokerConversationGroups(mergedGroups, counts || conversationTabCountsRef.current, filter);
    setConversationGroups(mergedGroups);
    return mergedGroups;
  }, [storeConversationTabCounts]);

  const refreshConversationGroups = useCallback(async (filter: ThreadFilterId = threadFilterRef.current, options: { replace?: boolean } = {}) => {
    const groupsPayload = await apiFetchCached<ConversationsResponse>(getConversationsPagePath(filter), {}, { force: true, ttlMs: CHAT_METADATA_TTL_MS });
    const counts = storeConversationTabCountsFromPayload(groupsPayload);
    const shouldPreserveLoadedPagination = !options.replace && flattenSidebarThreads(conversationGroupsRef.current).length > CHAT_CONVERSATION_PAGE_SIZE;
    updateConversationPagination({
      hasMore: shouldPreserveLoadedPagination ? conversationHasMoreRef.current : groupsPayload.hasMore ?? false,
      nextCursor: shouldPreserveLoadedPagination ? conversationNextCursorRef.current : groupsPayload.nextCursor || null,
    });
    return mergeAndStoreConversationGroups(groupsPayload.groups, counts, { replace: options.replace, filter });
  }, [mergeAndStoreConversationGroups, storeConversationTabCountsFromPayload, updateConversationPagination]);

  const scheduleConversationGroupsRefresh = useCallback(
    (filter: ThreadFilterId = threadFilterRef.current, options: { replace?: boolean } = {}) => {
      if (conversationRefreshTimerRef.current !== null) {
        window.clearTimeout(conversationRefreshTimerRef.current);
      }

      conversationRefreshTimerRef.current = window.setTimeout(() => {
        conversationRefreshTimerRef.current = null;
        void refreshConversationGroups(filter, options).catch(() => undefined);
      }, 250);
    },
    [refreshConversationGroups]
  );

  const refreshConversationSummary = useCallback(
    (conversationId: string) => {
      const summaryPath = getConversationSummaryPath(conversationId);
      if (!summaryPath) {
        return Promise.resolve([] as ChatConversationSummary[]);
      }

      const existingRefresh = conversationSummaryRefreshesRef.current.get(conversationId);
      if (existingRefresh) {
        return existingRefresh;
      }

      const refreshPromise = apiFetchCached<ConversationsResponse>(summaryPath, {}, { force: true, ttlMs: CHAT_METADATA_TTL_MS })
        .then((summaryPayload) => {
          const counts = storeConversationTabCountsFromPayload(summaryPayload);
          return mergeAndStoreConversationGroups(summaryPayload.groups, counts, { filter: threadFilterRef.current });
        })
        .finally(() => {
          conversationSummaryRefreshesRef.current.delete(conversationId);
        });

      conversationSummaryRefreshesRef.current.set(conversationId, refreshPromise);
      return refreshPromise;
    },
    [mergeAndStoreConversationGroups, storeConversationTabCountsFromPayload]
  );

  useEffect(
    () => () => {
      if (conversationRefreshTimerRef.current !== null) {
        window.clearTimeout(conversationRefreshTimerRef.current);
        conversationRefreshTimerRef.current = null;
      }
    },
    []
  );

  const loadMoreConversationGroups = useCallback(async () => {
    if (conversationLoadingMoreRef.current || !conversationHasMoreRef.current || !conversationNextCursorRef.current) {
      return;
    }

    updateConversationPagination({ isLoadingMore: true });

    try {
      const groupsPayload = await apiFetchCached<ConversationsResponse>(
        getConversationsPagePath(threadFilterRef.current, conversationNextCursorRef.current),
        {},
        { force: true, ttlMs: CHAT_METADATA_TTL_MS }
      );
      const counts = storeConversationTabCountsFromPayload(groupsPayload);
      mergeAndStoreConversationGroups(groupsPayload.groups, counts, { filter: threadFilterRef.current });
      updateConversationPagination({
        hasMore: groupsPayload.hasMore ?? false,
        nextCursor: groupsPayload.nextCursor || null,
      });
    } catch {
      return;
    } finally {
      updateConversationPagination({ isLoadingMore: false });
    }
  }, [mergeAndStoreConversationGroups, storeConversationTabCountsFromPayload, updateConversationPagination]);

  const loadChat = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    const requestId = ++latestChatLoadRequestIdRef.current;
    const requestedDraftListingId = draftListingId;
    const requestedIsDraftChat = !!requestedDraftListingId;
    const requestedConversationId = requestedIsDraftChat ? null : getPersistedConversationId(routeConversationId);
    let expectedConversationId = requestedConversationId;
    const requestedChatPath = requestedDraftListingId
      ? getListingChatPath(requestedDraftListingId)
      : requestedConversationId
        ? getConversationChatPath(requestedConversationId)
        : null;
    const isCurrentRequest = () =>
      requestId === latestChatLoadRequestIdRef.current &&
      draftListingIdRef.current === requestedDraftListingId &&
      (requestedIsDraftChat || getPersistedConversationId(routeConversationIdRef.current) === expectedConversationId);

    if (!force && canReadBrokerChatMemory(currentUserId)) {
      const cachedGroups = brokerChatMemory.conversationGroups;
      if (cachedGroups?.length) {
        mergeAndStoreConversationGroups(cachedGroups);
      }

      const cachedRequestedChat = getBrokerChatMemoryForPath(requestedChatPath) || getBrokerChatMemoryForConversation(requestedConversationId);
      if (cachedRequestedChat && isCurrentRequest()) {
        const currentChat = chatRef.current;
        const nextChat =
          !currentChat || currentChat.conversationId === cachedRequestedChat.conversationId
            ? mergeTransientChatPayloadMessages(cachedRequestedChat, currentChat)
            : cachedRequestedChat;

        commitChatUpdate(() => nextChat);
        setPageLoading(false);
      }
    }

    const [groupsPayload, draftChatPayload, requirementPayload] = await Promise.all([
      apiFetchCached<ConversationsResponse>(getConversationsPagePath(), {}, { force, ttlMs: CHAT_METADATA_TTL_MS }),
      requestedChatPath
        ? apiFetchCached<ChatResponse>(requestedChatPath, {}, { force, ttlMs: CHAT_PAYLOAD_TTL_MS })
            .catch((error) => {
              if (!requestedIsDraftChat && isConversationAccessError(error)) {
                return null;
              }

              throw error;
            })
        : Promise.resolve(null),
      requirementId
        ? apiFetchCached<RequirementDetailResponse>(`/api/requirements/${requirementId}`, {}, { ttlMs: CHAT_METADATA_TTL_MS }).catch(() => null)
        : Promise.resolve(null),
    ]);

    if (!isCurrentRequest()) {
      return null;
    }

    const counts = storeConversationTabCountsFromPayload(groupsPayload);
    const mergedGroups = mergeAndStoreConversationGroups(groupsPayload.groups, counts);
    updateConversationPagination({
      hasMore: groupsPayload.hasMore ?? false,
      nextCursor: groupsPayload.nextCursor || null,
    });

    let selectedEntry = requestedIsDraftChat
      ? getConversationEntryById(mergedGroups, draftChatPayload?.conversationId)
      : getConversationEntryById(mergedGroups, requestedConversationId);
    const directChatPayload = !requestedIsDraftChat ? draftChatPayload : null;

    if (!requestedIsDraftChat && !selectedEntry && !directChatPayload) {
      const fallbackEntry = getFirstConversationEntry(mergedGroups);
      if (fallbackEntry) {
        selectedEntry = fallbackEntry;
        const fallbackConversationId = fallbackEntry.conversation.conversationId;
        expectedConversationId = fallbackConversationId;
        const fallbackHref = `/dashboard/chats/${fallbackConversationId}${preservedContextQuery ? `?${preservedContextQuery}` : ""}`;
        routeConversationIdRef.current = fallbackConversationId;
        activeConversationRef.current = fallbackConversationId;
        setPendingRouteConversationId(fallbackConversationId);
        router.replace(fallbackHref, { scroll: false });
        if (isCurrentRequest()) {
          const fallbackChatPath = getConversationChatPath(fallbackConversationId);
          if (fallbackChatPath) {
            try {
              const fallbackDirectPayload = await apiFetchCached<ChatResponse>(fallbackChatPath, {}, { force, ttlMs: CHAT_PAYLOAD_TTL_MS });
              if (isCurrentRequest()) {
                const nextChat = mergeTransientChatPayloadMessages(fallbackDirectPayload, chatRef.current);
                activeConversationRef.current = nextChat.conversationId;
                commitChatUpdate(() => nextChat);
                rememberBrokerRequirement(fallbackEntry.conversation.requirement || null);
                setLinkedRequirement(fallbackEntry.conversation.requirement || null);
                return nextChat;
              }
            } catch {
              // Keep the summary fallback below if the direct payload cannot be fetched.
            }
          }
        }
      } else {
        if (!chatRef.current) {
          commitChatUpdate(() => null);
          setLinkedRequirement(null);
          setListingDetail(null);
        }
        setListingDetailLoading(false);
        return null;
      }
    }

    const summaryChatPayload = selectedEntry ? buildChatFromConversationSummary(selectedEntry.group, selectedEntry.conversation) : null;
    const fallbackChatPayload =
      draftChatPayload ||
      directChatPayload ||
      summaryChatPayload ||
      (requestedChatPath ? await apiFetchCached<ChatResponse>(requestedChatPath, {}, { force, ttlMs: CHAT_PAYLOAD_TTL_MS }) : null);

    if (!fallbackChatPayload || !isCurrentRequest()) {
      return null;
    }

    const currentChat = chatRef.current;
    const nextChat =
      !currentChat || currentChat.conversationId === fallbackChatPayload.conversationId
        ? mergeTransientChatPayloadMessages(fallbackChatPayload, currentChat)
        : {
            ...fallbackChatPayload,
            messages: sortChatMessages(fallbackChatPayload.messages),
          };
    activeConversationRef.current = nextChat.conversationId;
    commitChatUpdate(() => nextChat);
    const selectedThread = selectedEntry?.conversation || null;
    const selectedRequirement =
      selectedThread?.contextType === "requirement_match" || selectedThread?.requirement || selectedThread?.requirementMatch
        ? requirementPayload?.requirement || selectedThread.requirement || null
        : null;
    rememberBrokerRequirement(selectedRequirement);
    setLinkedRequirement(selectedRequirement);
    return nextChat;
  }, [
    commitChatUpdate,
    currentUserId,
    draftListingId,
    mergeAndStoreConversationGroups,
    preservedContextQuery,
    requirementId,
    routeConversationId,
    router,
    storeConversationTabCountsFromPayload,
    updateConversationPagination,
  ]);

  useEffect(() => {
    chatRef.current = chat;
    rememberBrokerChatPayload(chat);
  }, [chat]);

  useEffect(() => {
    let isActive = true;

    if (!loading && (!user || !canAccessBrokerWorkspace(user))) {
      router.replace(getDefaultRouteForUser(user));
      return () => {
        isActive = false;
      };
    }

    if (!loading && user && (routeConversationId || draftListingId)) {
      const requestGeneration = getSessionResourceGeneration();
      const isCurrentRequest = () => isActive && requestGeneration === getSessionResourceGeneration();

      loadChat()
        .catch((error) => {
          if (!isCurrentRequest()) {
            return;
          }

          enqueueSnackbar(error instanceof Error ? error.message : "Failed to load chat.", { variant: "error" });
        })
        .finally(() => {
          if (isCurrentRequest()) {
            setPageLoading(false);
          }
        });
    }

    return () => {
      isActive = false;
    };
  }, [draftListingId, enqueueSnackbar, loadChat, loading, routeConversationId, router, user]);

  const activeConversationEntry = useMemo(
    () => getConversationEntryById(conversationGroups, activeRouteConversationId || chat?.conversationId),
    [activeRouteConversationId, chat?.conversationId, conversationGroups]
  );
  const listingGroup = useMemo(
    () => {
      const canUseActiveConversationEntry = !activeRouteConversationId || !chat?.conversationId || chat.conversationId === activeRouteConversationId;
      return (
        (canUseActiveConversationEntry ? activeConversationEntry?.group : null) ||
        getConversationGroupForListing(chat?.listing.id || draftListingId, conversationGroups)
      );
    },
    [activeConversationEntry?.group, activeRouteConversationId, chat?.conversationId, chat?.listing.id, conversationGroups, draftListingId]
  );

  useEffect(() => {
    if (!chat?.listing.id) {
      setListingDetailLoading(false);
      return;
    }

    const listingPath = `/api/listings/${chat.listing.id}`;
    const cachedListing =
      getCachedApiPayload<BrokerListingDetail>(listingPath)?.listing ||
      (canReadBrokerChatMemory(currentUserId) ? brokerChatMemory.listingDetailsById.get(chat.listing.id) : null) ||
      null;
    const hasListingSummary = listingGroup?.listing.id === chat.listing.id;
    let active = true;

    if (cachedListing) {
      rememberBrokerListingDetail(cachedListing);
      setListingDetail(cachedListing);
      setListingDetailLoading(false);
    } else if (hasListingSummary) {
      setListingDetail(null);
      setListingDetailLoading(false);
    } else {
      setListingDetailLoading(true);
    }

    apiFetchCached<BrokerListingDetail>(listingPath, {}, { ttlMs: CHAT_METADATA_TTL_MS })
      .then((payload) => {
        rememberBrokerListingDetail(payload.listing);
        if (active) setListingDetail(payload.listing);
      })
      .catch(() => {
        if (active && !cachedListing && !hasListingSummary) setListingDetail(null);
      })
      .finally(() => {
        if (active) setListingDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [chat?.listing.id, currentUserId, listingGroup?.listing.id]);

  useEffect(() => {
    if (!isDraftChat || !chat?.conversationId) return;
    router.replace(`/dashboard/chats/${chat.conversationId}${preservedContextQuery ? `?${preservedContextQuery}` : ""}`, { scroll: false });
  }, [chat?.conversationId, isDraftChat, preservedContextQuery, router]);

  useEffect(() => {
    const captureScrollIntent = () => {
      const container = messagesContainerRef.current;
      if (!container) return;
      shouldResumePinnedRef.current = isNearBottom(container);
    };
    const pinIfNeeded = () => {
      if (!shouldResumePinnedRef.current) return;
      scheduleResumePin();
      shouldAutoScrollRef.current = true;
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") return captureScrollIntent();
      if (document.visibilityState === "visible") pinIfNeeded();
    };

    window.addEventListener("blur", captureScrollIntent);
    window.addEventListener("focus", pinIfNeeded);
    window.addEventListener("pagehide", captureScrollIntent);
    window.addEventListener("pageshow", pinIfNeeded);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearResumePinFrame();
      window.removeEventListener("blur", captureScrollIntent);
      window.removeEventListener("focus", pinIfNeeded);
      window.removeEventListener("pagehide", captureScrollIntent);
      window.removeEventListener("pageshow", pinIfNeeded);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clearResumePinFrame, isNearBottom, scheduleResumePin]);

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollTop <= CHAT_MESSAGE_LOAD_THRESHOLD_PX) {
      void loadOlderMessagesRef.current?.();
    }
    const nearBottom = isNearBottom(container);
    shouldAutoScrollRef.current = nearBottom;
    shouldResumePinnedRef.current = nearBottom;
  };

  useEffect(() => () => clearSidebarScrollRestoreFrame(), [clearSidebarScrollRestoreFrame]);

  const currentUserSender = useMemo(
    () =>
      user?.platformUser
        ? {
            id: user.platformUser.id,
            first_name: user.platformUser.first_name,
            last_name: user.platformUser.last_name,
            email: user.platformUser.email,
            profile_photo: user?.brokerProfile?.profile_photo || user?.photoURL || null,
          }
        : null,
    [user?.brokerProfile?.profile_photo, user?.photoURL, user?.platformUser]
  );
  const currentUserIdRef = useRef(currentUserId);
  const currentUserSenderRef = useRef<ChatMessage["sender"]>(currentUserSender);
  const conversationGroupsRef = useRef<ChatConversationSummary[]>(conversationGroups);
  const conversationTabCountsRef = useRef<ConversationTabCounts>(conversationTabCounts);

  useEffect(() => {
    rememberBrokerChatViewer(currentUserId);
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    currentUserSenderRef.current = currentUserSender;
  }, [currentUserSender]);

  useEffect(() => {
    conversationGroupsRef.current = conversationGroups;
  }, [conversationGroups]);

  useLayoutEffect(() => {
    if (isDraftChat) {
      return;
    }

    if (!activeRouteConversationId) {
      setListingDetailLoading(false);
      return;
    }

    if (chatRef.current?.conversationId === activeRouteConversationId) {
      activeConversationRef.current = activeRouteConversationId;
      return;
    }

    saveVisibleScrollPosition();
    const targetEntry = getConversationEntryById(conversationGroupsRef.current, activeRouteConversationId);
    const activeConversationChatPath = getConversationChatPath(activeRouteConversationId);
    const cachedTargetChat =
      getCachedApiPayload<ChatResponse>(activeConversationChatPath) ||
      (canReadBrokerChatMemory(currentUserId) ? getBrokerChatMemoryForConversation(activeRouteConversationId) : null);
    if (!targetEntry) {
      if (cachedTargetChat) {
        activeConversationRef.current = activeRouteConversationId;
        commitChatUpdate(() => cachedTargetChat);
        setListingDetail(
          cachedTargetChat.listing.id
            ? (canReadBrokerChatMemory(currentUserId) ? brokerChatMemory.listingDetailsById.get(cachedTargetChat.listing.id) : null) ||
                getCachedApiPayload<BrokerListingDetail>(`/api/listings/${cachedTargetChat.listing.id}`)?.listing ||
                null
            : null
        );
        shouldAutoScrollRef.current = true;
        shouldResumePinnedRef.current = true;
      }
      setListingDetailLoading(false);
      return;
    }

    if (!cachedTargetChat && !hasThreadMessageCache(targetEntry.conversation)) {
      setListingDetailLoading(false);
      return;
    }

    const nextChat = cachedTargetChat || buildChatFromConversationSummary(targetEntry.group, targetEntry.conversation);
    const cachedTargetListing =
      getCachedApiPayload<BrokerListingDetail>(`/api/listings/${targetEntry.group.listing.id}`)?.listing ||
      (canReadBrokerChatMemory(currentUserId) ? brokerChatMemory.listingDetailsById.get(targetEntry.group.listing.id) : null) ||
      null;

    activeConversationRef.current = activeRouteConversationId;
    commitChatUpdate(() => nextChat);
    rememberBrokerRequirement(targetEntry.conversation.requirement || null);
    setLinkedRequirement(targetEntry.conversation.requirement || null);
    setListingDetail(cachedTargetListing);
    setListingDetailLoading(false);
    shouldAutoScrollRef.current = true;
    shouldResumePinnedRef.current = true;
    if (!cachedTargetChat && activeConversationChatPath) {
      void apiFetchCached<ChatResponse>(activeConversationChatPath, {}, { ttlMs: CHAT_PAYLOAD_TTL_MS })
        .then((payload) => {
          if (routeConversationIdRef.current !== activeRouteConversationId) {
            return;
          }

          commitChatUpdate((current) =>
            current?.conversationId === activeRouteConversationId
              ? mergeTransientChatPayloadMessages(payload, current)
              : current
          );
        })
        .catch(() => undefined);
    }
  }, [activeRouteConversationId, commitChatUpdate, conversationGroups, currentUserId, isDraftChat, saveVisibleScrollPosition]);

  const markConversationReadOnServer = useCallback(
    (targetConversationId: string, readUntilSequence: number | null, readAt?: string | null) => {
      void apiFetch(`/api/chat/conversations/${targetConversationId}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "mark_read",
          readUntilSequence,
          readAt,
        }),
      })
        .catch(() => {
          void loadChat({ force: true });
        });
    },
    [loadChat]
  );

  const setOlderMessagesLoadingState = useCallback((value: boolean) => {
    olderMessagesLoadingRef.current = value;
    setOlderMessagesLoading(value);
  }, []);

  const loadOlderMessages = useCallback(async () => {
    const chatSnapshot = chatRef.current;
    const targetConversationId = getPersistedConversationId(chatSnapshot?.conversationId);
    const cursor = chatSnapshot?.messagesNextCursor || null;

    if (
      olderMessagesLoadingRef.current ||
      !chatSnapshot ||
      !targetConversationId ||
      chatSnapshot.messagesHasMore === false ||
      !cursor
    ) {
      return;
    }

    const requestPath = getConversationChatPath(targetConversationId, cursor);
    if (!requestPath) {
      return;
    }

    const container = messagesContainerRef.current;
    const previousScrollHeight = container?.scrollHeight || 0;
    const previousScrollTop = container?.scrollTop || 0;

    shouldAutoScrollRef.current = false;
    shouldResumePinnedRef.current = false;
    setOlderMessagesLoadingState(true);

    try {
      const payload = await apiFetch<ChatResponse>(requestPath);
      const nextChat = commitChatUpdate((current) => {
        if (!current || current.conversationId !== targetConversationId || activeConversationRef.current !== targetConversationId) {
          return current;
        }

        return {
          ...current,
          messages: sortChatMessages([...(payload.messages || []), ...current.messages]),
          messagesHasMore: payload.messagesHasMore ?? false,
          messagesNextCursor: payload.messagesNextCursor || null,
        };
      });

      if (nextChat?.conversationId === targetConversationId) {
        window.requestAnimationFrame(() => {
          const activeContainer = messagesContainerRef.current;
          if (!activeContainer || activeConversationRef.current !== targetConversationId) {
            return;
          }

          activeContainer.scrollTop = activeContainer.scrollHeight - previousScrollHeight + previousScrollTop;
        });
      }
    } catch {
      return;
    } finally {
      setOlderMessagesLoadingState(false);
    }
  }, [commitChatUpdate, setOlderMessagesLoadingState]);

  useEffect(() => {
    loadOlderMessagesRef.current = loadOlderMessages;
  }, [loadOlderMessages]);

  const handleRealtimeConversationMessageInsert = useCallback(
    (rawRow: Partial<ChatConversationMessageRealtimeRow> | null | undefined) => {
      const content = typeof rawRow?.content === "string" ? rawRow.content : typeof rawRow?.body === "string" ? rawRow.body : "";

      if (!rawRow?.id || !rawRow.conversation_id || !rawRow.sender_id || !content || !rawRow.created_at) {
        return;
      }

      const viewerUserId = currentUserIdRef.current;
      if (!viewerUserId) {
        return;
      }

      const chatSnapshot = chatRef.current;
      const activeConversationId = activeConversationRef.current || null;
      const isActiveConversation = activeConversationId === rawRow.conversation_id;
      const knownEntry = getConversationEntryById(conversationGroupsRef.current, rawRow.conversation_id);
      const listingId =
        knownEntry?.group.listing.id ||
        (isActiveConversation && chatSnapshot?.conversationId === rawRow.conversation_id ? chatSnapshot.listing.id : null);

      if (!listingId) {
        void refreshConversationSummary(rawRow.conversation_id).catch(() => scheduleConversationGroupsRefresh());
        return;
      }

      const thread = knownEntry?.conversation || null;
      const threadSender =
        thread?.messages?.find((entry) => entry.sender_id === rawRow.sender_id && entry.sender)?.sender ||
        (thread?.participant?.id === rawRow.sender_id ? thread.participant : null);
      const activeChatSender =
        chatSnapshot?.conversationId === rawRow.conversation_id && chatSnapshot.participant?.id === rawRow.sender_id
          ? chatSnapshot.participant
          : null;
      const sender = rawRow.sender_id === viewerUserId ? currentUserSenderRef.current : threadSender || activeChatSender || null;
      const realtimeMessage = buildLocalChatMessage({
        clientMessageId: rawRow.client_message_id,
        content,
        conversationId: rawRow.conversation_id,
        createdAt: rawRow.created_at,
        listingId,
        messageId: rawRow.id,
        messageSequence: rawRow.message_sequence,
        receiverId: rawRow.receiver_id,
        sender,
        senderId: rawRow.sender_id,
        updatedAt: rawRow.updated_at,
      });
      const isOwnMessage = realtimeMessage.sender_id === viewerUserId;
      if (isOwnMessage) {
        forgetChatOutboxMessage(viewerUserId, realtimeMessage);
      }
      const isIncomingForViewer = rawRow.receiver_id ? rawRow.receiver_id === viewerUserId : !isOwnMessage;
      const shouldPinActiveConversation = isOwnMessage || shouldAutoScrollRef.current;
      const knownThreadHadUnread = thread ? getThreadUnreadCount(thread) > 0 : false;
      const knownThreadAlreadyHasMessage = thread ? threadHasMatchingMessage(thread, realtimeMessage) : false;
      const shouldMarkKnownThreadRead = isActiveConversation && isDocumentVisibleRef.current;
      const knownThreadWillHaveUnread = thread
        ? shouldMarkKnownThreadRead
          ? false
          : isIncomingForViewer
            ? knownThreadHadUnread || !knownThreadAlreadyHasMessage
            : knownThreadHadUnread
        : false;

      if (thread && knownThreadHadUnread !== knownThreadWillHaveUnread) {
        patchConversationTabCounts((counts) => ({
          ...counts,
          unread: counts.unread + (knownThreadWillHaveUnread ? 1 : -1),
        }));
      }

      invalidateChatCaches({
        conversationId: rawRow.conversation_id,
        listingId,
      });

      if (!knownEntry) {
        void refreshConversationSummary(rawRow.conversation_id).catch(() => scheduleConversationGroupsRefresh());
      }

      if (isActiveConversation) {
        if (shouldPinActiveConversation) {
          shouldAutoScrollRef.current = true;
          shouldResumePinnedRef.current = true;
        }

        const nextChat = commitChatUpdate((current) => {
          if (!current || current.conversationId !== rawRow.conversation_id || activeConversationRef.current !== rawRow.conversation_id) {
            return current;
          }

          return upsertChatPayloadMessage(current, realtimeMessage, rawRow.conversation_id);
        });

        if (nextChat?.conversationId === rawRow.conversation_id) {
          const realtimeConversationChatPath = getConversationChatPath(rawRow.conversation_id);
          if (realtimeConversationChatPath) {
            setCachedApiData(realtimeConversationChatPath, nextChat, {}, CHAT_PAYLOAD_TTL_MS);
          }
          if (draftListingId && nextChat.listing.id === draftListingId) {
            const draftChatPath = getListingChatPath(draftListingId);
            if (draftChatPath) {
              setCachedApiData(draftChatPath, nextChat, {}, CHAT_PAYLOAD_TTL_MS);
            }
          }
        }
      }

      setConversationGroups((currentGroups) => {
        let changed = false;
        const nextGroups = currentGroups.map((group) => {
          let groupChanged = false;
          const nextConversations = group.conversations.map((conversation) => {
            if (conversation.conversationId !== rawRow.conversation_id) {
              return conversation;
            }

            changed = true;
            groupChanged = true;
            const messageAlreadyPresent = threadHasMatchingMessage(conversation, realtimeMessage);
            const messages = upsertThreadMessage(conversation.messages, realtimeMessage);
            const lastMessage = getLatestChatMessage(messages, realtimeMessage);
            const shouldMarkRead = isActiveConversation && isDocumentVisibleRef.current;
            const unreadCount = shouldMarkRead
              ? 0
              : !isIncomingForViewer || messageAlreadyPresent
                ? getThreadUnreadCount(conversation)
                : getThreadUnreadCount(conversation) + 1;

            return {
              ...conversation,
              lastMessage,
              lastActivityAt: lastMessage.created_at,
              hasUnread: unreadCount > 0,
              unreadCount,
              lastReadAt: shouldMarkRead ? lastMessage.created_at : conversation.lastReadAt,
              lastReadSequence: shouldMarkRead ? lastMessage.message_sequence ?? conversation.lastReadSequence ?? null : conversation.lastReadSequence ?? null,
              lastMessageSequence: lastMessage.message_sequence ?? conversation.lastMessageSequence ?? null,
              messageCount: messageAlreadyPresent
                ? Math.max(conversation.messageCount, messages.length)
                : Math.max(conversation.messageCount + 1, messages.length),
              messages,
            };
          });

          return groupChanged ? { ...group, conversations: nextConversations } : group;
        });

        if (!changed) {
          return currentGroups;
        }

        const sortedGroups = filterConversationGroupsForTab(nextGroups, threadFilterRef.current);
        conversationGroupsRef.current = sortedGroups;
        rememberBrokerConversationGroups(sortedGroups, conversationTabCountsRef.current, threadFilterRef.current);
        return sortedGroups;
      });

      if (isActiveConversation && isDocumentVisibleRef.current && isIncomingForViewer) {
        markConversationReadOnServer(rawRow.conversation_id, realtimeMessage.message_sequence ?? null, realtimeMessage.created_at);
      }
    },
    [commitChatUpdate, draftListingId, markConversationReadOnServer, patchConversationTabCounts, refreshConversationSummary, scheduleConversationGroupsRefresh]
  );

  const handleRealtimeConversationInsert = useCallback(
    (rawRow: Partial<ChatConversationRealtimeRow> | null | undefined) => {
      const viewerUserId = currentUserIdRef.current;
      if (!viewerUserId || !rawRow?.id) {
        return;
      }

      if (rawRow.owner_user_id !== viewerUserId && rawRow.broker_user_id !== viewerUserId) {
        return;
      }

      void refreshConversationSummary(rawRow.id).catch(() => scheduleConversationGroupsRefresh());
    },
    [refreshConversationSummary, scheduleConversationGroupsRefresh]
  );
  const handleRealtimeConversationUpdate = useCallback(
    (rawRow: Partial<ChatConversationRealtimeRow> | null | undefined) => {
      const viewerUserId = currentUserIdRef.current;
      if (!viewerUserId || !rawRow?.id) {
        return;
      }

      if (rawRow.owner_user_id !== viewerUserId && rawRow.broker_user_id !== viewerUserId) {
        return;
      }

      const viewerLastReadAt = rawRow.owner_user_id === viewerUserId ? rawRow.owner_last_read_at || null : rawRow.broker_last_read_at || null;
      const viewerLastReadSequence =
        rawRow.owner_user_id === viewerUserId ? rawRow.owner_last_read_sequence ?? null : rawRow.broker_last_read_sequence ?? null;
      const activeConversationId = activeConversationRef.current || null;
      const existingEntry = getConversationEntryById(conversationGroupsRef.current, rawRow.id);
      if (existingEntry) {
        const conversation = existingEntry.conversation;
        const lastActivityAt = rawRow.last_message_at || rawRow.updated_at || conversation.lastActivityAt;
        const lastMessageFromViewer = conversation.lastMessage?.sender_id === viewerUserId;
        const lastMessageSequence = conversation.lastMessage?.message_sequence ?? rawRow.last_message_sequence ?? conversation.lastMessageSequence ?? null;
        const isActiveConversation = rawRow.id === activeConversationId && isDocumentVisibleRef.current;
        const hadUnread = getThreadUnreadCount(conversation) > 0;
        const hasUnread = Boolean(
          !isActiveConversation &&
            conversation.lastMessage &&
            !lastMessageFromViewer &&
            ((typeof viewerLastReadSequence === "number" && typeof lastMessageSequence === "number"
              ? lastMessageSequence > viewerLastReadSequence
              : lastActivityAt && (!viewerLastReadAt || lastActivityAt.localeCompare(viewerLastReadAt) > 0)))
        );

        if (hadUnread !== hasUnread) {
          patchConversationTabCounts((counts) => ({
            ...counts,
            unread: counts.unread + (hasUnread ? 1 : -1),
          }));
        }
      }
      let didPatchConversation = false;
      let shouldRefreshConversationSnapshot = false;

      setConversationGroups((currentGroups) => {
        let changed = false;
        const nextGroups = currentGroups.map((group) => {
          let groupChanged = false;
          const nextConversations = group.conversations.map((conversation) => {
            if (conversation.conversationId !== rawRow.id) {
              return conversation;
            }

            changed = true;
            groupChanged = true;
            didPatchConversation = true;

            const lastActivityAt = rawRow.last_message_at || rawRow.updated_at || conversation.lastActivityAt;
            const currentLastMessageAt = conversation.lastMessage?.created_at || "";
            if (lastActivityAt && (!currentLastMessageAt || lastActivityAt.localeCompare(currentLastMessageAt) > 0)) {
              shouldRefreshConversationSnapshot = true;
            }
            const lastMessageFromViewer = conversation.lastMessage?.sender_id === viewerUserId;
            const lastMessageSequence = conversation.lastMessage?.message_sequence ?? rawRow.last_message_sequence ?? conversation.lastMessageSequence ?? null;
            const isActiveConversation = rawRow.id === activeConversationId && isDocumentVisibleRef.current;
            const hasUnread = Boolean(
              !isActiveConversation &&
                conversation.lastMessage &&
                !lastMessageFromViewer &&
                ((typeof viewerLastReadSequence === "number" && typeof lastMessageSequence === "number"
                  ? lastMessageSequence > viewerLastReadSequence
                  : lastActivityAt && (!viewerLastReadAt || lastActivityAt.localeCompare(viewerLastReadAt) > 0)))
            );

            return {
              ...conversation,
              lastActivityAt,
              hasUnread,
              unreadCount: hasUnread ? Math.max(getThreadUnreadCount(conversation), 1) : 0,
              lastReadAt: viewerLastReadAt,
              lastReadSequence: viewerLastReadSequence,
              lastMessageSequence,
            };
          });

          return groupChanged ? { ...group, conversations: nextConversations } : group;
        });

        if (!changed) {
          return currentGroups;
        }

        const sortedGroups = filterConversationGroupsForTab(nextGroups, threadFilterRef.current);
        conversationGroupsRef.current = sortedGroups;
        rememberBrokerConversationGroups(sortedGroups, conversationTabCountsRef.current, threadFilterRef.current);
        return sortedGroups;
      });

      if (!didPatchConversation || shouldRefreshConversationSnapshot) {
        void refreshConversationSummary(rawRow.id).catch(() => scheduleConversationGroupsRefresh());
      }
    },
    [patchConversationTabCounts, refreshConversationSummary, scheduleConversationGroupsRefresh]
  );
  const handleRealtimeConversationMessageInsertRef = useRef(handleRealtimeConversationMessageInsert);
  const handleRealtimeConversationInsertRef = useRef(handleRealtimeConversationInsert);
  const handleRealtimeConversationUpdateRef = useRef(handleRealtimeConversationUpdate);

  useEffect(() => {
    handleRealtimeConversationMessageInsertRef.current = handleRealtimeConversationMessageInsert;
  }, [handleRealtimeConversationMessageInsert]);

  useEffect(() => {
    handleRealtimeConversationInsertRef.current = handleRealtimeConversationInsert;
  }, [handleRealtimeConversationInsert]);

  useEffect(() => {
    handleRealtimeConversationUpdateRef.current = handleRealtimeConversationUpdate;
  }, [handleRealtimeConversationUpdate]);

  const reconcileActiveConversation = useCallback(async () => {
    const activeConversationId = getPersistedConversationId(activeConversationRef.current || chatRef.current?.conversationId);
    const chatSnapshot = chatRef.current;
    if (!activeConversationId || !chatSnapshot || chatSnapshot.conversationId !== activeConversationId) {
      scheduleConversationGroupsRefresh();
      return;
    }

    const highestSequence = getHighestMessageSequence(chatSnapshot.messages);
    if (highestSequence === null) {
      scheduleConversationGroupsRefresh();
      return;
    }

    try {
      const payload = await apiFetch<ChatResponse>(
        `/api/chat/conversations/${activeConversationId}?sinceSequence=${highestSequence}&limit=${CHAT_MESSAGE_PAGE_SIZE}`
      );
      const incomingMessages = payload.messages || [];

      if (incomingMessages.length) {
        const nextChat = commitChatUpdate((current) => {
          if (!current || current.conversationId !== activeConversationId) {
            return current;
          }

          return {
            ...current,
            messages: sortChatMessages([...current.messages, ...incomingMessages]),
            messagesHasMore: current.messagesHasMore ?? payload.messagesHasMore,
            messagesNextCursor: current.messagesNextCursor ?? payload.messagesNextCursor,
          };
        });

        if (nextChat?.conversationId === activeConversationId) {
          const activeConversationChatPath = getConversationChatPath(activeConversationId);
          if (activeConversationChatPath) {
            setCachedApiData(activeConversationChatPath, nextChat, {}, CHAT_PAYLOAD_TTL_MS);
          }
          const newestSequence = getHighestMessageSequence(nextChat.messages);
          const newestMessage = getLatestChatMessageFromCandidates(nextChat.messages);
          if (newestSequence !== null && newestMessage && isDocumentVisibleRef.current) {
            markConversationReadOnServer(activeConversationId, newestSequence, newestMessage.created_at);
          }
        }
      }

      scheduleConversationGroupsRefresh();
    } catch {
      return;
    }
  }, [commitChatUpdate, markConversationReadOnServer, scheduleConversationGroupsRefresh]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let didCleanup = false;
    let didRemoveChannel = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    hasRealtimeSubscribedRef.current = false;

    const subscribeToBrokerChatRealtime = async () => {
      const accessToken = await syncSupabaseRealtimeAuth();
      if (didCleanup) {
        return;
      }

      if (!accessToken) {
        return;
      }

      channel = supabase
        .channel(`broker-chat-realtime-${currentUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_conversation_messages", filter: `receiver_id=eq.${currentUserId}` },
          (payload) => handleRealtimeConversationMessageInsertRef.current(payload.new as Partial<ChatConversationMessageRealtimeRow>)
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_conversation_messages", filter: `sender_id=eq.${currentUserId}` },
          (payload) => handleRealtimeConversationMessageInsertRef.current(payload.new as Partial<ChatConversationMessageRealtimeRow>)
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "chat_conversation_messages", filter: `receiver_id=eq.${currentUserId}` },
          (payload) => handleRealtimeConversationMessageInsertRef.current(payload.new as Partial<ChatConversationMessageRealtimeRow>)
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "chat_conversation_messages", filter: `sender_id=eq.${currentUserId}` },
          (payload) => handleRealtimeConversationMessageInsertRef.current(payload.new as Partial<ChatConversationMessageRealtimeRow>)
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_conversations", filter: `owner_user_id=eq.${currentUserId}` },
          (payload) => handleRealtimeConversationInsertRef.current(payload.new as Partial<ChatConversationRealtimeRow>)
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_conversations", filter: `broker_user_id=eq.${currentUserId}` },
          (payload) => handleRealtimeConversationInsertRef.current(payload.new as Partial<ChatConversationRealtimeRow>)
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "chat_conversations", filter: `owner_user_id=eq.${currentUserId}` },
          (payload) => handleRealtimeConversationUpdateRef.current(payload.new as Partial<ChatConversationRealtimeRow>)
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "chat_conversations", filter: `broker_user_id=eq.${currentUserId}` },
          (payload) => handleRealtimeConversationUpdateRef.current(payload.new as Partial<ChatConversationRealtimeRow>)
        );

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (hasRealtimeSubscribedRef.current) {
            void reconcileActiveConversation();
          }
          hasRealtimeSubscribedRef.current = true;
        }
      });
    };

    void subscribeToBrokerChatRealtime();

    return () => {
      didCleanup = true;
      if (didRemoveChannel) {
        return;
      }

      didRemoveChannel = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [currentUserId, reconcileActiveConversation]);

  const persistMessage = useCallback(
    async ({
      clientMessageId,
      content,
      createdAt,
      optimisticMessageId,
      optimisticSequence,
      sendTarget,
    }: {
      clientMessageId: string;
      content: string;
      createdAt: string;
      optimisticMessageId: string;
      optimisticSequence?: number;
      sendTarget: ChatSendTarget;
    }) => {
      if (!currentUserId) {
        return;
      }

      if (activeSendIdsRef.current.has(optimisticMessageId)) {
        return;
      }

      activeSendIdsRef.current.add(optimisticMessageId);
      const queueKey = getChatSendQueueKey(sendTarget);

      try {
        await enqueueChatSend(queueKey, async () => {
          const activeConversationId = sendTarget.conversationId;
          const startedConversationId = activeConversationId;
          const listingId = sendTarget.listingId;
          const canFallbackToListingConversation = !!listingId && !sendTarget.listingIsOwner;

          if (!activeConversationId && !listingId) {
            throw new Error("Unable to resolve this conversation.");
          }

          const sendMessageToListingChat = () => {
            if (!listingId) {
              throw new Error("Unable to resolve this conversation.");
            }

            return apiFetch<SendListingChatMessageResult>(`/api/chat/${listingId}`, {
              method: "POST",
              body: JSON.stringify({ content, clientMessageId }),
            });
          };

          let nextConversationId: string | null = activeConversationId;
          let payload: SendConversationMessageResult | SendListingChatMessageResult;

          if (activeConversationId) {
            try {
              payload = await apiFetch<SendConversationMessageResult>(`/api/chat/conversations/${activeConversationId}`, {
                method: "POST",
                body: JSON.stringify({ content, clientMessageId }),
              });
            } catch (error) {
              if (!canFallbackToListingConversation || !isConversationNotFoundError(error)) {
                throw error;
              }

              const listingPayload = await sendMessageToListingChat();
              payload = listingPayload;
              nextConversationId = listingPayload.conversationId;
            }
          } else {
            const listingPayload = await sendMessageToListingChat();
            payload = listingPayload;
            nextConversationId = listingPayload.conversationId;
          }

          const savedMessage = payload.message;
          const persistedMessageId = savedMessage?.id || payload.messageId;
          const persistedCreatedAt = savedMessage?.created_at || payload.createdAt || createdAt;
          const persistedUpdatedAt = savedMessage?.updated_at || payload.updatedAt || persistedCreatedAt;
          const persistedContent = savedMessage?.content || savedMessage?.body || content;
          const persistedSenderId = savedMessage?.sender_id || currentUserId;
          const persistedClientMessageId = savedMessage?.client_message_id || clientMessageId;
          const persistedMessageSequence = savedMessage?.message_sequence ?? null;
          const isOptimisticMessage = (entry: ChatRenderableMessage) =>
            entry.id === optimisticMessageId || entry.clientTempId === optimisticMessageId;
          const optimisticSnapshot =
            chatRef.current?.messages.find(isOptimisticMessage) ||
            (sendTarget.conversationId ? getBrokerChatMemoryForConversation(sendTarget.conversationId)?.messages.find(isOptimisticMessage) : null) ||
            (sendTarget.listingId ? brokerChatMemory.chatsByListingId.get(sendTarget.listingId)?.messages.find(isOptimisticMessage) : null) ||
            null;

          const confirmedMessage = buildLocalChatMessage({
            clientMessageId: persistedClientMessageId,
            clientTempId: optimisticMessageId,
            content: persistedContent,
            conversationId: nextConversationId,
            createdAt: persistedCreatedAt,
            listingId: optimisticSnapshot?.listing_id || listingId || "",
            messageId: persistedMessageId,
            messageSequence: persistedMessageSequence,
            optimisticCreatedAt: optimisticSnapshot?.optimisticCreatedAt || createdAt,
            optimisticSequence: optimisticSnapshot?.optimisticSequence ?? optimisticSequence,
            receiverId: savedMessage?.receiver_id || sendTarget.receiverId,
            sender: persistedSenderId === currentUserId ? currentUserSender : optimisticSnapshot?.sender || null,
            senderId: persistedSenderId,
            updatedAt: persistedUpdatedAt,
          });
          forgetChatOutboxMessage(currentUserId, confirmedMessage);
          const nextChat = commitChatUpdate((current) => {
            if (!isChatPayloadForSendTarget(current, sendTarget, nextConversationId)) {
              return current;
            }

            const hasLocalMessage = current?.messages.some(
              (entry) => entry.id === optimisticMessageId || entry.clientTempId === optimisticMessageId || entry.id === persistedMessageId
            );
            if (!current || !hasLocalMessage) {
              return current;
            }

            return replaceChatPayloadMessage(current, optimisticMessageId, confirmedMessage, nextConversationId);
          });

          const cachedTargetChat =
            nextChat ||
            (startedConversationId ? getBrokerChatMemoryForConversation(startedConversationId) : null) ||
            (sendTarget.listingId ? brokerChatMemory.chatsByListingId.get(sendTarget.listingId) : null);
          const nextCachedTargetChat =
            cachedTargetChat && cachedTargetChat !== nextChat && isChatPayloadForSendTarget(cachedTargetChat, sendTarget, nextConversationId)
              ? replaceChatPayloadMessage(cachedTargetChat, optimisticMessageId, confirmedMessage, nextConversationId)
              : nextChat;

          if (nextCachedTargetChat && nextCachedTargetChat !== nextChat) {
            rememberBrokerChatPayload(nextCachedTargetChat, { visible: false });
          }

          if (nextChat?.conversationId === nextConversationId && nextConversationId) {
            activeConversationRef.current = nextConversationId;
          }

          setConversationGroups((currentGroups) => {
            const nextGroups = filterConversationGroupsForTab(
              patchConversationGroupsThread(currentGroups, nextConversationId, (thread) => {
                const messages = upsertThreadMessage(thread.messages, confirmedMessage, optimisticMessageId);
                const lastMessage = getLatestChatMessage(messages, confirmedMessage);

                return {
                  ...thread,
                  lastMessage,
                  lastActivityAt: lastMessage.created_at,
                  hasUnread: false,
                  unreadCount: 0,
                  lastReadAt: lastMessage.created_at,
                  lastReadSequence: lastMessage.message_sequence ?? thread.lastReadSequence ?? null,
                  lastMessageSequence: lastMessage.message_sequence ?? thread.lastMessageSequence ?? null,
                  messageCount: Math.max(thread.messageCount, messages.length),
                  messages,
                };
              }),
              threadFilterRef.current
            );
            conversationGroupsRef.current = nextGroups;
            rememberBrokerConversationGroups(nextGroups, conversationTabCountsRef.current, threadFilterRef.current);
            return nextGroups;
          });

          invalidateChatCaches({
            conversationId: nextConversationId,
            listingId: listingId || undefined,
          });

          if (nextCachedTargetChat) {
            const draftChatPath = sendTarget.draftListingId
              ? getListingChatPath(sendTarget.draftListingId)
              : !startedConversationId && listingId
                ? getListingChatPath(listingId)
                : null;
            if (draftChatPath) {
              setCachedApiData(draftChatPath, nextCachedTargetChat, {}, CHAT_PAYLOAD_TTL_MS);
            }

            if (nextConversationId) {
              const nextConversationChatPath = getConversationChatPath(nextConversationId);
              if (nextConversationChatPath) {
                setCachedApiData(nextConversationChatPath, nextCachedTargetChat, {}, CHAT_PAYLOAD_TTL_MS);
              }
            }
          }

          if (!activeConversationId && nextConversationId) {
            scheduleConversationGroupsRefresh();
          }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to send message.";
        const markMessageFailed = (current: ChatResponse | null) =>
          patchChatPayloadMessage(current, optimisticMessageId, (pendingMessage) => ({
            ...pendingMessage,
            deliveryState: "failed",
            errorMessage,
          }));
        const nextChat = commitChatUpdate((current) =>
          isChatPayloadForSendTarget(current, sendTarget) ? markMessageFailed(current) : current
        );
        const cachedTargetChat =
          nextChat ||
          (sendTarget.conversationId ? getBrokerChatMemoryForConversation(sendTarget.conversationId) : null) ||
          (sendTarget.listingId ? brokerChatMemory.chatsByListingId.get(sendTarget.listingId) : null);
        if (cachedTargetChat && cachedTargetChat !== nextChat && isChatPayloadForSendTarget(cachedTargetChat, sendTarget)) {
          rememberBrokerChatPayload(markMessageFailed(cachedTargetChat), { visible: false });
        }
        const failedMessage =
          nextChat?.messages.find((entry) => entry.id === optimisticMessageId || entry.clientTempId === optimisticMessageId) ||
          cachedTargetChat?.messages.find((entry) => entry.id === optimisticMessageId || entry.clientTempId === optimisticMessageId) ||
          null;
        if (failedMessage) {
          rememberChatOutboxMessage(currentUserId, failedMessage);
        }
        enqueueSnackbar(errorMessage, { variant: "error" });
      } finally {
        activeSendIdsRef.current.delete(optimisticMessageId);
      }
    },
    [commitChatUpdate, currentUserId, currentUserSender, enqueueChatSend, enqueueSnackbar, scheduleConversationGroupsRefresh]
  );

  const handleRetryMessage = useCallback(
    (messageId: string) => {
      const failedMessage = chatRef.current?.messages.find((entry) => entry.id === messageId);
      if (!failedMessage || failedMessage.deliveryState !== "failed") {
        return;
      }

      const clientMessageId =
        failedMessage.client_message_id && UUID_PATTERN.test(failedMessage.client_message_id)
          ? failedMessage.client_message_id
          : createClientMessageId();

      const nextChat = commitChatUpdate((current) =>
        patchChatPayloadMessage(current, messageId, (messageToRetry) => ({
          ...messageToRetry,
          client_message_id: clientMessageId,
          deliveryState: "pending",
          errorMessage: null,
        }))
      );

      if (!nextChat) {
        return;
      }

      const pendingRetryMessage = nextChat.messages.find((entry) => entry.id === messageId || entry.clientTempId === messageId);
      if (pendingRetryMessage) {
        rememberChatOutboxMessage(currentUserId, pendingRetryMessage);
      }

      const sendTarget = buildChatSendTarget({
        chatSnapshot: nextChat,
        draftListingId,
        isDraftChat,
        routeConversationId: routeConversationId || null,
      });
      shouldAutoScrollRef.current = true;
      shouldResumePinnedRef.current = true;
      void persistMessage({
        clientMessageId,
        content: failedMessage.content,
        createdAt: failedMessage.created_at,
        optimisticMessageId: messageId,
        optimisticSequence: failedMessage.optimisticSequence,
        sendTarget,
      });
    },
    [commitChatUpdate, currentUserId, draftListingId, isDraftChat, persistMessage, routeConversationId]
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedMessage = messageDraftRef.current.trim();
    const chatSnapshot = chatRef.current;
    if (!trimmedMessage || !currentUserId || !chatSnapshot) return;
    if (activeConversationRef.current && chatSnapshot.conversationId !== activeConversationRef.current) return;

    const sendTarget = buildChatSendTarget({
      chatSnapshot,
      draftListingId,
      isDraftChat,
      routeConversationId: routeConversationId || null,
    });
    optimisticMessageCounterRef.current += 1;
    const optimisticSequence = optimisticMessageCounterRef.current;
    const createdAt = new Date().toISOString();
    const clientMessageId = createClientMessageId();
    const optimisticMessageId = `${OPTIMISTIC_MESSAGE_ID_PREFIX}${clientMessageId}`;
    const optimisticMessage = buildLocalChatMessage({
      clientMessageId,
      clientTempId: optimisticMessageId,
      content: trimmedMessage,
      conversationId: sendTarget.conversationId || sendTarget.initialConversationId,
      createdAt,
      deliveryState: "pending",
      listingId: sendTarget.listingId || chatSnapshot.listing.id,
      messageId: optimisticMessageId,
      optimisticCreatedAt: createdAt,
      optimisticSequence,
      receiverId: sendTarget.receiverId,
      sender: currentUserSender,
      senderId: currentUserId,
    });

    rememberChatOutboxMessage(currentUserId, optimisticMessage);
    setMessageDraft("");
    shouldAutoScrollRef.current = true;
    shouldResumePinnedRef.current = true;
    commitChatUpdate((current) =>
      isChatPayloadForSendTarget(current, sendTarget)
        ? upsertChatPayloadMessage(current, optimisticMessage, sendTarget.conversationId || sendTarget.initialConversationId)
        : current
    );
    if (sendTarget.conversationId) {
      const existingThread = getConversationEntryById(conversationGroupsRef.current, sendTarget.conversationId)?.conversation || null;
      if (existingThread && getThreadUnreadCount(existingThread) > 0) {
        patchConversationTabCounts((counts) => ({
          ...counts,
          unread: counts.unread - 1,
        }));
      }

      setConversationGroups((currentGroups) => {
        const nextGroups = filterConversationGroupsForTab(
          patchConversationGroupsThread(currentGroups, sendTarget.conversationId, (thread) => {
            const messages = upsertThreadMessage(thread.messages, optimisticMessage);
            const lastMessage = getLatestChatMessage(messages, optimisticMessage);

            return {
              ...thread,
              lastMessage,
              lastActivityAt: lastMessage.created_at,
              hasUnread: false,
              unreadCount: 0,
              lastReadAt: lastMessage.created_at,
              lastReadSequence: lastMessage.message_sequence ?? thread.lastReadSequence ?? null,
              lastMessageSequence: lastMessage.message_sequence ?? thread.lastMessageSequence ?? null,
              messageCount: Math.max(thread.messageCount, messages.length),
              messages,
            };
          }),
          threadFilterRef.current
        );
        conversationGroupsRef.current = nextGroups;
        rememberBrokerConversationGroups(nextGroups, conversationTabCountsRef.current, threadFilterRef.current);
        return nextGroups;
      });
    }
    void persistMessage({
      clientMessageId,
      content: trimmedMessage,
      createdAt,
      optimisticMessageId,
      optimisticSequence,
      sendTarget,
    });
  };

  const handleConversationSelect = useCallback(
    (targetConversationId: string) => {
      saveSidebarScrollPosition();
      sidebarScrollRestorePendingRef.current = true;
      setMobileThreadsOpen(false);
      saveVisibleScrollPosition();
      latestChatLoadRequestIdRef.current += 1;
      activeConversationRef.current = targetConversationId;
      routeConversationIdRef.current = targetConversationId;
      draftListingIdRef.current = null;

      const nextHref = `/dashboard/chats/${targetConversationId}${preservedContextQuery ? `?${preservedContextQuery}` : ""}`;
      setPendingRouteConversationId(targetConversationId);
      if (isDraftChat || activeRouteConversationId !== targetConversationId) {
        router.push(nextHref, { scroll: false });
      }
      scheduleSidebarScrollRestore();
      if (targetConversationId === chat?.conversationId) return;

      const targetEntry = getConversationEntryById(conversationGroups, targetConversationId);
      const targetConversationChatPath = getConversationChatPath(targetConversationId);
      const cachedTargetChat =
        getCachedApiPayload<ChatResponse>(targetConversationChatPath) ||
        (canReadBrokerChatMemory(currentUserId) ? getBrokerChatMemoryForConversation(targetConversationId) : null);

      if (cachedTargetChat || (targetEntry && hasThreadMessageCache(targetEntry.conversation))) {
        const nextChat = cachedTargetChat || (targetEntry ? buildChatFromConversationSummary(targetEntry.group, targetEntry.conversation) : null);
        if (!nextChat) {
          return;
        }

        const targetListingId = targetEntry?.group.listing.id || nextChat.listing.id;
        const cachedTargetListing =
          (targetListingId ? getCachedApiPayload<BrokerListingDetail>(`/api/listings/${targetListingId}`)?.listing : null) ||
          (canReadBrokerChatMemory(currentUserId) && targetListingId ? brokerChatMemory.listingDetailsById.get(targetListingId) : null) ||
          null;

        commitChatUpdate(() => nextChat);
        if (targetEntry) {
          rememberBrokerRequirement(targetEntry.conversation.requirement || null);
          setLinkedRequirement(targetEntry.conversation.requirement || null);
        }
        setListingDetail(cachedTargetListing);
        setListingDetailLoading(false);
        shouldAutoScrollRef.current = true;
        shouldResumePinnedRef.current = true;
        if (!cachedTargetChat && targetConversationChatPath) {
          void apiFetchCached<ChatResponse>(targetConversationChatPath, {}, { ttlMs: CHAT_PAYLOAD_TTL_MS })
            .then((payload) => {
              if (routeConversationIdRef.current !== targetConversationId) {
                return;
              }

              commitChatUpdate((current) =>
                current?.conversationId === targetConversationId
                  ? mergeTransientChatPayloadMessages(payload, current)
                  : current
              );
            })
            .catch(() => undefined);
        }
        return;
      }

      if (!targetConversationChatPath) {
        return;
      }

      void apiFetchCached<ChatResponse>(targetConversationChatPath, {}, { ttlMs: CHAT_PAYLOAD_TTL_MS })
        .then((payload) => {
          if (routeConversationIdRef.current !== targetConversationId) {
            return;
          }

          activeConversationRef.current = targetConversationId;
          commitChatUpdate(() => payload);
          setListingDetail(
            payload.listing.id
              ? getCachedApiPayload<BrokerListingDetail>(`/api/listings/${payload.listing.id}`)?.listing ||
                  (canReadBrokerChatMemory(currentUserId) ? brokerChatMemory.listingDetailsById.get(payload.listing.id) : null) ||
                  null
              : null
          );
          setListingDetailLoading(false);
          shouldAutoScrollRef.current = true;
          shouldResumePinnedRef.current = true;
        })
        .catch(() => undefined);
    },
    [
      activeRouteConversationId,
      chat?.conversationId,
      commitChatUpdate,
      conversationGroups,
      currentUserId,
      isDraftChat,
      preservedContextQuery,
      router,
      saveSidebarScrollPosition,
      saveVisibleScrollPosition,
      scheduleSidebarScrollRestore,
    ]
  );

  const activeChat = useMemo(() => {
    const summaryChat = activeConversationEntry && hasThreadMessageCache(activeConversationEntry.conversation)
      ? buildChatFromConversationSummary(activeConversationEntry.group, activeConversationEntry.conversation)
      : null;
    const cachedActiveChat =
      getCachedApiPayload<ChatResponse>(getConversationChatPath(activeRouteConversationId)) ||
      (canReadBrokerChatMemory(currentUserId) ? getBrokerChatMemoryForConversation(activeRouteConversationId) : null);

    if (!chat) {
      return summaryChat || cachedActiveChat || null;
    }

    if (!isDraftChat && activeRouteConversationId && chat.conversationId !== activeRouteConversationId) {
      return summaryChat || cachedActiveChat || null;
    }

    return chat;
  }, [activeConversationEntry, activeRouteConversationId, chat, currentUserId, isDraftChat]);
  const visibleConversationEntry = useMemo(
    () => getConversationEntryById(conversationGroups, activeChat?.conversationId),
    [activeChat?.conversationId, conversationGroups]
  );
  const groupedMessages = useMemo(() => activeChat?.messages || [], [activeChat?.messages]);
  const sidebarThreads = useMemo(() => flattenSidebarThreads(conversationGroups), [conversationGroups]);
  const conversationId = activeChat?.conversationId || activeRouteConversationId || null;
  const selectedConversationId = activeRouteConversationId || activeChat?.conversationId || null;
  const messageCount = groupedMessages.length;
  const filteredSidebarThreads = useMemo(() => {
    const query = deferredSidebarQuery.trim().toLowerCase();
    const threads = sortThreadsByRecentActivity(sidebarThreads);

    if (!query) return threads;
    return threads.filter((thread) =>
      [
        getDisplayName(thread.participant?.first_name, thread.participant?.last_name),
        thread.participant?.email || "",
        thread.listing.title,
        getRequirementLabel(thread.requirement),
        getMessagePreview(thread.lastMessage),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [deferredSidebarQuery, sidebarThreads]);
  const handleSidebarScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      rememberSidebarScrollFromContainer(target);
      const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (distanceFromBottom <= CHAT_SIDEBAR_LOAD_THRESHOLD_PX) {
        void loadMoreConversationGroups();
      }
    },
    [loadMoreConversationGroups, rememberSidebarScrollFromContainer]
  );
  const handleThreadFilterChange = useCallback(
    (filter: ThreadFilterId) => {
      if (filter === threadFilterRef.current) {
        return;
      }

      saveSidebarScrollPosition();
      threadFilterRef.current = filter;
      setThreadFilter(filter);
      updateConversationPagination({ hasMore: true, nextCursor: null, isLoadingMore: false });
      void refreshConversationGroups(filter, { replace: true }).catch(() => undefined);
    },
    [refreshConversationGroups, saveSidebarScrollPosition, updateConversationPagination]
  );

  useEffect(() => {
    const hasActiveSidebarFilter = Boolean(deferredSidebarQuery.trim()) || threadFilter !== "recent";
    if (!hasActiveSidebarFilter || !conversationHasMore || conversationLoadingMore || filteredSidebarThreads.length >= CHAT_CONVERSATION_PAGE_SIZE) {
      return;
    }

    void loadMoreConversationGroups();
  }, [conversationHasMore, conversationLoadingMore, deferredSidebarQuery, filteredSidebarThreads.length, loadMoreConversationGroups, threadFilter]);

  useLayoutEffect(() => {
    if (!conversationId || loading || pageLoading) return;
    const changed = renderedConversationRef.current !== conversationId;
    renderedConversationRef.current = conversationId;
    activeConversationRef.current = conversationId;
    if (changed) {
      const restoredScroll = restoreVisibleScrollPosition(conversationId);
      shouldAutoScrollRef.current = false;
      shouldResumePinnedRef.current = !restoredScroll;
      return;
    }
    if (!changed && !shouldAutoScrollRef.current) return;
    pinMessagesToBottom();
  }, [conversationId, loading, messageCount, pageLoading, pinMessagesToBottom, restoreVisibleScrollPosition]);

  useLayoutEffect(() => {
    if (!sidebarScrollRestorePendingRef.current) {
      return;
    }

    restoreSidebarScrollPosition();
    scheduleSidebarScrollRestore();
    sidebarScrollRestorePendingRef.current = false;
  }, [conversationId, restoreSidebarScrollPosition, scheduleSidebarScrollRestore]);

  useEffect(() => {
    setMobileThreadsOpen(false);
    setOlderMessagesLoadingState(false);
  }, [conversationId, setOlderMessagesLoadingState]);

  useEffect(() => {
    const activeThread = visibleConversationEntry?.conversation;
    if (!conversationId || pageLoading || !isDocumentVisible || !activeThread?.hasUnread) {
      return;
    }

    const readAt = activeThread.lastActivityAt || new Date().toISOString();
    const readUntilSequence = activeThread.lastMessage?.message_sequence ?? activeThread.lastMessageSequence ?? null;
    patchConversationTabCounts((counts) => ({
      ...counts,
      unread: counts.unread - 1,
    }));
    setConversationGroups((currentGroups) => {
      const nextGroups = filterConversationGroupsForTab(
        currentGroups.map((group) => ({
          ...group,
          conversations: group.conversations.map((thread) =>
            thread.conversationId === conversationId
              ? {
                  ...thread,
                  hasUnread: false,
                  unreadCount: 0,
                  lastReadAt: readAt,
                  lastReadSequence: readUntilSequence ?? thread.lastReadSequence ?? null,
                }
              : thread
          ),
        })),
        threadFilterRef.current
      );
      conversationGroupsRef.current = nextGroups;
      rememberBrokerConversationGroups(nextGroups, conversationTabCountsRef.current, threadFilterRef.current);
      return nextGroups;
    });

    void apiFetch(`/api/chat/conversations/${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify({
        action: "mark_read",
        readUntilSequence,
        readAt,
      }),
    })
      .catch(() => {
        void loadChat({ force: true });
      });
  }, [conversationId, isDocumentVisible, loadChat, pageLoading, patchConversationTabCounts, visibleConversationEntry?.conversation]);

  useEffect(() => {
    if (!mobileThreadsOpen && !mobileDetailsOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileThreadsOpen(false);
      setMobileDetailsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileDetailsOpen, mobileThreadsOpen]);

  if (loading || !user) {
    return <LoadingScreen label="Loading listing chat..." />;
  }

  if ((pageLoading && !chat && !activeChat) || !activeChat) {
    return <ListingChatLoadingShell />;
  }

  const activeParticipantName = getDisplayName(activeChat.participant?.first_name, activeChat.participant?.last_name);
  const activeParticipantAvatarSrc = activeChat.participant?.profile_photo || null;
  const canViewListing = activeChat.listing.isAvailable && (activeChat.listing.isOwner || (activeChat.listing.is_visible && activeChat.listing.isActive));
  const listingHref = activeChat.listing.isOwner ? `/dashboard/listings/${activeChat.listing.id}` : `/listings/${activeChat.listing.id}`;
  const messagingDisabledNotice =
    !activeChat.listing.isAvailable || !activeChat.listing.isActive || !activeChat.listing.is_visible
      ? "This listing is no longer active. Messaging is disabled."
      : "This conversation is read-only.";
  const activeConversationThread = visibleConversationEntry?.conversation || activeConversationEntry?.conversation || null;
  const activeRequirement = linkedRequirement || activeConversationThread?.requirement || null;
  const activeRequirementMatch = activeConversationThread?.requirementMatch || null;
  const activeChatTypeLabel = getChatTypeLabel(activeConversationThread);
  const activeChatTypeShortLabel = getChatTypeLabel(activeConversationThread, "short");
  const isRequirementMatchConversation = Boolean(activeChatTypeLabel);
  const activeListingSummary = listingGroup?.listing || null;
  const activeListingContext = listingDetail || activeListingSummary;
  const matchedListingArea = activeListingContext?.area?.name || activeRequirementMatch?.listing?.area?.name || null;
  const matchedListingCity = activeListingContext?.area?.city || activeRequirementMatch?.listing?.area?.city || null;
  const matchedListingPrice =
    typeof activeListingContext?.price === "number" && Number.isFinite(activeListingContext.price)
      ? activeListingContext.price
      : typeof activeRequirementMatch?.listing?.price === "number" && Number.isFinite(activeRequirementMatch.listing.price)
        ? activeRequirementMatch.listing.price
        : null;
  const matchedListingPropertyType = activeListingContext?.property_type || activeRequirementMatch?.listing?.property_type || null;
  const matchedListingBedrooms =
    activeListingContext?.bedrooms !== null && activeListingContext?.bedrooms !== undefined
      ? activeListingContext.bedrooms
      : activeRequirementMatch?.listing?.bedrooms;
  const matchedListingStatus = activeListingContext?.status || activeRequirementMatch?.listing?.status || activeChat.listing.status;
  const listingTitle = activeListingContext?.title || activeRequirementMatch?.listing?.title || activeChat.listing.title || "Matched listing unavailable";
  const listingAreaLabel = matchedListingArea || "Area pending";
  const listingLocationLabel = [matchedListingArea, matchedListingCity].filter(Boolean).join(", ") || listingAreaLabel;
  const listingPriceLabel = matchedListingPrice !== null ? formatCurrency(matchedListingPrice) : "Price on request";
  const listingDealTypeLabel = activeListingContext?.deal_type ? formatDealType(activeListingContext.deal_type) : formatListingStatus(matchedListingStatus);
  const listingPropertyTypeLabel = matchedListingPropertyType ? formatPropertyType(matchedListingPropertyType) : null;
  const listingBedsLabel =
    matchedListingBedrooms !== null && matchedListingBedrooms !== undefined
      ? `${matchedListingBedrooms} Bed${matchedListingBedrooms === 1 ? "" : "s"}`
      : null;
  const listingSqftLabel = activeListingContext?.size_sqft ? `${formatNumber(activeListingContext.size_sqft)} Sq Ft` : null;
  const listingPostedLabel = formatRelativeTime(activeListingContext?.created_at || activeRequirement?.created_at || groupedMessages[0]?.created_at);
  const listingImage = getListingImage(listingDetail, listingGroup);
  const listingDetailBrokerCount =
    typeof listingDetail?.brokers_engaged_count === "number" && Number.isFinite(listingDetail.brokers_engaged_count)
      ? listingDetail.brokers_engaged_count
      : null;
  const selectedListingBrokerCount = Math.max(
    listingDetailBrokerCount ?? 0,
    getUniqueBrokerChatCountForListing(listingGroup, activeListingContext?.created_by || (listingGroup?.listing.isOwner ? currentUserId : null))
  );
  const detailOwnerName = getDisplayName(activeListingContext?.owner?.first_name, activeListingContext?.owner?.last_name, activeParticipantName);
  const participantEmail = activeChat.participant?.email || activeListingContext?.owner?.email || null;
  const brokerPhone = activeListingContext?.owner?.phone || null;
  const brokerCallHref = brokerPhone ? formatPhoneHref(brokerPhone) : null;
  const brokerWhatsappHref = brokerPhone ? getWhatsappLink(brokerPhone, `Hi ${detailOwnerName}, I am reaching out about ${listingTitle}.`) : null;
  const participantMailtoHref = participantEmail
    ? getMailtoLink(participantEmail, `${isRequirementMatchConversation ? "Requirement match" : "Listing chat"} for ${listingTitle}`, `Hi ${activeParticipantName},`)
    : null;
  const requirementDetailSummary = activeRequirement
    ? [getRequirementBedroomsLabel(activeRequirement.bedrooms)].filter(Boolean).join(" - ")
    : null;
  const requirementItems: ContextDetailItem[] = activeRequirement
    ? [
        { icon: <AutoAwesomeRounded className="!h-4 !w-4" />, value: getRequirementBudgetLabel(activeRequirement) },
        { icon: <PlaceRounded className="!h-4 !w-4" />, value: activeRequirement.area || "Requirement area pending" },
        { icon: <HomeWorkOutlined className="!h-4 !w-4" />, value: formatPropertyType(activeRequirement.property_type) },
        { icon: <BedRounded className="!h-4 !w-4" />, value: requirementDetailSummary || "Bedrooms pending" },
      ]
    : [];
  const contextSections: ContextDetailSection[] = isRequirementMatchConversation
    ? [
        {
          title: "Requirement Details",
          subtitle: activeRequirement ? getRequirementLabel(activeRequirement) : null,
          emptyText: "Requirement details are unavailable.",
          items: requirementItems,
        },
      ]
    : [];
  const sidebarEmptyLabel =
    threadFilter === "unread"
      ? "No unread conversations right now."
      : deferredSidebarQuery
        ? "No conversations match this search."
        : "No broker conversations found.";
  const signalItems: ChatSignalItem[] = [
    {
      icon: <ChatBubbleOutlineRounded className="!h-4 !w-4" />,
      label: `${selectedListingBrokerCount} broker conversation${selectedListingBrokerCount === 1 ? "" : "s"}`,
      tone: "bg-[#eef4ff] text-[#173972]",
    },
    {
      icon: <AutoAwesomeRounded className="!h-4 !w-4" />,
      label: activeRequirement ? `${activeRequirement.urgency} priority requirement match` : `${messageCount} message${messageCount === 1 ? "" : "s"} exchanged`,
      tone: "bg-[#fff5de] text-[#b27d13]",
    },
    {
      icon: <AccessTimeRounded className="!h-4 !w-4" />,
      label: `Posted ${listingPostedLabel}`,
      tone: "bg-[#f3f5fa] text-[#5f6c85]",
    },
  ];
  const mobileThreadsPanelId = "chat-mobile-thread-list";
  const mobileDetailsPanelId = "chat-mobile-listing-details";
  const contextPanelLabel = isRequirementMatchConversation ? "Match Details" : "Listing Details";

  return (
    <AppShell
      hidePageHeader
      mainClassName="flex h-[calc(100dvh-5.2rem)] flex-col !max-w-[1520px] !px-0 !pb-0 !pt-0 lg:!px-8 xl:!px-10"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="w-full bg-[url('/assets/header_background.png')] bg-cover bg-top bg-no-repeat shadow-[0_14px_28px_rgba(31,47,82,0.06)]">
          <div className="mx-auto flex w-full max-w-[1540px] flex-nowrap items-center justify-between gap-3 px-4 py-2 sm:gap-4 sm:px-4 lg:px-6 xl:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <ChatBackButton />
              <h1 className="min-w-0 truncate pr-2 font-heading text-[1.45rem] font-semibold tracking-[-0.045em] text-brand-white sm:text-[1.7rem]">
                Chats
              </h1>
            </div>
            <Link
              href="/post-listing"
              className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[8px] bg-[linear-gradient(135deg,#E7BE57_0%,#D5A83A_54%,#BF8D1D_100%)] px-2.5 py-1.5 text-[12.5px] font-medium text-white shadow-[0_14px_28px_rgba(191,141,29,0.2)] transition hover:-translate-y-0.5 hover:brightness-[1.03] sm:px-3 sm:py-2 sm:text-[13px] md:px-3 md:py-2 md:text-[14px]"
            >
              + Add New Listing
            </Link>
          </div>
        </div>

        <section className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border border-[#dbe3ee] bg-white shadow-[0_22px_58px_rgba(31,47,82,0.1)]">
            <div className="flex h-full min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] lg:grid lg:grid-cols-[18.85rem_minmax(0,1fr)] lg:grid-rows-none">
              <aside className="hidden min-h-0 flex-col overflow-hidden lg:flex lg:border-r lg:border-[#e7edf5]">
                <ConversationSidebarContent
                  activeConversationId={selectedConversationId}
                  filteredSidebarThreads={filteredSidebarThreads}
                  isLoadingMore={conversationLoadingMore}
                  onSelectConversation={handleConversationSelect}
                  onSidebarQueryChange={setSidebarQuery}
                  onSidebarScroll={handleSidebarScroll}
                  onScrollContainerChange={handleSidebarScrollContainerChange}
                  onThreadFilterChange={handleThreadFilterChange}
                  sidebarEmptyLabel={sidebarEmptyLabel}
                  sidebarQuery={sidebarQuery}
                  tabCounts={conversationTabCounts}
                  threadFilter={threadFilter}
                />
              </aside>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="border-b border-[#e7edf5] bg-[#fafbfe] px-4 py-3 lg:hidden">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileThreadsOpen(true)}
                      aria-controls={mobileThreadsPanelId}
                      aria-expanded={mobileThreadsOpen}
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-[#dbe3ee] bg-white px-4 text-[13px] font-semibold text-[#24314c] shadow-[0_10px_20px_rgba(31,47,82,0.06)] transition hover:border-[#cfd8e6]"
                    >
                      <ChatBubbleOutlineRounded className="!h-[18px] !w-[18px] text-[#173972]" />
                      <span>Conversations</span>
                      <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-[#eef3ff] px-1.5 py-0.5 text-[11px] text-[#173972]">
                        {conversationTabCounts.all}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMobileDetailsOpen(true)}
                      aria-controls={mobileDetailsPanelId}
                      aria-expanded={mobileDetailsOpen}
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-[#dbe3ee] bg-white px-4 text-[13px] font-semibold text-[#24314c] shadow-[0_10px_20px_rgba(31,47,82,0.06)] transition hover:border-[#cfd8e6]"
                    >
                      <HomeWorkOutlined className="!h-[18px] !w-[18px] text-[#173972]" />
                      <span>{contextPanelLabel}</span>
                    </button>
                  </div>
                </div>

                <div className="border-b border-[#e7edf5] bg-white px-4 py-4 sm:px-5">
                  <div className="flex items-center justify-between gap-3 sm:gap-4 lg:flex-nowrap">
                    <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                      <div className="relative shrink-0">
                        <BrokerAvatar
                          src={activeParticipantAvatarSrc}
                          alt={getAvatarAlt(activeParticipantName)}
                          className="h-12 w-12 border border-[#e2e8f1] bg-[#edf2fa] shadow-[0_10px_22px_rgba(31,47,82,0.08)] sm:h-14 sm:w-14"
                        />
                        {/* <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#55b782]" /> */}
                      </div>

                      <div className="min-w-0 flex flex-1 flex-col">
                        <div className="flex min-w-0 items-center gap-2">
                          <h2 className="truncate text-[1rem] font-semibold tracking-[-0.03em] text-[#1f2940] sm:text-[1.05rem]">
                            {activeParticipantName}
                          </h2>
                          {activeChatTypeLabel ? (
                            <span
                              className={cn(
                                "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                                isRequirementMatchConversation
                                  ? "border-[#ead39a] bg-[#fff7e3] text-[#a97718]"
                                  : "border-[#d7e0ef] bg-[#eef3ff] text-[#173972]"
                              )}
                            >
                              <span className="lg:hidden">{activeChatTypeShortLabel}</span>
                              <span className="hidden lg:inline">{activeChatTypeLabel}</span>
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-[13px] text-[#6b7690] sm:text-[14px]">
                          {participantEmail || "Email unavailable"}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2">
                      {participantMailtoHref ? (
                        <a
                          href={participantMailtoHref}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dde4ef] bg-white text-[#50607f] shadow-[0_10px_22px_rgba(31,47,82,0.06)] transition hover:border-[#cfd8e6] hover:text-[#173972]"
                          aria-label={`Email ${activeParticipantName}`}
                        >
                          <MailOutlineRounded className="!h-[18px] !w-[18px]" />
                        </a>
                      ) : null}
                      {canViewListing ? (
                        <Link
                          href={listingHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dde4ef] bg-white text-[#50607f] shadow-[0_10px_22px_rgba(31,47,82,0.06)] transition hover:border-[#cfd8e6] hover:text-[#173972]"
                          aria-label="Open listing in new tab"
                        >
                          <NorthEastRounded className="!h-[18px] !w-[18px]" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:grid xl:grid-cols-[minmax(0,1fr)_19rem]">
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <div className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),linear-gradient(180deg,#fbfcff_0%,#f6f8fc_100%)]">
                      <div
                        ref={messagesContainerRef}
                        onScroll={handleMessagesScroll}
                        className="h-full min-h-0 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 sm:py-5"
                      >
                        {groupedMessages.length ? (
                          <div className="space-y-4">
                            {olderMessagesLoading ? (
                              <div className="text-center text-[12px] font-medium text-[#7f8aa1]">Loading more...</div>
                            ) : null}
                            {groupedMessages.map((entry) => {
                              const isOwnMessage = entry.sender_id === currentUserId || entry.sender?.id === currentUserId;
                              const senderName = isOwnMessage ? "You" : getDisplayName(entry.sender?.first_name, entry.sender?.last_name);

                              return (
                                <div key={entry.clientTempId || entry.id} className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")}>
                                  <div className={cn("flex max-w-[96%] gap-2.5 sm:max-w-[78%] sm:gap-3", isOwnMessage ? "flex-row-reverse" : "items-start")}>
                                    {!isOwnMessage ? (
                                      <BrokerAvatar
                                        src={entry.sender?.profile_photo}
                                        alt={getAvatarAlt(senderName)}
                                        className="h-9 w-9 shrink-0 self-start border border-white bg-[#edf2fa] shadow-[0_8px_18px_rgba(31,47,82,0.08)] sm:h-10 sm:w-10"
                                      />
                                    ) : null}

                                    <div className={cn("flex flex-col", isOwnMessage ? "items-end" : "items-start")}>
                                      {!isOwnMessage ? (
                                        <p className="mb-1.5 px-1 text-[12px] font-semibold tracking-[-0.01em] text-[#5f6c85]">{senderName}</p>
                                      ) : null}

                                      <div
                                        className={cn(
                                          "max-w-full rounded-[18px] px-4 py-3 shadow-[0_12px_24px_rgba(31,47,82,0.08)]",
                                          isOwnMessage
                                            ? "rounded-br-[8px] bg-[linear-gradient(135deg,#173972_0%,#0F2A5F_58%,#0C214B_100%)] text-white shadow-[0_18px_30px_rgba(15,42,95,0.18)]"
                                            : "rounded-bl-[8px] border border-[#e1e7f0] bg-white text-[#24314c]"
                                        )}
                                      >
                                        <p className="whitespace-pre-wrap text-[14px] leading-[1.55] sm:text-[15px] sm:leading-6">{entry.content}</p>
                                      </div>
                                      <p className={cn("mt-2 text-[10px]", isOwnMessage ? "mr-2 text-white/72" : "ml-2 text-[#8691a8]")}>
                                        {formatClockTime(entry.created_at)}
                                      </p>
                                      {isOwnMessage && entry.deliveryState === "failed" ? (
                                        <div className="mr-2 mt-1.5 flex items-center gap-2 text-[11px] text-[#d45b35]">
                                          <span>{entry.errorMessage || "Failed to send"}</span>
                                          <button
                                            type="button"
                                            onClick={() => handleRetryMessage(entry.id)}
                                            className="font-semibold text-[#173972] transition hover:underline"
                                          >
                                            Retry
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex h-full min-h-[16rem] items-center justify-center sm:min-h-[18rem]">
                            <div className="max-w-md rounded-[22px] border border-[#dde4ee] bg-white/95 px-5 py-7 text-center shadow-[0_14px_28px_rgba(31,47,82,0.08)] sm:px-6 sm:py-8">
                              <p className="text-[1rem] font-semibold tracking-[-0.02em] text-[#24314c]">No messages yet</p>
                              <p className="mt-2 text-[14px] leading-6 text-[#77839a]">Start the conversation for this listing.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {activeChat.listing.canPost ? (
                      <form onSubmit={handleSubmit} className="border-t border-[#e7edf5] bg-white px-3 py-3 sm:px-4 md:px-5 lg:px-5">
                        <div className="flex items-center gap-2 rounded-[16px] border border-[#dbe3ee] bg-white px-3 py-2 shadow-[0_12px_24px_rgba(31,47,82,0.06)] sm:gap-3 lg:rounded-[16px] lg:px-3 lg:py-2">
                          <input
                            type="text"
                            value={message}
                            onChange={(event) => setMessageDraft(event.target.value)}
                            placeholder={`Type a message to ${activeParticipantName}...`}
                            className="h-10 min-w-0 w-full flex-1 bg-transparent text-[15px] text-[#24314c] outline-none placeholder:text-[#98a2b6] sm:h-11"
                          />

                          <button
                            type="submit"
                            disabled={!message.trim()}
                            aria-label="Send message"
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#173972_0%,#0F2A5F_58%,#0C214B_100%)] text-white shadow-[0_14px_28px_rgba(15,42,95,0.18)] transition hover:-translate-y-0.5 hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-55 sm:h-11 sm:w-11 lg:h-11 lg:w-auto lg:gap-2 lg:rounded-[12px] lg:px-4"
                          >
                            <SendRounded className="!h-[18px] !w-[18px]" />
                            <span className="sr-only lg:not-sr-only">Send</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="border-t border-[#e7edf5] bg-[#fbfcff] px-4 py-4 text-sm text-[#6b7690] sm:px-5">{messagingDisabledNotice}</div>
                    )}
                  </div>

                  <aside className="hidden min-h-0 overflow-hidden border-t border-[#e7edf5] bg-[#fbfcfe] lg:block xl:border-l xl:border-t-0">
                    <ListingDetailsPanel
                      brokerCallHref={brokerCallHref}
                      brokerWhatsappHref={brokerWhatsappHref}
                      listingBedsLabel={listingBedsLabel}
                      listingDealTypeLabel={listingDealTypeLabel}
                      listingDetailLoading={isRequirementMatchConversation ? false : listingDetailLoading}
                      listingImage={listingImage}
                      listingLocationLabel={listingLocationLabel}
                      listingPriceLabel={listingPriceLabel}
                      listingPropertyTypeLabel={listingPropertyTypeLabel}
                      listingSqftLabel={listingSqftLabel}
                      listingTitle={listingTitle}
                      signalItems={signalItems}
                      contextSections={contextSections}
                    />
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className={cn("fixed inset-0 z-[70] lg:hidden", mobileThreadsOpen ? "pointer-events-auto" : "pointer-events-none")}>
          <button
            type="button"
            aria-label="Close conversation list"
            onClick={() => setMobileThreadsOpen(false)}
            className={cn("absolute inset-0 bg-[#10203c]/45 transition-opacity duration-200", mobileThreadsOpen ? "opacity-100" : "opacity-0")}
          />
          <div
            id={mobileThreadsPanelId}
            role="dialog"
            aria-modal="true"
            aria-label="Conversation list"
            className={cn(
              "relative flex h-full w-full max-w-sm flex-col overflow-hidden border-r border-[#e7edf5] bg-white shadow-[0_22px_58px_rgba(31,47,82,0.18)] transition-transform duration-300 ease-out",
              mobileThreadsOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <div className="flex items-center justify-between border-b border-[#e7edf5] bg-white px-4 py-4">
              <div className="min-w-0 pr-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d97ab]">Chat Inbox</p>
                <p className="truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-[#1f2940]">
                  {conversationTabCounts.all} conversation{conversationTabCounts.all === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileThreadsOpen(false)}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#dde4ef] px-3 text-[13px] font-semibold text-[#50607f] transition hover:border-[#cfd8e6] hover:text-[#173972]"
              >
                Close
              </button>
            </div>

            <ConversationSidebarContent
              activeConversationId={selectedConversationId}
              filteredSidebarThreads={filteredSidebarThreads}
              isLoadingMore={conversationLoadingMore}
              onSelectConversation={handleConversationSelect}
              onSidebarQueryChange={setSidebarQuery}
              onSidebarScroll={handleSidebarScroll}
              onScrollContainerChange={handleMobileSidebarScrollContainerChange}
              onThreadFilterChange={handleThreadFilterChange}
              sidebarEmptyLabel={sidebarEmptyLabel}
              sidebarQuery={sidebarQuery}
              tabCounts={conversationTabCounts}
              threadFilter={threadFilter}
            />
          </div>
        </div>

        <div className={cn("fixed inset-0 z-[70] lg:hidden", mobileDetailsOpen ? "pointer-events-auto" : "pointer-events-none")}>
          <button
            type="button"
            aria-label="Close listing details"
            onClick={() => setMobileDetailsOpen(false)}
            className={cn("absolute inset-0 bg-[#10203c]/45 transition-opacity duration-200", mobileDetailsOpen ? "opacity-100" : "opacity-0")}
          />
          <div
            id={mobileDetailsPanelId}
            role="dialog"
            aria-modal="true"
            aria-label="Listing details"
            className={cn(
              "absolute inset-x-0 bottom-0 flex max-h-[82dvh] flex-col overflow-hidden rounded-t-[28px] bg-[#fbfcfe] shadow-[0_-22px_58px_rgba(31,47,82,0.18)] transition-transform duration-300 ease-out",
              mobileDetailsOpen ? "translate-y-0" : "translate-y-full"
            )}
          >
            <div className="flex items-center justify-between border-b border-[#e7edf5] bg-white px-4 py-4">
              <div className="min-w-0 pr-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d97ab]">
                  {contextPanelLabel}
                </p>
                <p className="truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-[#1f2940]">{listingTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileDetailsOpen(false)}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#dde4ef] px-3 text-[13px] font-semibold text-[#50607f] transition hover:border-[#cfd8e6] hover:text-[#173972]"
              >
                Close
              </button>
            </div>

            <ListingDetailsPanel
              brokerCallHref={brokerCallHref}
              brokerWhatsappHref={brokerWhatsappHref}
              listingBedsLabel={listingBedsLabel}
              listingDealTypeLabel={listingDealTypeLabel}
              listingDetailLoading={isRequirementMatchConversation ? false : listingDetailLoading}
              listingImage={listingImage}
              listingLocationLabel={listingLocationLabel}
              listingPriceLabel={listingPriceLabel}
              listingPropertyTypeLabel={listingPropertyTypeLabel}
              listingSqftLabel={listingSqftLabel}
              listingTitle={listingTitle}
              signalItems={signalItems}
              className="flex-1"
              contextSections={contextSections}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
