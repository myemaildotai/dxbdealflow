"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";

export const NOTIFICATION_BATCH_SIZE = 15;

const DEFAULT_LOAD_THRESHOLD_PX = 96;
const DEFAULT_LOAD_DELAY_MS = 140;

export function useLazyNotificationList<T extends { id: string }>({
  batchSize = NOTIFICATION_BATCH_SIZE,
  items,
  loadDelayMs = DEFAULT_LOAD_DELAY_MS,
  loadThresholdPx = DEFAULT_LOAD_THRESHOLD_PX,
  resetKey,
}: {
  batchSize?: number;
  items: T[];
  loadDelayMs?: number;
  loadThresholdPx?: number;
  resetKey?: unknown;
}) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRef = useRef(false);
  const totalCountRef = useRef(0);

  const uniqueItems = useMemo(() => {
    const seenIds = new Set<string>();

    return items.filter((item) => {
      if (seenIds.has(item.id)) {
        return false;
      }

      seenIds.add(item.id);
      return true;
    });
  }, [items]);

  const totalCount = uniqueItems.length;
  const resolvedVisibleCount = Math.min(visibleCount, totalCount);
  const visibleItems = useMemo(() => uniqueItems.slice(0, resolvedVisibleCount), [resolvedVisibleCount, uniqueItems]);
  const hasMore = resolvedVisibleCount < totalCount;

  const cancelPendingLoad = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    loadingRef.current = false;
  }, []);

  const clearPendingLoad = useCallback(() => {
    cancelPendingLoad();
    setIsLoadingMore(false);
  }, [cancelPendingLoad]);

  useEffect(() => {
    totalCountRef.current = totalCount;
  }, [totalCount]);

  useEffect(() => {
    clearPendingLoad();
    setVisibleCount(batchSize);
  }, [batchSize, clearPendingLoad, resetKey]);

  useEffect(() => {
    setVisibleCount((current) => {
      if (current < batchSize) {
        return batchSize;
      }

      if (current > totalCount) {
        return Math.max(batchSize, totalCount);
      }

      return current;
    });
  }, [batchSize, totalCount]);

  useEffect(() => cancelPendingLoad, [cancelPendingLoad]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setIsLoadingMore(true);

    loadTimeoutRef.current = setTimeout(() => {
      setVisibleCount((current) => Math.min(current + batchSize, totalCountRef.current));
      loadingRef.current = false;
      loadTimeoutRef.current = null;
      setIsLoadingMore(false);
    }, loadDelayMs);
  }, [batchSize, hasMore, loadDelayMs]);

  const handleScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      const target = event.currentTarget;
      const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

      if (distanceFromBottom <= loadThresholdPx) {
        loadMore();
      }
    },
    [loadMore, loadThresholdPx]
  );

  return {
    handleScroll,
    hasMore,
    isLoadingMore,
    totalCount,
    visibleCount: resolvedVisibleCount,
    visibleItems,
  };
}
