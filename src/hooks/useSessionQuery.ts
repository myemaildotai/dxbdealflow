"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeClientSessionReset } from "@/lib/client-session";
import {
  fetchSessionResource,
  getSessionResource,
  getSessionResourceGeneration,
  invalidateSessionResource,
  setSessionResource,
  subscribeSessionResource,
} from "@/lib/session-resource";

type UseSessionQueryOptions<T> = {
  enabled?: boolean;
  initialData?: T | null;
  keepPreviousData?: boolean;
  ttlMs?: number;
  onError?: (error: unknown) => void;
};

type UseSessionQueryResult<T> = {
  data: T | null;
  error: unknown;
  loading: boolean;
  refresh: () => Promise<T | null>;
  setData: (value: T | null | ((current: T | null) => T | null)) => void;
};

const DEFAULT_TTL_MS = 30_000;

export function useSessionQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  { enabled = true, initialData = null, keepPreviousData = false, ttlMs = DEFAULT_TTL_MS, onError }: UseSessionQueryOptions<T> = {}
): UseSessionQueryResult<T> {
  const keyRef = useRef(key);
  const queryFnRef = useRef(queryFn);
  const onErrorRef = useRef(onError);
  const keepPreviousDataRef = useRef(keepPreviousData);
  const [stateKey, setStateKey] = useState(key);
  const [data, setDataState] = useState<T | null>(() => initialData ?? getSessionResource<T>(key));
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(() => enabled && (initialData ?? getSessionResource<T>(key)) === null);
  const dataRef = useRef<T | null>(initialData ?? getSessionResource<T>(key));
  const resourceGenerationRef = useRef(getSessionResourceGeneration());
  const seededValueForCurrentKey = initialData ?? getSessionResource<T>(key);
  const hasKeyChanged = stateKey !== key;

  if (keyRef.current !== key) {
    keyRef.current = key;
  }

  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    keepPreviousDataRef.current = keepPreviousData;
  }, [keepPreviousData]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    return subscribeSessionResource((changedKey, nextValue) => {
      if (changedKey !== keyRef.current) {
        return;
      }

      const typedValue = nextValue as T | null;
      const nextGeneration = getSessionResourceGeneration();
      const isSessionReset = nextGeneration !== resourceGenerationRef.current;
      resourceGenerationRef.current = nextGeneration;

      if (typedValue === null && keepPreviousDataRef.current && !isSessionReset) {
        setStateKey(changedKey);
        setError(null);
        setLoading(false);
        return;
      }

      setDataState(typedValue);
      dataRef.current = typedValue;
      setStateKey(changedKey);

      if (typedValue !== null) {
        setError(null);
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    return subscribeClientSessionReset(() => {
      setDataState(null);
      dataRef.current = null;
      setStateKey(keyRef.current);
      setError(null);
      setLoading(false);
      resourceGenerationRef.current = getSessionResourceGeneration();
    });
  }, []);

  const setData = useCallback(
    (value: T | null | ((current: T | null) => T | null)) => {
      setStateKey(keyRef.current);
      setDataState((current) => {
        const nextValue = typeof value === "function" ? (value as (current: T | null) => T | null)(current) : value;

        if (nextValue !== null) {
          setSessionResource(keyRef.current, nextValue, ttlMs);
        } else {
          invalidateSessionResource(keyRef.current);
        }

        dataRef.current = nextValue;
        return nextValue;
      });
    },
    [ttlMs]
  );

  const load = useCallback(
    async (force = false) => {
      if (!enabled) {
        setLoading(false);
        return dataRef.current;
      }

      if (!force) {
        const cached = getSessionResource<T>(key);
        if (cached !== null) {
          setDataState(cached);
          setError(null);
          setLoading(false);
          return cached;
        }
      }

      if (!keepPreviousData) {
        setDataState((current) => (force ? current : null));
      }

      setLoading(true);
      const requestGeneration = getSessionResourceGeneration();

      try {
        const result = await fetchSessionResource(key, () => queryFnRef.current(), { force, ttlMs });
        if (keyRef.current === key && requestGeneration === getSessionResourceGeneration()) {
          setDataState(result);
          dataRef.current = result;
          setError(null);
        }
        return result;
      } catch (requestError) {
        if (keyRef.current === key) {
          setError(requestError);
        }
        onErrorRef.current?.(requestError);
        return null;
      } finally {
        if (keyRef.current === key) {
          setLoading(false);
        }
      }
    },
    [enabled, keepPreviousData, key, ttlMs]
  );

  useEffect(() => {
    keyRef.current = key;
    setStateKey(key);

    if (initialData !== null) {
      setSessionResource(key, initialData, ttlMs);
      setDataState(initialData);
      dataRef.current = initialData;
      setError(null);
      setLoading(false);
      return;
    }

    if (!enabled) {
      const cached = getSessionResource<T>(key);
      setDataState(cached);
      dataRef.current = cached;
      setError(null);
      setLoading(false);
      return;
    }

    const cached = getSessionResource<T>(key);
    if (cached !== null) {
      setDataState(cached);
      dataRef.current = cached;
      setError(null);
      setLoading(false);
      return;
    }

    setDataState(null);
    dataRef.current = null;
    setError(null);
    setLoading(true);
    void load();
  }, [enabled, initialData, key, load, ttlMs]);

  const refresh = useCallback(() => load(true), [load]);

  return {
    data: hasKeyChanged ? seededValueForCurrentKey : data,
    error: hasKeyChanged ? null : error,
    loading: hasKeyChanged ? enabled && seededValueForCurrentKey === null : loading,
    refresh,
    setData,
  };
}
