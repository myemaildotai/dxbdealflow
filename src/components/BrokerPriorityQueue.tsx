"use client";

import { useCallback, useMemo, useRef, useState, type UIEvent } from "react";
import { useLazyNotificationList } from "@/hooks/useLazyNotificationList";
import { type BrokerNotificationFeedItem } from "@/lib/broker-notifications";
import { cn, formatDate } from "@/lib/deal-utils";

type BrokerPriorityQueueProps = {
  hasMore?: boolean;
  isLoadingMore?: boolean;
  notifications: BrokerNotificationFeedItem[];
  onLoadMore?: () => Promise<void> | void;
  onMarkAsRead: (notification: BrokerNotificationFeedItem) => Promise<void>;
  onOpenPrimaryAction: (notification: BrokerNotificationFeedItem) => Promise<void>;
  totalCount?: number;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getNotificationTimestamp(notification: BrokerNotificationFeedItem) {
  return notification.createdAt ? new Date(notification.createdAt).getTime() : 0;
}

export function sortBrokerNotifications(notifications: BrokerNotificationFeedItem[]) {
  return [...notifications].sort((left, right) => {
    if (left.isRead !== right.isRead) return left.isRead ? 1 : -1;
    return getNotificationTimestamp(right) - getNotificationTimestamp(left);
  });
}

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

export function getBrokerNotificationSentence(notification: BrokerNotificationFeedItem) {
  return notification.ariaLabel;
}

export function splitBrokerNotificationText(notification: BrokerNotificationFeedItem) {
  return {
    title: notification.title,
    subtitle: notification.message,
  };
}

export function getBrokerNotificationVisual(notification: BrokerNotificationFeedItem) {
  if (notification.type === "chat") {
    return {
      bg: "bg-[#102354]",
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

  if (notification.type === "enquiry") {
    return {
      bg: "bg-[#20b8ad]",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-[19px] w-[19px]" aria-hidden="true">
          <path
            d="M12 12.1a4.05 4.05 0 1 0 0-8.1 4.05 4.05 0 0 0 0 8.1ZM4.75 20c.85-3.55 3.55-5.55 7.25-5.55S18.4 16.45 19.25 20"
            stroke="white"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      ),
    };
  }

  if (notification.type === "listingApproval") {
    return {
      bg: "bg-[#25a95d]",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-[20px] w-[20px]" aria-hidden="true">
          <circle cx="12" cy="12" r="8.6" stroke="white" strokeWidth="1.8" />
          <path
            d="m7.7 12.2 2.85 2.85 5.9-6"
            stroke="white"
            strokeWidth="2.15"
            strokeLinecap="round"
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

export function BrokerPriorityQueue({
  hasMore = false,
  isLoadingMore: externalIsLoadingMore = false,
  notifications,
  onLoadMore,
  onMarkAsRead,
  onOpenPrimaryAction,
  totalCount = notifications.length,
}: BrokerPriorityQueueProps) {
  const [markingIds, setMarkingIds] = useState<string[]>([]);
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null);
  const interactionLockRef = useRef(false);
  const orderedNotifications = useMemo(() => sortBrokerNotifications(notifications), [notifications]);
  const {
    handleScroll: handleLazyNotificationListScroll,
    isLoadingMore: lazyIsLoadingMore,
    visibleItems: lazyVisibleNotifications,
  } = useLazyNotificationList({
    items: orderedNotifications,
  });
  const isLoadingMore = onLoadMore ? externalIsLoadingMore : lazyIsLoadingMore;
  const visibleNotifications = onLoadMore ? orderedNotifications : lazyVisibleNotifications;
  const handleNotificationListScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      if (!onLoadMore) {
        handleLazyNotificationListScroll(event);
        return;
      }

      const target = event.currentTarget;
      const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (hasMore && !externalIsLoadingMore && distanceFromBottom <= 96) {
        void onLoadMore();
      }
    },
    [externalIsLoadingMore, handleLazyNotificationListScroll, hasMore, onLoadMore]
  );

  const handleNotificationRead = async (notification: BrokerNotificationFeedItem) => {
    if (notification.isRead || markingIds.includes(notification.id)) return;

    setMarkingIds((current) => [...current, notification.id]);

    try {
      await onMarkAsRead(notification);
    } finally {
      setMarkingIds((current) => current.filter((id) => id !== notification.id));
    }
  };

  const handleNotificationClick = async (notification: BrokerNotificationFeedItem) => {
    if (interactionLockRef.current) return;

    interactionLockRef.current = true;
    setActiveNotificationId(notification.id);

    try {
      await handleNotificationRead(notification);
      await onOpenPrimaryAction(notification);
    } finally {
      interactionLockRef.current = false;
      setActiveNotificationId(null);
    }
  };

  return (
    <section className="relative mt-[22px] overflow-visible">
      <div className="relative flex h-[550px] flex-col overflow-hidden rounded-[18px] border border-[#f6da74] bg-[#fff8e8] px-[8px] pt-[18px] shadow-[0_0_0_2px_rgba(255,250,221,0.95),0_0_0_5px_rgba(247,218,116,0.18),0_18px_46px_rgba(214,164,35,0.13)] sm:max-xl:h-[24rem] xl:h-[550px]">
        <div className="pointer-events-none absolute inset-[6px] rounded-[14px] border border-[#f7e7a5]" />
        <div className="pointer-events-none absolute inset-0 bg-[#fff8e8]" />

        <div className="relative flex items-start justify-between gap-3 px-[10px] pb-[17px] sm:gap-4 sm:px-[12px]">
          <div className="flex min-w-0 items-center gap-3 sm:gap-[18px]">
            <div className="flex aspect-square h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(145deg,#ffdc4d_0%,#efa913_47%,#d48a00_100%)] shadow-[0_0_0_4px_rgba(255,255,255,0.72),0_8px_22px_rgba(215,151,8,0.44),0_0_28px_rgba(255,210,54,0.42)] sm:h-14 sm:w-14 lg:h-[60px] lg:w-[60px]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="block h-7 w-7 text-white sm:h-8 sm:w-8 lg:h-[31px] lg:w-[31px]" aria-hidden="true">
                <path d="m12 2.9 2.74 5.56 6.14.9-4.44 4.33 1.05 6.12L12 16.92l-5.49 2.89 1.05-6.12-4.44-4.33 6.14-.9L12 2.9Z" />
              </svg>
            </div>

            <div className="min-w-0 pt-[2px]">
              <h3 className="text-[18px] font-extrabold uppercase leading-[21px] tracking-[-0.01em] text-[#c89517] sm:text-[20px] sm:leading-[22px]">
                Priority Queue
              </h3>
              <p className="mt-[6px] max-w-[218px] text-[12px] font-semibold leading-[17px] text-[#344054] sm:mt-[8px] sm:text-[13px] sm:leading-[18px]">
                Your top priority items that need your attention
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-[7px] pr-0 pt-3 sm:gap-[9px] sm:pr-[7px] sm:pt-[18px]">
            <svg viewBox="0 0 24 24" fill="none" className="h-[24px] w-[24px] text-[#b98812]" aria-hidden="true">
              <path
                d="M8 4h8v3a4 4 0 0 1-8 0V4ZM9 19h6M12 15v4M6 6H4a2 2 0 0 0 2 2M18 6h2a2 2 0 0 1-2 2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[27px] font-extrabold leading-none tracking-[-0.04em] text-[#20283a]">
              {totalCount}
            </span>
          </div>
        </div>

        <div
          className="relative min-h-0 flex-1 overflow-y-auto rounded-[6px] bg-[#ffffff] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]"
          onScroll={handleNotificationListScroll}
        >
          {orderedNotifications.length ? (
            <>
              {visibleNotifications.map((notification) => {
                const isUnread = !notification.isRead;
                const isActive = activeNotificationId === notification.id;
                const isBusy = isActive || markingIds.includes(notification.id);
                const isQueueLocked = activeNotificationId !== null;
                const visual = getBrokerNotificationVisual(notification);
                const text = splitBrokerNotificationText(notification);

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => void handleNotificationClick(notification)}
                    disabled={isQueueLocked}
                    aria-label={getBrokerNotificationSentence(notification)}
                    className={cn(
                      "group grid min-h-[62px] w-full grid-cols-[42px_minmax(0,1fr)_13px] items-center gap-[9px] border-0 border-b border-[#f1eee7] bg-transparent px-[9px] py-[10px] text-left transition last:border-b-0 hover:bg-white/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d6a31f]/45 disabled:cursor-wait sm:grid-cols-[48px_minmax(0,1fr)_auto_13px] sm:gap-[11px] sm:px-[11px]",
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

                    <p className="hidden whitespace-nowrap text-[10.5px] font-semibold leading-none text-[#7e8795] sm:block">
                      {formatRelativeTime(notification.createdAt)}
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
              Notifications will appear here as listing approvals, requirements, enquiries, and chats reach your dashboard.
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 top-0 z-[10] -translate-y-1/2 overflow-visible sm:right-5 sm:translate-x-4">
        <div className="relative flex h-[50px] w-[50px] items-center justify-center rounded-full 
          bg-[linear-gradient(145deg,#ffdc4d_0%,#efa913_50%,#d48a00_100%)]
          shadow-[0_8px_22px_rgba(215,151,8,0.45),0_0_24px_rgba(255,210,54,0.5)]">
          <svg
            viewBox="0 0 24 24"
            fill="white"
            className="h-[30px] w-[30px] text-white"
          >
            <path
              d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="absolute right-[6px] top-[6px] h-[10px] w-[10px] rounded-full bg-red-500 border-[2px] border-white" />
        </div>
      </div>
    </section>
  );
}
