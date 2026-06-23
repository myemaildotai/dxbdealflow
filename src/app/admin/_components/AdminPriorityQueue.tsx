"use client";

import { useMemo, useRef, useState, type UIEvent } from "react";
import { SkeletonBlock } from "@/components/SkeletonBlock";
import { useLazyNotificationList } from "@/hooks/useLazyNotificationList";
import { cn, formatDate } from "@/lib/deal-utils";

export type AdminPriorityQueueItem = {
  id: string;
  target_type: string;
  sentence: string;
  isRead: boolean;
  timestamp?: string | null;
  onMarkAsRead: () => Promise<void> | void;
  onOpen: () => Promise<void> | void;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function formatRelativeTime(value?: string | null) {
  if (!value) return "Just now";

  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / (60 * 1000)));
  const hours = Math.round(diff / (60 * 60 * 1000));
  const days = Math.round(diff / DAY_IN_MS);

  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return formatDate(value);
}

function getNotificationTimestamp(item: AdminPriorityQueueItem) {
  return item.timestamp ? new Date(item.timestamp).getTime() : 0;
}

export function sortAdminPriorityQueueItems(items: AdminPriorityQueueItem[]) {
  return [...items].sort((left, right) => {
    if (left.isRead !== right.isRead) return left.isRead ? 1 : -1;
    return getNotificationTimestamp(right) - getNotificationTimestamp(left);
  });
}

export function getAdminPriorityItemKind(item: AdminPriorityQueueItem) {
  if (item.target_type === "broker") return "broker";
  if (item.target_type === "listing") return "listing";
  if (item.target_type === "chat") return "chat";
  return "default";
}

export function splitAdminPriorityItemText(item: AdminPriorityQueueItem) {
  const kind = getAdminPriorityItemKind(item);

  if (kind === "broker") {
    return {
      title: "Broker approval pending",
      subtitle: item.sentence,
    };
  }

  if (kind === "listing") {
    return {
      title: "Listing review pending",
      subtitle: item.sentence,
    };
  }

  if (kind === "chat") {
    return {
      title: "Chat review pending",
      subtitle: item.sentence,
    };
  }

  return {
    title: "Priority task pending",
    subtitle: item.sentence,
  };
}

export function getAdminPriorityItemVisual(item: AdminPriorityQueueItem) {
  const kind = getAdminPriorityItemKind(item);

  if (kind === "broker") {
    return {
      bg: "bg-[#102354]",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-[19px] w-[19px]" aria-hidden="true">
          <circle cx="9" cy="9" r="3.15" stroke="white" strokeWidth="1.85" />
          <circle cx="17" cy="10" r="2.4" stroke="white" strokeWidth="1.75" />
          <path d="M4.7 18a4.35 4.35 0 0 1 8.7 0M14 18a3.2 3.2 0 0 1 5.4 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    };
  }

  if (kind === "listing") {
    return {
      bg: "bg-[#25a95d]",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-[19px] w-[19px]" aria-hidden="true">
          <rect x="4.8" y="5.4" width="10.4" height="13.2" rx="2.4" stroke="white" strokeWidth="1.7" />
          <path d="M8 9.2h4M8 12.5h4M17.8 9.4v7.2M14.2 13h7" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
    };
  }

  if (kind === "chat") {
    return {
      bg: "bg-[#20b8ad]",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
          <path d="M7.7 9.4h8.6M7.7 12.6h5.8" stroke="white" strokeWidth="1.75" strokeLinecap="round" />
          <path
            d="M5.4 18.25 4.2 20.5V6.75c0-1.75 1.42-3.17 3.17-3.17h9.26c1.75 0 3.17 1.42 3.17 3.17v6.95c0 1.75-1.42 3.17-3.17 3.17H8.05l-2.65 1.38Z"
            stroke="white"
            strokeWidth="1.65"
            strokeLinejoin="round"
          />
        </svg>
      ),
    };
  }

  return {
    bg: "bg-[#6650d6]",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-[19px] w-[19px]" aria-hidden="true">
        <path
          d="M7.2 3.8h7.1L18 7.55V20.2H7.2V3.8Z"
          stroke="white"
          strokeWidth="1.65"
          strokeLinejoin="round"
        />
        <path d="M14.1 4.1v4h3.7M9.7 12.1h4.7M9.7 15.1h4.7" stroke="white" strokeWidth="1.55" strokeLinecap="round" />
      </svg>
    ),
  };
}

export function AdminPriorityQueue({
  hasMore,
  items,
  isLoading = false,
  isLoadingMore: externalIsLoadingMore = false,
  onLoadMore,
  totalCount,
}: {
  hasMore?: boolean;
  items: AdminPriorityQueueItem[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  totalCount: number;
}) {
  const [markingIds, setMarkingIds] = useState<string[]>([]);
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null);
  const interactionLockRef = useRef(false);
  const orderedItems = useMemo(() => sortAdminPriorityQueueItems(items), [items]);
  const lazyNotificationList = useLazyNotificationList({
    items: orderedItems,
  });
  const isExternallyPaginated = !!onLoadMore;
  const isLoadingMore = isExternallyPaginated ? externalIsLoadingMore : lazyNotificationList.isLoadingMore;
  const visibleItems = isExternallyPaginated ? orderedItems : lazyNotificationList.visibleItems;
  const handleNotificationListScroll = (event: UIEvent<HTMLElement>) => {
    if (!isExternallyPaginated) {
      lazyNotificationList.handleScroll(event);
      return;
    }

    const target = event.currentTarget;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceFromBottom <= 96 && hasMore && !externalIsLoadingMore) {
      onLoadMore?.();
    }
  };

  const handleNotificationRead = async (item: AdminPriorityQueueItem) => {
    if (item.isRead || markingIds.includes(item.id)) return;

    setMarkingIds((current) => [...current, item.id]);

    try {
      await item.onMarkAsRead();
    } finally {
      setMarkingIds((current) => current.filter((currentId) => currentId !== item.id));
    }
  };

  const handleNotificationClick = async (item: AdminPriorityQueueItem) => {
    if (interactionLockRef.current) return;

    interactionLockRef.current = true;
    setActiveNotificationId(item.id);

    try {
      await handleNotificationRead(item);
      await item.onOpen();
    } finally {
      interactionLockRef.current = false;
      setActiveNotificationId(null);
    }
  };

  return (
    <section className="relative mt-[22px] flex h-[min(72dvh,34rem)] min-h-0 min-w-0 flex-col overflow-visible sm:max-xl:h-[24rem] xl:h-[550px]">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-[#f6da74] bg-[#fff8e8] px-[8px] pt-[20px] shadow-[0_0_0_2px_rgba(255,250,221,0.95),0_0_0_5px_rgba(247,218,116,0.18),0_18px_46px_rgba(214,164,35,0.13)]">
        <div className="pointer-events-none absolute inset-[6px] rounded-[14px] border border-[#f7e7a5]" />
        <div className="pointer-events-none absolute inset-0 bg-[#fff8e8]" />

        <div className="relative flex items-start justify-between gap-3 px-[12px] pb-3 sm:gap-4 sm:pb-[17px]">
          <div className="flex items-center gap-3 sm:gap-[18px]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(145deg,#ffdc4d_0%,#efa913_47%,#d48a00_100%)] shadow-[0_0_0_4px_rgba(255,255,255,0.72),0_8px_22px_rgba(215,151,8,0.44),0_0_28px_rgba(255,210,54,0.42)] sm:h-[60px] sm:w-[60px]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-white sm:h-[31px] sm:w-[31px]" aria-hidden="true">
                <path d="m12 2.9 2.74 5.56 6.14.9-4.44 4.33 1.05 6.12L12 16.92l-5.49 2.89 1.05-6.12-4.44-4.33 6.14-.9L12 2.9Z" />
              </svg>
            </div>

            <div className="pt-[2px]">
              <h3 className="text-[20px] font-extrabold uppercase leading-[22px] tracking-[-0.01em] text-[#c89517]">
                Priority Queue
              </h3>
              <p className="mt-[8px] max-w-[218px] text-[13px] font-semibold leading-[18px] text-[#344054]">
                Your top priority items that need your attention
              </p>
            </div>
          </div>

          <div className="flex items-center gap-[9px] pr-[7px] pt-[18px]">
            <svg viewBox="0 0 24 24" fill="none" className="h-[24px] w-[24px] text-[#b98812]" aria-hidden="true">
              <path
                d="M8 4h8v3a4 4 0 0 1-8 0V4ZM9 19h6M12 15v4M6 6H4a2 2 0 0 0 2 2M18 6h2a2 2 0 0 1-2 2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[27px] font-extrabold leading-none tracking-[-0.04em] text-[#20283a]">{totalCount}</span>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[6px] bg-[#ffffff] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <div className="h-full min-h-0 overflow-y-auto overscroll-auto xl:overscroll-contain" onScroll={handleNotificationListScroll}>
            {isLoading && !orderedItems.length ? (
              <div className="space-y-0" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid min-h-[62px] w-full grid-cols-[48px_minmax(0,1fr)_auto_13px] items-center gap-[11px] border-0 border-b border-[#f1eee7] px-[11px] py-[10px] last:border-b-0 sm:max-xl:grid-cols-[42px_minmax(0,1fr)_13px]"
                  >
                    <SkeletonBlock className="h-[40px] w-[40px] rounded-full bg-[#f3ead1]" />
                    <div className="min-w-0">
                      <SkeletonBlock className="h-3.5 w-4/5 rounded-xl bg-[#f3ead1]" />
                      <SkeletonBlock className="mt-2 h-3 w-3/5 rounded-xl bg-[#f3ead1]" />
                    </div>
                    <SkeletonBlock className="h-3 w-12 rounded-xl bg-[#f3ead1] sm:max-xl:hidden" />
                    <SkeletonBlock className="h-3 w-3 rounded-full bg-[#f3ead1]" />
                  </div>
                ))}
              </div>
            ) : orderedItems.length ? (
              <>
                {visibleItems.map((item) => {
                  const isUnread = !item.isRead;
                  const isActive = activeNotificationId === item.id;
                  const isBusy = isActive || markingIds.includes(item.id);
                  const isQueueLocked = activeNotificationId !== null;
                  const text = splitAdminPriorityItemText(item);
                  const visual = getAdminPriorityItemVisual(item);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void handleNotificationClick(item)}
                      disabled={isQueueLocked}
                      aria-label={item.sentence}
                      className={cn(
                        "group grid min-h-[62px] w-full grid-cols-[48px_minmax(0,1fr)_auto_13px] items-center gap-[11px] border-0 border-b border-[#f1eee7] bg-transparent px-[11px] py-[10px] text-left transition last:border-b-0 hover:bg-white/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d6a31f]/45 disabled:cursor-wait sm:max-xl:grid-cols-[42px_minmax(0,1fr)_13px]",
                        isBusy && "opacity-75",
                        isQueueLocked && !isActive && "opacity-60"
                      )}
                    >
                      <div className="relative flex h-[42px] w-[42px] items-center justify-center">
                        <span
                          className={cn(
                            "flex h-[40px] w-[40px] items-center justify-center rounded-full shadow-[0_7px_14px_rgba(20,31,55,0.16)]",
                            visual.bg
                          )}
                        >
                          {visual.icon}
                        </span>

                        {isUnread ? (
                          <span className="absolute right-[1px] top-[-1px] h-[13px] w-[13px] rounded-full border-[2px] border-white bg-[#ff2424] shadow-[0_1px_3px_rgba(255,36,36,0.28)]" />
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <p
                          className={cn(
                            "truncate text-[12.5px] leading-[17px] tracking-[-0.01em]",
                            isUnread ? "font-extrabold text-[#263044]" : "font-bold text-[#344054]"
                          )}
                        >
                          {text.title}
                        </p>
                        <p className="mt-[2px] truncate text-[12.5px] font-medium leading-[17px] text-[#5e6674]">
                          {text.subtitle}
                        </p>
                      </div>

                      <p className="whitespace-nowrap text-[10.5px] font-semibold leading-none text-[#7e8795] sm:max-xl:hidden">
                        {formatRelativeTime(item.timestamp)}
                      </p>

                      <svg viewBox="0 0 20 20" fill="none" className="h-[13px] w-[13px] text-[#a9afb8]" aria-hidden="true">
                        <path
                          d="m7.5 4.5 5 5-5 5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  );
                })}

                {isLoadingMore ? (
                  <div className="flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-semibold text-[#7e8795]" aria-live="polite">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d6a31f]" />
                    Loading more notifications...
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-[8px] border border-[#f1eee7] bg-[rgba(255,255,255,0.78)] px-4 py-5 text-[14px] font-medium leading-6 text-[#5b6478] shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_6px_14px_rgba(86,76,48,0.035)] backdrop-blur-[2px]">
                Priority approvals and monitoring tasks will appear here as new broker applications, listing reviews, and live chat threads arrive.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 top-0 z-[10] translate-x-3 -translate-y-1/2 overflow-visible sm:right-5 sm:translate-x-4">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(145deg,#ffdc4d_0%,#efa913_50%,#d48a00_100%)] shadow-[0_8px_22px_rgba(215,151,8,0.45),0_0_24px_rgba(255,210,54,0.5)] sm:h-[50px] sm:w-[50px]">
          <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5 text-white sm:h-[30px] sm:w-[30px]" aria-hidden="true">
            <path
              d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-[2px] border-white bg-red-500" />
        </div>
      </div>
    </section>
  );
}
