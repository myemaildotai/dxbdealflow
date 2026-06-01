"use client";

import { useEffect, useRef } from "react";

export function useInfiniteScroll({
  enabled = true,
  hasMore,
  loading,
  onLoadMore,
  rootMargin = "320px 0px",
  threshold = 0,
}: {
  enabled?: boolean;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => Promise<void> | void;
  rootMargin?: string;
  threshold?: number;
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") {
      return;
    }

    const node = sentinelRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (!entry?.isIntersecting || loadingRef.current || !hasMoreRef.current || requestInFlightRef.current) {
          return;
        }

        requestInFlightRef.current = true;

        Promise.resolve(onLoadMoreRef.current()).finally(() => {
          requestInFlightRef.current = false;
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [enabled, rootMargin, threshold]);

  return sentinelRef;
}
