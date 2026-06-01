"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type SupabaseRow = {
  id: string;
  [key: string]: unknown;
};

type SupabaseFilter = {
  column: string;
  operator: string;
  value: unknown;
};

type SupabaseSort = {
  column: string;
  ascending?: boolean;
};

// Hook for real-time table subscription
export function useSupabaseTable<T extends SupabaseRow = SupabaseRow>(tableName: string, userId?: string) {
  const [data, setData] = useState<T[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");

  const fetchData = useCallback(async () => {
    setStatus("loading");
    try {
      let query = supabase.from(tableName).select("*");
      
      // Add user filter if provided
      if (userId) {
        query = query.eq("owner_uid", userId);
      }

      const { data: fetchedData, error } = await query;

      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        setStatus("error");
        return;
      }

      setData((fetchedData as T[] | null) || []);
      setStatus("success");
    } catch (error) {
      console.error(`Error fetching ${tableName}:`, error);
      setData([]);
      setStatus("error");
    }
  }, [tableName, userId]);

  useEffect(() => {
    fetchData();

    // Set up real-time subscription
    const handleChanges = (payload: RealtimePostgresChangesPayload<T>) => {
      if (payload.eventType === "INSERT") {
        setData((prev) => [...prev, payload.new]);
      } else if (payload.eventType === "UPDATE") {
        setData((prev) => prev.map((item) => (item.id === payload.new.id ? payload.new : item)));
      } else if (payload.eventType === "DELETE") {
        setData((prev) => prev.filter((item) => item.id !== payload.old.id));
      }
    };

    let channel = supabase
      .channel(`${tableName}_changes`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tableName,
        },
        handleChanges
      );

    // Add user filter to subscription if provided
    if (userId) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tableName,
          filter: `owner_uid=eq.${userId}`,
        },
        handleChanges
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, userId, fetchData]);

  return { data, status, refetch: fetchData };
}

export function useSupabaseRecord<T extends SupabaseRow = SupabaseRow>(tableName: string, recordId: string | null | undefined) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");

  const fetchData = useCallback(async () => {
    if (!recordId) {
      setData(null);
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const { data: fetchedData, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", recordId)
        .single();

      if (error) {
        console.error(`Error fetching record ${recordId}:`, error);
        setData(null);
        setStatus("error");
        return;
      }

      setData(fetchedData as T);
      setStatus("success");
    } catch (error) {
      console.error(`Error fetching record ${recordId}:`, error);
      setData(null);
      setStatus("error");
    }
  }, [tableName, recordId]);

  useEffect(() => {
    fetchData();

    if (!recordId) return;

    // Set up real-time subscription for specific record
    const channel = supabase
      .channel(`${tableName}_${recordId}_changes`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tableName,
          filter: `id=eq.${recordId}`,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (payload.eventType === "UPDATE") {
            setData(payload.new as T);
          } else if (payload.eventType === "DELETE") {
            setData(null);
            setStatus("error");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, recordId, fetchData]);

  return { data, status, refetch: fetchData };
}

// Hook for filtered table subscription with advanced options
interface UseFilteredSupabaseTableProps {
  tableName: string;
  userId?: string;
  filters?: SupabaseFilter[];
  orderBy?: SupabaseSort[];
  limit?: number;
  offset?: number;
  trigger?: readonly unknown[]; // For dependency tracking
}

export function useFilteredSupabaseTable<T extends SupabaseRow = SupabaseRow>({
  tableName,
  userId,
  filters = [],
  orderBy,
  limit,
  offset,
  trigger = [],
}: UseFilteredSupabaseTableProps) {
  const [data, setData] = useState<T[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    setStatus("loading");
    try {
      let query = supabase.from(tableName).select("*", { count: "exact" });
      
      // Add user filter if provided
      if (userId) {
        query = query.eq("owner_uid", userId);
      }

      // Apply additional filters
      filters.forEach((filter) => {
        query = query.filter(filter.column, filter.operator, filter.value as string);
      });

      // Apply ordering
      if (orderBy && orderBy.length > 0) {
        orderBy.forEach((order) => {
          query = query.order(order.column, { ascending: order.ascending ?? false });
        });
      }

      // Apply pagination
      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset) {
        query = query.range(offset, offset + (limit || 1000) - 1);
      }

      const { data: fetchedData, error, count } = await query;

      if (error) {
        console.error(`Error fetching filtered ${tableName}:`, error);
        setStatus("error");
        return;
      }

      setData((fetchedData as T[] | null) || []);
      setTotalCount(count || 0);
      setStatus("success");
    } catch (error) {
      console.error(`Error fetching filtered ${tableName}:`, error);
      setData([]);
      setStatus("error");
    }
  }, [filters, limit, offset, orderBy, tableName, userId]);

  useEffect(() => {
    fetchData();

    // Set up real-time subscription (simplified - listens to all changes)
    const channel = supabase
      .channel(`${tableName}_filtered_changes`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tableName,
        },
        () => {
          // Re-fetch data when changes occur
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, tableName, trigger]);

  return { data, status, totalCount, refetch: fetchData };
}

// Backward compatibility exports
export const useCollection = useSupabaseTable;
export const useDocument = useSupabaseRecord;
export const useFilteredCollection = useFilteredSupabaseTable;
