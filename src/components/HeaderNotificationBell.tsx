"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { usePathname } from "next/navigation";
import { useLazyNotificationList } from "@/hooks/useLazyNotificationList";
import { cn, formatDate } from "@/lib/deal-utils";

export type HeaderNotificationBellItem = {
  id: string;
  ariaLabel: string;
  title: string;
  subtitle: string;
  isRead: boolean;
  priority?: "urgent" | "high" | "normal" | "low";
  unreadWeight?: number;
  timestamp?: string | null;
  visual: {
    bg: string;
    icon: ReactNode;
  };
  onMarkAsRead: () => Promise<void> | void;
  onOpen: () => Promise<void> | void;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getNotificationTimestamp(item: HeaderNotificationBellItem) {
  return item.timestamp ? new Date(item.timestamp).getTime() : 0;
}

function sortNotifications(items: HeaderNotificationBellItem[]) {
  const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 };

  return [...items].sort((left, right) => {
    if (left.isRead !== right.isRead) return left.isRead ? 1 : -1;
    const leftPriority = left.priority || "normal";
    const rightPriority = right.priority || "normal";
    if (leftPriority !== rightPriority) return priorityRank[leftPriority] - priorityRank[rightPriority];
    return getNotificationTimestamp(right) - getNotificationTimestamp(left);
  });
}

function dedupeNotifications(items: HeaderNotificationBellItem[]) {
  const itemsById = new Map<string, HeaderNotificationBellItem>();

  items.forEach((item) => {
    const current = itemsById.get(item.id);
    if (!current || getNotificationTimestamp(item) >= getNotificationTimestamp(current)) {
      itemsById.set(item.id, item);
    }
  });

  return Array.from(itemsById.values());
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

function formatUnreadCount(count: number) {
  return count > 99 ? "99+" : `${count}`;
}

function getItemUnreadWeight(item: HeaderNotificationBellItem) {
  return Math.max(item.unreadWeight ?? 1, 1);
}

export function HeaderNotificationBell({
  hasMore = false,
  isLoadingMore: externalIsLoadingMore = false,
  items,
  label = "Notifications",
  onLoadMore,
  totalCount: externalTotalCount,
  unreadCount: externalUnreadCount,
}: {
  hasMore?: boolean;
  isLoadingMore?: boolean;
  items: HeaderNotificationBellItem[];
  label?: string;
  onLoadMore?: () => Promise<void> | void;
  totalCount?: number;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const interactionLockRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null);
  const uniqueItems = useMemo(() => dedupeNotifications(items), [items]);
  const orderedItems = useMemo(() => sortNotifications(uniqueItems), [uniqueItems]);
  const {
    handleScroll: handleLazyNotificationListScroll,
    isLoadingMore: lazyIsLoadingMore,
    visibleItems: lazyVisibleItems,
  } = useLazyNotificationList({
    items: orderedItems,
    resetKey: open,
  });
  const calculatedUnreadCount = useMemo(
    () => uniqueItems.reduce((sum, item) => sum + (item.isRead ? 0 : getItemUnreadWeight(item)), 0),
    [uniqueItems]
  );
  const unreadCount = externalUnreadCount ?? calculatedUnreadCount;
  const totalCount = externalTotalCount ?? uniqueItems.length;
  const isLoadingMore = onLoadMore ? externalIsLoadingMore : lazyIsLoadingMore;
  const visibleItems = onLoadMore ? orderedItems : lazyVisibleItems;
  const hasUnread = unreadCount > 0;
  const panelId = "header-notification-panel";
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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleNotificationClick = async (item: HeaderNotificationBellItem) => {
    if (interactionLockRef.current) {
      return;
    }

    interactionLockRef.current = true;
    setActiveNotificationId(item.id);

    try {
      await item.onMarkAsRead();
      setOpen(false);
      await item.onOpen();
    } finally {
      interactionLockRef.current = false;
      setActiveNotificationId(null);
    }
  };

  return (
    <div ref={containerRef} className="header-notification-bell relative shrink-0">
      <button
        type="button"
        className={cn(
          "header-notification-bell__button relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-line bg-white text-brand-navy shadow-[0_10px_24px_rgba(15,42,95,0.08)] transition duration-200 hover:border-brand-blue/30 hover:bg-brand-panel-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/55 sm:h-11 sm:w-11",
          open && "border-brand-blue/30 bg-brand-panel-soft"
        )}
        aria-label={hasUnread ? `${label}: ${unreadCount} unread` : label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" fill="none" className="header-notification-bell__icon h-6 w-6" aria-hidden="true">
          <path
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {hasUnread ? (
          <span className="header-notification-bell__badge absolute -right-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full border-2 border-white bg-[#e43f3f] px-1 text-[10px] font-bold leading-[1rem] text-white shadow-[0_6px_14px_rgba(228,63,63,0.25)]">
            {formatUnreadCount(unreadCount)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          className="fixed right-3 top-16 z-[70] w-[calc(100vw-1.5rem)] max-w-[24rem] sm:absolute sm:right-0 sm:top-[calc(100%+0.75rem)] sm:w-[24rem]"
        >
          <div className="overflow-hidden rounded-[14px] border border-brand-line/90 bg-white shadow-[0_24px_70px_rgba(15,42,95,0.22)]">
            <div className="flex items-center justify-between gap-3 border-b border-brand-line/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-slate">{label}</p>
                <p className="mt-1 truncate text-sm font-semibold text-brand-ink">
                  {totalCount ? `${totalCount} notification${totalCount === 1 ? "" : "s"}` : "No notifications"}
                </p>
              </div>
              {hasUnread ? (
                <span className="shrink-0 rounded-full border border-[#f1d2d2] bg-[#fff3f3] px-2.5 py-1 text-xs font-bold text-[#bd3434]">
                  {formatUnreadCount(unreadCount)} unread
                </span>
              ) : null}
            </div>

            <div className="max-h-[min(27rem,calc(100dvh-8rem))] overflow-y-auto overscroll-contain p-2" onScroll={handleNotificationListScroll}>
              {orderedItems.length ? (
                <>
                  {visibleItems.map((item) => {
                    const isUnread = !item.isRead;
                    const isActive = activeNotificationId === item.id;
                    const isLocked = activeNotificationId !== null;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          "group grid min-h-[64px] w-full grid-cols-[42px_minmax(0,1fr)_13px] items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-left transition hover:bg-brand-panel-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/45 sm:grid-cols-[42px_minmax(0,1fr)_auto_13px]",
                          isUnread ? "bg-[#f7f9fc]" : "bg-white",
                          isActive && "opacity-75",
                          isLocked && !isActive && "opacity-60"
                        )}
                        aria-label={item.ariaLabel}
                        disabled={isLocked}
                        onClick={() => void handleNotificationClick(item)}
                      >
                        <span className="relative flex h-[42px] w-[42px] items-center justify-center">
                          <span
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-full shadow-[0_7px_14px_rgba(20,31,55,0.16)]",
                              item.visual.bg
                            )}
                          >
                            {item.visual.icon}
                          </span>

                          {isUnread ? (
                            <span className="absolute right-[1px] top-[-1px] h-[12px] w-[12px] rounded-full border-2 border-white bg-[#e43f3f]" />
                          ) : null}
                        </span>

                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block truncate text-[13px] leading-[18px]",
                              isUnread ? "font-extrabold text-[#20283a]" : "font-semibold text-[#46546a]"
                            )}
                          >
                            {item.title}
                          </span>
                          <span className={cn("mt-0.5 block truncate text-[12px] leading-[17px]", isUnread ? "font-semibold text-[#526074]" : "font-medium text-[#7a8494]")}>
                            {item.subtitle}
                          </span>
                        </span>

                        <span className="hidden whitespace-nowrap text-[10.5px] font-semibold leading-none text-[#7e8795] sm:block">
                          {formatRelativeTime(item.timestamp)}
                        </span>

                        <svg viewBox="0 0 20 20" fill="none" className="h-[13px] w-[13px] text-[#a9afb8]" aria-hidden="true">
                          <path d="m7.5 4.5 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    );
                  })}

                  {isLoadingMore ? (
                    <div className="flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-[11px] font-semibold text-brand-slate" aria-live="polite">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold" />
                      Loading more notifications...
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-[10px] border border-dashed border-brand-line bg-brand-panel-soft px-4 py-6 text-sm font-medium leading-6 text-brand-slate">
                  Notifications will appear here when priority items need attention.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
