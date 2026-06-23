"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AdminBlankState, AdminStatusBadge } from "@/app/admin/_components/AdminPanelUi";
import { BrokerAvatar } from "@/components/BrokerAvatar";
import { apiFetch } from "@/lib/deal-api";
import type { AdminChatGroup, AdminChatMessageCursor, AdminChatMessagesPage, ChatMessage } from "@/lib/deal-types";
import { cn, formatCurrency, formatDateTime, formatListingDisplayStatus, getMailtoLink } from "@/lib/deal-utils";

type AdminChatConversation = AdminChatGroup["conversations"][number];
type AdminChatFilterId = "recent" | "unread" | "all";
type AdminChatMobilePane = "listings" | "conversations" | "messages";

type AdminChatWorkspaceProps = {
  chatGroups: AdminChatGroup[];
  selectedListingId: string | null;
  selectedConversationId: string | null;
  hasMoreChatGroups?: boolean;
  isLoadingChatGroups?: boolean;
  stateResetKey?: string | number | null;
  totalConversationCount?: number;
  onLoadMoreChatGroups?: () => void;
  onSelectListing: (listingId: string, conversationId: string | null) => void;
  onSelectConversation: (conversationId: string) => void;
  getListingDetailHref: (listingId: string) => string;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const ADMIN_CHAT_MESSAGE_PAGE_SIZE = 30;
const clockFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const shortDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const CHAT_FILTERS: Array<{ id: AdminChatFilterId; label: string }> = [
  { id: "recent", label: "Recent" },
  { id: "unread", label: "Unread" },
  { id: "all", label: "All" },
];

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="m20 20-4.4-4.4M18 10.8a7.2 7.2 0 1 1-14.4 0 7.2 7.2 0 0 1 14.4 0Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5.5 7.5h13v9h-13v-9ZM6.2 8.2l5.8 4.9 5.8-4.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ListingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 18.5V9.8L12 4l7 5.8v8.7H5ZM9 18.5v-5h6v5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getAdminChatName(firstName?: string | null, lastName?: string | null, fallback = "Broker") {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || fallback;
}

function getAvatarAlt(name?: string | null, fallback = "Broker") {
  return `${name?.trim() || fallback} profile photo`;
}

function getListingImage(listing: AdminChatGroup["listing"]) {
  const images = listing.listing_images || [];
  return images.find((image) => image.is_cover) || images[0] || null;
}

function getListingLocation(listing: AdminChatGroup["listing"]) {
  return [listing.area?.name, listing.area?.city].filter(Boolean).join(", ") || "Location pending";
}

function getConversationLastMessage(conversation: AdminChatConversation) {
  return conversation.lastMessage || conversation.messages[conversation.messages.length - 1] || null;
}

function getMessagePreview(message?: ChatMessage | null) {
  return String(message?.content || "").replace(/\s+/g, " ").trim() || "No messages yet";
}

function getGroupLatestActivity(group: AdminChatGroup) {
  return group.conversations.reduce<string | null>((latestValue, conversation) => {
    const activity = conversation.lastMessageAt || getConversationLastMessage(conversation)?.created_at || null;
    if (!activity) return latestValue;
    return !latestValue || activity.localeCompare(latestValue) > 0 ? activity : latestValue;
  }, null);
}

function getGroupUnreadCount(group: AdminChatGroup) {
  return group.conversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0);
}

function getBrokerParticipant(conversation: AdminChatConversation) {
  return conversation.broker || conversation.owner;
}

function uniqueConversations(conversations: AdminChatConversation[]) {
  const seen = new Set<string>();
  return conversations.filter((conversation) => {
    if (seen.has(conversation.conversationId)) {
      return false;
    }

    seen.add(conversation.conversationId);
    return true;
  });
}

type AdminConversationMessagesState = {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor: AdminChatMessageCursor | null;
  loading: boolean;
  loaded: boolean;
};

function compareChatMessages(left: ChatMessage, right: ChatMessage) {
  const leftSequence = typeof left.message_sequence === "number" ? left.message_sequence : null;
  const rightSequence = typeof right.message_sequence === "number" ? right.message_sequence : null;

  if (leftSequence !== null && rightSequence !== null && leftSequence !== rightSequence) {
    return leftSequence - rightSequence;
  }

  return left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id);
}

function mergeChatMessages(currentMessages: ChatMessage[], incomingMessages: ChatMessage[]) {
  const messageMap = new Map<string, ChatMessage>();
  currentMessages.forEach((message) => messageMap.set(message.id, message));
  incomingMessages.forEach((message) => messageMap.set(message.id, message));
  return Array.from(messageMap.values()).sort(compareChatMessages);
}

function buildAdminChatMessagesRequestPath(conversationId: string, cursor: AdminChatMessageCursor | null) {
  const params = new URLSearchParams({
    limit: String(ADMIN_CHAT_MESSAGE_PAGE_SIZE),
  });

  if (cursor) {
    params.set("cursor", JSON.stringify(cursor));
  }

  return `/api/admin/chats/${conversationId}/messages?${params.toString()}`;
}

function formatThreadTime(value: string | null | undefined) {
  if (!value) return "No activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity";

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (now.toDateString() === date.toDateString()) return clockFormatter.format(date);
  if (diff < 7 * DAY_IN_MS) return weekdayFormatter.format(date);
  return shortDateFormatter.format(date);
}

function ChatSearchField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block w-full min-w-0">
      <span className="sr-only">{label}</span>
      <span className="relative block w-full min-w-0">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b96ab] sm:h-[18px] sm:w-[18px]" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-10 w-full min-w-0 max-w-full rounded-[12px] border border-[#dfe5ef] bg-white pl-9 pr-3 text-[13px] text-[#1f2940] outline-none transition placeholder:text-[#9aa3b6] focus:border-[#cbb05c] focus:shadow-[0_0_0_4px_rgba(212,175,55,0.14)] sm:h-11 sm:rounded-[14px] sm:pl-10 sm:pr-4 sm:text-[14px]"
        />
      </span>
    </label>
  );
}

function ChatFilterTabs({
  activeFilter,
  onChange,
}: {
  activeFilter: AdminChatFilterId;
  onChange: (filter: AdminChatFilterId) => void;
}) {
  return (
    <div className="flex w-full min-w-0 items-center gap-1 rounded-[13px] bg-[#f2f5fa] p-1">
      {CHAT_FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          className={cn(
            "min-w-0 flex-1 rounded-[10px] px-2 py-1.5 text-[12px] font-medium transition sm:px-3 sm:py-2 sm:text-[13px]",
            activeFilter === filter.id ? "bg-white text-[#1f2940] shadow-[0_8px_18px_rgba(31,47,82,0.08)]" : "text-[#7b879d] hover:text-[#25314c]"
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

export function AdminChatWorkspace({
  chatGroups,
  selectedListingId,
  selectedConversationId,
  hasMoreChatGroups = false,
  isLoadingChatGroups = false,
  stateResetKey,
  totalConversationCount,
  onLoadMoreChatGroups,
  onSelectListing,
  onSelectConversation,
  getListingDetailHref,
}: AdminChatWorkspaceProps) {
  const [listingQuery, setListingQuery] = useState("");
  const [conversationQuery, setConversationQuery] = useState("");
  const [listingFilter, setListingFilter] = useState<AdminChatFilterId>("recent");
  const [conversationFilter, setConversationFilter] = useState<AdminChatFilterId>("recent");
  const [mobilePane, setMobilePane] = useState<AdminChatMobilePane>("listings");
  const [messagesByConversationId, setMessagesByConversationId] = useState<Record<string, AdminConversationMessagesState>>({});
  const listingListRef = useRef<HTMLDivElement | null>(null);
  const listingListSentinelRef = useRef<HTMLDivElement | null>(null);
  const conversationListRef = useRef<HTMLDivElement | null>(null);
  const conversationListSentinelRef = useRef<HTMLDivElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const messageListSentinelRef = useRef<HTMLDivElement | null>(null);
  const messagesByConversationIdRef = useRef(messagesByConversationId);
  const loadingMessageConversationIdsRef = useRef(new Set<string>());
  const latestMessageRequestIdByConversationRef = useRef(new Map<string, number>());
  const deferredListingQuery = useDeferredValue(listingQuery);
  const deferredConversationQuery = useDeferredValue(conversationQuery);
  const loadedConversationCount = useMemo(
    () => chatGroups.reduce((sum, group) => sum + group.conversations.length, 0),
    [chatGroups]
  );
  const displayConversationCount = totalConversationCount ?? loadedConversationCount;
  const totalUnreadCount = useMemo(() => chatGroups.reduce((sum, group) => sum + getGroupUnreadCount(group), 0), [chatGroups]);

  const selectedListingChat = useMemo(
    () => chatGroups.find((group) => group.listing.id === selectedListingId) || chatGroups[0] || null,
    [chatGroups, selectedListingId]
  );
  const selectedListingConversations = useMemo(
    () => uniqueConversations(selectedListingChat?.conversations || []),
    [selectedListingChat]
  );
  const selectedConversation = useMemo(
    () =>
      selectedListingConversations.find((conversation) => conversation.conversationId === selectedConversationId) ||
      selectedListingConversations[0] ||
      null,
    [selectedConversationId, selectedListingConversations]
  );

  const filteredListingGroups = useMemo(() => {
    const query = deferredListingQuery.trim().toLowerCase();
    let groups = [...chatGroups];

    if (listingFilter === "unread") {
      groups = groups.filter((group) => getGroupUnreadCount(group) > 0);
    }

    if (query) {
      groups = groups.filter((group) =>
        [
          group.listing.title,
          getListingLocation(group.listing),
          group.listing.status,
          formatCurrency(group.listing.price),
          getMessagePreview(group.conversations[0]?.lastMessage),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    if (listingFilter === "all") {
      return groups.sort((left, right) => left.listing.title.localeCompare(right.listing.title));
    }

    return groups.sort((left, right) => (getGroupLatestActivity(right) || "").localeCompare(getGroupLatestActivity(left) || ""));
  }, [chatGroups, deferredListingQuery, listingFilter]);

  const filteredConversations = useMemo(() => {
    const query = deferredConversationQuery.trim().toLowerCase();
    let conversations = [...selectedListingConversations];

    if (conversationFilter === "unread") {
      conversations = conversations.filter((conversation) => conversation.unreadCount > 0);
    }

    if (query) {
      conversations = conversations.filter((conversation) => {
        const broker = getBrokerParticipant(conversation);
        const owner = conversation.owner;

        return [
          getAdminChatName(broker?.first_name, broker?.last_name, broker?.email || "Broker"),
          broker?.email || "",
          getAdminChatName(owner?.first_name, owner?.last_name, owner?.email || "Listing broker"),
          owner?.email || "",
          getMessagePreview(getConversationLastMessage(conversation)),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
    }

    if (conversationFilter === "all") {
      return conversations.sort((left, right) => {
        const leftBroker = getBrokerParticipant(left);
        const rightBroker = getBrokerParticipant(right);
        return getAdminChatName(leftBroker?.first_name, leftBroker?.last_name, leftBroker?.email || "Broker").localeCompare(
          getAdminChatName(rightBroker?.first_name, rightBroker?.last_name, rightBroker?.email || "Broker")
        );
      });
    }

    return conversations.sort((left, right) => (right.lastMessageAt || "").localeCompare(left.lastMessageAt || ""));
  }, [conversationFilter, deferredConversationQuery, selectedListingConversations]);

  const detailBroker = selectedConversation ? getBrokerParticipant(selectedConversation) : null;
  const detailBrokerName = getAdminChatName(detailBroker?.first_name, detailBroker?.last_name, detailBroker?.email || "Broker");
  const detailOwnerName = getAdminChatName(
    selectedConversation?.owner?.first_name,
    selectedConversation?.owner?.last_name,
    selectedConversation?.owner?.email || "Listing broker"
  );
  const brokerMailHref =
    selectedListingChat && detailBroker?.email
      ? getMailtoLink(detailBroker.email, `Listing conversation for ${selectedListingChat.listing.title}`, `Hi ${detailBrokerName},`)
      : null;
  const selectedConversationMessageState = selectedConversation ? messagesByConversationId[selectedConversation.conversationId] : null;
  const selectedConversationMessages = selectedConversationMessageState?.messages || selectedConversation?.messages || [];
  const selectedConversationMessagesLoading = selectedConversation
    ? selectedConversationMessageState?.loading || !selectedConversationMessageState?.loaded
    : false;

  useEffect(() => {
    messagesByConversationIdRef.current = messagesByConversationId;
  }, [messagesByConversationId]);

  useEffect(() => {
    setListingQuery("");
    setConversationQuery("");
    setListingFilter("recent");
    setConversationFilter("recent");
    setMobilePane("listings");
    setMessagesByConversationId({});
    messagesByConversationIdRef.current = {};
    loadingMessageConversationIdsRef.current.clear();
    latestMessageRequestIdByConversationRef.current.clear();
  }, [stateResetKey]);

  const loadConversationMessages = useCallback(async (conversationId: string, { reset = false }: { reset?: boolean } = {}) => {
    const currentState = messagesByConversationIdRef.current[conversationId];

    if (loadingMessageConversationIdsRef.current.has(conversationId)) {
      return;
    }

    if (!reset && currentState?.loaded && !currentState.hasMore) {
      return;
    }

    const requestId = (latestMessageRequestIdByConversationRef.current.get(conversationId) || 0) + 1;
    latestMessageRequestIdByConversationRef.current.set(conversationId, requestId);
    loadingMessageConversationIdsRef.current.add(conversationId);

    setMessagesByConversationId((current) => {
      const existing = current[conversationId];

      return {
        ...current,
        [conversationId]: {
          messages: reset ? [] : existing?.messages || [],
          hasMore: reset ? false : existing?.hasMore || false,
          nextCursor: reset ? null : existing?.nextCursor || null,
          loaded: existing?.loaded || false,
          loading: true,
        },
      };
    });

    try {
      const cursor = reset ? null : currentState?.nextCursor || null;
      const payload = await apiFetch<AdminChatMessagesPage>(buildAdminChatMessagesRequestPath(conversationId, cursor));

      if (latestMessageRequestIdByConversationRef.current.get(conversationId) !== requestId) {
        return;
      }

      setMessagesByConversationId((current) => {
        const existing = current[conversationId];
        const existingMessages = reset ? [] : existing?.messages || [];

        return {
          ...current,
          [conversationId]: {
            messages: mergeChatMessages(existingMessages, payload.messages),
            hasMore: payload.hasMore,
            nextCursor: payload.nextCursor,
            loaded: true,
            loading: false,
          },
        };
      });
    } catch {
      if (latestMessageRequestIdByConversationRef.current.get(conversationId) === requestId) {
        setMessagesByConversationId((current) => {
          const existing = current[conversationId];

          return {
            ...current,
            [conversationId]: {
              messages: existing?.messages || [],
              hasMore: existing?.hasMore || false,
              nextCursor: existing?.nextCursor || null,
              loaded: true,
              loading: false,
            },
          };
        });
      }
    } finally {
      loadingMessageConversationIdsRef.current.delete(conversationId);
    }
  }, []);

  useEffect(() => {
    if (!selectedListingChat) {
      if (mobilePane !== "listings") {
        setMobilePane("listings");
      }
      return;
    }

    if (!selectedConversation && mobilePane === "messages") {
      setMobilePane("conversations");
    }
  }, [mobilePane, selectedConversation, selectedListingChat]);

  useEffect(() => {
    if (!onLoadMoreChatGroups || !hasMoreChatGroups || isLoadingChatGroups) {
      return;
    }

    const rootsAndTargets = [
      { root: listingListRef.current, target: listingListSentinelRef.current },
      { root: conversationListRef.current, target: conversationListSentinelRef.current },
    ].filter((entry): entry is { root: HTMLDivElement; target: HTMLDivElement } => !!entry.root && !!entry.target);

    if (!rootsAndTargets.length || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observers = rootsAndTargets.map(({ root, target }) => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            onLoadMoreChatGroups();
          }
        },
        { root, rootMargin: "180px 0px", threshold: 0.01 }
      );

      observer.observe(target);
      return observer;
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [hasMoreChatGroups, isLoadingChatGroups, onLoadMoreChatGroups]);

  useEffect(() => {
    const conversationId = selectedConversation?.conversationId;
    if (!conversationId) {
      return;
    }

    if (messageListRef.current) {
      messageListRef.current.scrollTop = 0;
    }

    const existingState = messagesByConversationIdRef.current[conversationId];
    if (!existingState?.loaded && !existingState?.loading) {
      void loadConversationMessages(conversationId, { reset: true });
    }
  }, [loadConversationMessages, selectedConversation?.conversationId]);

  useEffect(() => {
    if (selectedConversationMessageState?.loaded && messageListRef.current) {
      messageListRef.current.scrollTop = 0;
    }
  }, [selectedConversation?.conversationId, selectedConversationMessageState?.loaded]);

  useEffect(() => {
    const conversationId = selectedConversation?.conversationId;
    if (
      !conversationId ||
      !selectedConversationMessageState?.hasMore ||
      selectedConversationMessageState.loading ||
      !messageListRef.current ||
      !messageListSentinelRef.current ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadConversationMessages(conversationId);
        }
      },
      { root: messageListRef.current, rootMargin: "220px 0px", threshold: 0.01 }
    );

    observer.observe(messageListSentinelRef.current);
    return () => observer.disconnect();
  }, [
    loadConversationMessages,
    selectedConversation?.conversationId,
    selectedConversationMessageState?.hasMore,
    selectedConversationMessageState?.loading,
  ]);

  const handleSelectListing = (listingId: string, conversationId: string | null) => {
    onSelectListing(listingId, conversationId);
    setMobilePane("conversations");
  };

  const handleSelectConversation = (conversationId: string) => {
    onSelectConversation(conversationId);
    setMobilePane("messages");
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[12px] border border-[#dbe3ee] bg-white shadow-[0_22px_58px_rgba(31,47,82,0.1)]">
      <div className="admin-chat-grid grid h-[calc(100dvh-8rem)] min-h-[31rem] w-full min-w-0 max-w-full grid-cols-1 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] max-h-[44rem] md:h-[calc(100dvh-9rem)] md:min-h-[38rem] md:max-h-[48rem] md:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)] md:grid-rows-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:grid-cols-[19rem_minmax(0,1fr)] xl:h-[78dvh] xl:max-h-[52rem] xl:min-h-[42rem] xl:grid-cols-[20rem_22rem_minmax(0,1fr)] xl:grid-rows-none">
        <section
          className={cn(
            "admin-chat-listings-pane min-h-0 w-full min-w-0 flex-col overflow-hidden border-b border-[#e7edf5] bg-[#fafbfe]",
            mobilePane === "listings" ? "flex" : "hidden",
            mobilePane !== "listings" ? "admin-chat-tablet-hidden" : null,
            "md:col-start-1 md:row-start-1 md:flex md:border-r xl:col-start-auto xl:row-start-auto xl:border-b-0 xl:border-r"
          )}
        >
          <div className="w-full min-w-0 border-b border-[#e7edf5] px-2 py-3 sm:px-4 sm:py-4 xl:px-4 xl:py-4">
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d97ab]">Listings Inbox</p>
                <p className="mt-1 truncate text-[0.95rem] font-semibold tracking-[-0.02em] text-[#1f2940] sm:text-[1.02rem]">
                  {filteredListingGroups.length} listing{filteredListingGroups.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="shrink-0 rounded-full border border-[#dde4ef] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#50607f] sm:px-3 sm:py-1.5 sm:text-[12px]">
                {displayConversationCount} thread{displayConversationCount === 1 ? "" : "s"}
              </div>
            </div>

            <div className="mt-4">
              <ChatSearchField label="Search listings" placeholder="Search listings..." value={listingQuery} onChange={setListingQuery} />
            </div>
            <div className="mt-4">
              <ChatFilterTabs activeFilter={listingFilter} onChange={setListingFilter} />
            </div>
          </div>

          <div ref={listingListRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3 sm:py-3">
            {filteredListingGroups.length ? (
              <div className="w-full min-w-0 space-y-2">
                {filteredListingGroups.map((group) => {
                  const isActive = group.listing.id === selectedListingChat?.listing.id;
                  const listingImage = getListingImage(group.listing);
                  const latestActivity = getGroupLatestActivity(group);
                  const unreadCount = getGroupUnreadCount(group);
                  const latestConversation = group.conversations[0] || null;

                  return (
                    <button
                      key={group.listing.id}
                      type="button"
                      onClick={() => handleSelectListing(group.listing.id, group.conversations[0]?.conversationId || null)}
                      className={cn(
                        "w-full rounded-[14px] border px-2.5 py-2.5 text-left transition sm:rounded-[18px] sm:px-3 sm:py-3",
                        isActive
                          ? "border-[#d7e0ef] bg-[linear-gradient(135deg,#eef3ff_0%,#e9effc_100%)] shadow-[0_12px_28px_rgba(31,47,82,0.08)]"
                          : "border-transparent bg-transparent hover:border-[#e3e9f3] hover:bg-white"
                      )}
                    >
                      <div className="flex min-w-0 gap-2.5 sm:gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[12px] border border-white bg-[#edf2fa] shadow-[0_8px_18px_rgba(31,47,82,0.08)] sm:h-14 sm:w-14 sm:rounded-[14px] xl:h-16 xl:w-16 xl:rounded-[16px]">
                          {listingImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={listingImage.public_url} alt={group.listing.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#8b96ab]">
                              <ListingIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 min-w-0 text-[14px] font-semibold leading-5 tracking-[-0.02em] text-[#1f2940] sm:text-[15px]" title={group.listing.title}>
                              {group.listing.title}
                            </p>
                            {unreadCount ? (
                              <span className="inline-flex min-w-[1.45rem] shrink-0 items-center justify-center rounded-full bg-[#d4a24a] px-1.5 py-0.5 text-[11px] font-semibold text-white">
                                {unreadCount}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-[#5b677f] sm:mt-1 sm:text-[13px]" title={getListingLocation(group.listing)}>
                            {getListingLocation(group.listing)}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:mt-2 sm:gap-2">
                            <span className="text-[12px] font-semibold tracking-[-0.01em] text-[#24314c] sm:text-[13px]">{formatCurrency(group.listing.price)}</span>
                            <span className="rounded-full bg-[#eef3ff] px-2 py-0.5 text-[11px] font-semibold text-[#173972]">
                              {group.conversations.length} chat{group.conversations.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d97ab] sm:mt-2 sm:text-[11px] sm:tracking-[0.16em]">
                            <span className="min-w-0 truncate" title={`Latest ${getMessagePreview(latestConversation?.lastMessage)}`}>
                              Latest {getMessagePreview(latestConversation?.lastMessage)}
                            </span>
                            <span className="max-w-[4.5rem] shrink-0 truncate normal-case tracking-normal text-[#7f8aa1]" title={formatThreadTime(latestActivity)}>
                              {formatThreadTime(latestActivity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              !isLoadingChatGroups ? (
                <AdminBlankState title="No broker chats" description="No broker-to-broker listing conversations match the current filters." />
              ) : null
            )}
            {isLoadingChatGroups ? (
              <div className="py-3 text-center text-[12px] font-medium text-[#7f8aa1]">Loading chats...</div>
            ) : null}
            <div ref={listingListSentinelRef} className="h-px w-full" aria-hidden="true" />
          </div>
        </section>

        <section
          className={cn(
            "admin-chat-conversations-pane min-h-0 w-full min-w-0 flex-col overflow-hidden border-b border-[#e7edf5] bg-[#fbfcfe]",
            mobilePane === "conversations" ? "flex" : "hidden",
            mobilePane === "listings" ? "admin-chat-tablet-hidden" : null,
            "md:col-start-1 md:row-start-2 md:flex md:border-b-0 md:border-r xl:col-start-auto xl:row-start-auto xl:border-r"
          )}
        >
          <div className="w-full min-w-0 border-b border-[#e7edf5] px-2 py-3 sm:px-4 sm:py-4 xl:px-4 xl:py-4">
            <div className="admin-chat-tablet-back mb-3 md:hidden">
              <button
                type="button"
                onClick={() => setMobilePane("listings")}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[#dde4ef] bg-white px-3 text-[12px] font-semibold text-[#50607f] shadow-[0_8px_16px_rgba(31,47,82,0.05)]"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Listings
              </button>
            </div>

            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d97ab]">Conversations</p>
                <p className="mt-1 truncate text-[0.95rem] font-semibold tracking-[-0.02em] text-[#1f2940] sm:text-[1.02rem]">
                  {selectedListingChat ? `${filteredConversations.length} thread${filteredConversations.length === 1 ? "" : "s"}` : "Select a listing"}
                </p>
              </div>
              <div className="shrink-0 rounded-full border border-[#dde4ef] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#50607f] sm:px-3 sm:py-1.5 sm:text-[12px]">
                {totalUnreadCount} unread
              </div>
            </div>

            <div className="mt-4">
              <ChatSearchField
                label="Search conversations"
                placeholder="Search brokers..."
                value={conversationQuery}
                onChange={setConversationQuery}
              />
            </div>
            <div className="mt-4">
              <ChatFilterTabs activeFilter={conversationFilter} onChange={setConversationFilter} />
            </div>
          </div>

          <div ref={conversationListRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {selectedListingChat ? (
              filteredConversations.length ? (
                <>
                  {filteredConversations.map((conversation) => {
                    const broker = getBrokerParticipant(conversation);
                    const brokerName = getAdminChatName(broker?.first_name, broker?.last_name, broker?.email || "Broker");
                    const isActive = conversation.conversationId === selectedConversation?.conversationId;
                    const lastMessage = getConversationLastMessage(conversation);

                    return (
                      <button
                        key={conversation.conversationId}
                        type="button"
                        onClick={() => handleSelectConversation(conversation.conversationId)}
                        className={cn(
                          "w-full border px-3 py-2.5 text-left transition sm:py-3",
                          isActive
                            ? "border-[#d7e0ef] bg-[linear-gradient(135deg,#eef3ff_0%,#e9effc_100%)] shadow-[0_12px_28px_rgba(31,47,82,0.08)]"
                            : "border-transparent bg-transparent hover:border-[#e3e9f3] hover:bg-white"
                        )}
                      >
                        <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
                          <BrokerAvatar
                            src={broker?.profile_photo}
                            alt={getAvatarAlt(brokerName)}
                            className="h-10 w-10 shrink-0 border border-white bg-[#edf2fa] shadow-[0_8px_18px_rgba(31,47,82,0.08)] sm:h-12 sm:w-12"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
                              <p className="min-w-0 truncate text-[14px] font-semibold tracking-[-0.02em] text-[#1f2940] sm:text-[15px]" title={brokerName}>
                                {brokerName}
                              </p>
                              <div className="flex shrink-0 items-center gap-1.5 pt-0.5 sm:gap-2">
                                {conversation.unreadCount ? (
                                  <span className="inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-[#d4a24a] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                    {conversation.unreadCount}
                                  </span>
                                ) : null}
                                <span className="max-w-[4.75rem] truncate text-[11px] font-medium text-[#7f8aa1] sm:text-[12px]" title={formatThreadTime(conversation.lastMessageAt)}>
                                  {formatThreadTime(conversation.lastMessageAt)}
                                </span>
                              </div>
                            </div>
                            <p className="mt-1 truncate text-[12px] text-[#5b677f] sm:text-[13px]" title={broker?.email || "Email unavailable"}>
                              {broker?.email || "Email unavailable"}
                            </p>
                            <p
                              className={cn(
                                "mt-1 line-clamp-2 break-words text-[12px] leading-4 xl:block xl:truncate",
                                conversation.unreadCount ? "font-medium text-[#272c35]" : "text-[#97a1b5]"
                              )}
                              title={getMessagePreview(lastMessage)}
                            >
                              {getMessagePreview(lastMessage)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {isLoadingChatGroups ? (
                    <div className="py-3 text-center text-[12px] font-medium text-[#7f8aa1]">Loading chats...</div>
                  ) : null}
                  <div ref={conversationListSentinelRef} className="h-px w-full" aria-hidden="true" />
                </>
              ) : (
                <div className="p-4">
                  <AdminBlankState title="No conversations found" description="Try a different search or filter for this listing inbox." />
                </div>
              )
            ) : (
              <div className="p-4">
                <AdminBlankState title="Select a listing" description="Choose a listing to inspect its broker conversations." />
              </div>
            )}
          </div>
        </section>

        <section
          className={cn(
            "admin-chat-messages-pane min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white",
            mobilePane === "messages" ? "flex" : "hidden",
            "md:col-start-2 md:row-span-2 md:row-start-1 md:flex xl:col-start-auto xl:col-span-1 xl:row-span-1 xl:row-start-auto"
          )}
        >
          {selectedListingChat && selectedConversation ? (
            <>
              <div className="border-b border-[#e7edf5] bg-white px-2 py-3 sm:px-5 sm:py-4 xl:px-5 xl:py-4">
                <div className="mb-3 md:hidden">
                  <button
                    type="button"
                    onClick={() => setMobilePane("conversations")}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[#dde4ef] bg-white px-3 text-[12px] font-semibold text-[#50607f] shadow-[0_8px_16px_rgba(31,47,82,0.05)]"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Threads
                  </button>
                </div>

                <div className="rounded-[14px] border border-[#e1e7f0] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-2.5 shadow-[0_10px_22px_rgba(31,47,82,0.05)] sm:rounded-[18px] sm:p-3">
                  <div className="flex min-w-0 gap-2.5 sm:gap-3">
                    <div className="relative h-[3.8rem] w-[4.4rem] shrink-0 overflow-hidden rounded-[12px] border border-white bg-[#edf2fa] shadow-[0_8px_18px_rgba(31,47,82,0.08)] sm:h-[4.8rem] sm:w-[5.6rem] sm:rounded-[16px]">
                      {getListingImage(selectedListingChat.listing) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getListingImage(selectedListingChat.listing)?.public_url}
                          alt={selectedListingChat.listing.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#8b96ab]">
                          <ListingIcon className="h-5 w-5 sm:h-7 sm:w-7" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 sm:gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-[0.95rem] font-semibold leading-5 tracking-[-0.03em] text-[#1f2940] sm:block sm:truncate sm:text-[1.04rem]" title={selectedListingChat.listing.title}>
                            {selectedListingChat.listing.title}
                          </p>
                          <p className="mt-0.5 truncate text-[12px] text-[#6b7690] sm:mt-1 sm:text-[13px]" title={getListingLocation(selectedListingChat.listing)}>
                            {getListingLocation(selectedListingChat.listing)}
                          </p>
                        </div>
                        <AdminStatusBadge
                          status={selectedListingChat.listing.deleted_at ? "deleted" : selectedListingChat.listing.status}
                          label={formatListingDisplayStatus(selectedListingChat.listing.status, selectedListingChat.listing.deleted_at)}
                          className="min-h-[28px] px-2 text-[11px] sm:min-h-[34px] sm:text-[14px]"
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 sm:mt-3">
                        <p className="text-[0.95rem] font-semibold tracking-[-0.02em] text-[#24314c] sm:text-[1rem]">{formatCurrency(selectedListingChat.listing.price)}</p>
                        <Link
                          href={getListingDetailHref(selectedListingChat.listing.id)}
                          className="inline-flex min-h-[32px] items-center justify-center rounded-full border border-[#dde4ef] bg-white px-2.5 text-[11px] font-semibold text-[#50607f] shadow-[0_8px_16px_rgba(31,47,82,0.05)] transition hover:border-[#cfd8e6] hover:text-[#173972] sm:min-h-[36px] sm:px-3 sm:text-[12px]"
                        >
                          View Listing
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex min-w-0 items-center justify-between gap-2 sm:mt-4 sm:gap-3">
                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                    <BrokerAvatar
                      src={detailBroker?.profile_photo}
                      alt={getAvatarAlt(detailBrokerName)}
                      className="h-10 w-10 shrink-0 border border-[#e2e8f1] bg-[#edf2fa] shadow-[0_10px_22px_rgba(31,47,82,0.08)] sm:h-12 sm:w-12"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[0.95rem] font-semibold tracking-[-0.03em] text-[#1f2940] sm:text-[1rem]" title={detailBrokerName}>
                        {detailBrokerName}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-[#6b7690] sm:text-[13px]" title={detailBroker?.email || "Email unavailable"}>
                        {detailBroker?.email || "Email unavailable"}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-[#8d97ab] sm:mt-1 sm:text-[12px]" title={`Listing broker: ${detailOwnerName}`}>
                        Listing broker: {detailOwnerName}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    {brokerMailHref ? (
                      <a
                        href={brokerMailHref}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dde4ef] bg-white text-[#50607f] shadow-[0_10px_22px_rgba(31,47,82,0.06)] transition hover:border-[#cfd8e6] hover:text-[#173972] sm:h-10 sm:w-10"
                        aria-label={`Email ${detailBrokerName}`}
                      >
                        <MailIcon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                      </a>
                    ) : null}
                    <Link
                      href={getListingDetailHref(selectedListingChat.listing.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dde4ef] bg-white text-[#50607f] shadow-[0_10px_22px_rgba(31,47,82,0.06)] transition hover:border-[#cfd8e6] hover:text-[#173972] sm:h-10 sm:w-10"
                      aria-label="Open listing"
                    >
                      <ListingIcon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),linear-gradient(180deg,#fbfcff_0%,#f6f8fc_100%)]">
                <div ref={messageListRef} className="h-full min-h-0 overflow-y-auto overscroll-contain px-2 py-3 sm:px-5 sm:py-5">
                  {selectedConversationMessages.length ? (
                    <div className="space-y-3 sm:space-y-4">
                      {selectedConversationMessages.map((message) => {
                        const isBrokerMessage = message.sender_id === selectedConversation.broker?.id;
                        const sender = message.sender || (isBrokerMessage ? selectedConversation.broker : selectedConversation.owner);
                        const senderName = isBrokerMessage
                          ? getAdminChatName(sender?.first_name, sender?.last_name, sender?.email || "Broker")
                          : getAdminChatName(sender?.first_name, sender?.last_name, sender?.email || "Listing broker");

                        return (
                          <div key={message.id} className={cn("flex", isBrokerMessage ? "justify-end" : "justify-start")}>
                            <div className={cn("flex max-w-[92%] gap-2 sm:max-w-[82%] sm:gap-3 xl:max-w-[78%]", isBrokerMessage ? "flex-row-reverse" : "items-start")}>
                              {!isBrokerMessage ? (
                                <BrokerAvatar
                                  src={sender?.profile_photo}
                                  alt={getAvatarAlt(senderName)}
                                  className="h-8 w-8 shrink-0 self-start border border-white bg-[#edf2fa] shadow-[0_8px_18px_rgba(31,47,82,0.08)] sm:h-10 sm:w-10"
                                />
                              ) : null}

                              <div className={cn("flex min-w-0 flex-col", isBrokerMessage ? "items-end" : "items-start")}>
                                <p className="mb-1 px-1 text-[11px] font-semibold tracking-[-0.01em] text-[#5f6c85] sm:mb-1.5 sm:text-[12px]" title={senderName}>
                                  {senderName}
                                </p>
                                <div
                                  className={cn(
                                    "max-w-full rounded-[16px] px-3 py-2.5 shadow-[0_12px_24px_rgba(31,47,82,0.08)] sm:rounded-[18px] sm:px-4 sm:py-3",
                                    isBrokerMessage
                                      ? "rounded-br-[8px] bg-[linear-gradient(135deg,#173972_0%,#0F2A5F_58%,#0C214B_100%)] text-white shadow-[0_18px_30px_rgba(15,42,95,0.18)]"
                                      : "rounded-bl-[8px] border border-[#e1e7f0] bg-white text-[#24314c]"
                                  )}
                                >
                                  <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.5] sm:text-[15px] sm:leading-6">{message.content}</p>
                                </div>
                                <p className={cn("mt-1.5 max-w-full truncate text-[10px] sm:mt-2", isBrokerMessage ? "mr-2 text-[#8691a8]" : "ml-2 text-[#8691a8]")} title={formatDateTime(message.created_at)}>
                                  {formatDateTime(message.created_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {selectedConversationMessagesLoading ? (
                        <div className="py-2 text-center text-[12px] font-medium text-[#7f8aa1]">Loading messages...</div>
                      ) : null}
                      <div ref={messageListSentinelRef} className="h-px w-full" aria-hidden="true" />
                    </div>
                  ) : (
                    <>
                      {!selectedConversationMessagesLoading ? (
                        <div className="flex h-full min-h-[16rem] items-center justify-center">
                          <div className="max-w-md rounded-[22px] border border-[#dde4ee] bg-white/95 px-5 py-7 text-center shadow-[0_14px_28px_rgba(31,47,82,0.08)]">
                            <p className="text-[1rem] font-semibold tracking-[-0.02em] text-[#24314c]">No messages found</p>
                            <p className="mt-2 text-[14px] leading-6 text-[#77839a]">This broker conversation does not contain message history yet.</p>
                          </div>
                        </div>
                      ) : null}
                      {selectedConversationMessagesLoading ? (
                        <div className="py-3 text-center text-[12px] font-medium text-[#7f8aa1]">Loading messages...</div>
                      ) : null}
                      <div ref={messageListSentinelRef} className="h-px w-full" aria-hidden="true" />
                    </>
                  )}
                </div>
              </div>

              
            </>
          ) : (
            <div className="flex h-full min-h-[30rem] items-center justify-center p-5">
              <AdminBlankState
                title="Select a broker conversation"
                description="Choose a listing and thread to inspect broker-to-broker messages tied to that listing."
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
