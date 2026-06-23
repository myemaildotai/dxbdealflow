"use client";

import { useCallback, useEffect } from "react";
import type { AuthUser } from "@/auth/types";
import {
  applyNotificationRealtimeChange,
  type NotificationRealtimeRow,
  type NotificationsPagePayload,
} from "@/lib/notifications";
import { supabase, syncSupabaseRealtimeAuth } from "@/lib/supabase";

type SetSessionData<T> = (value: T | null | ((current: T | null) => T | null)) => void;

export function useRealtimeNotificationRefresh({
  accountUser,
  adminEnabled,
  brokerEnabled,
  setAdminNotifications,
  setBrokerNotifications,
}: {
  accountUser: AuthUser | null;
  adminEnabled: boolean;
  brokerEnabled: boolean;
  setAdminNotifications: SetSessionData<NotificationsPagePayload>;
  setBrokerNotifications: SetSessionData<NotificationsPagePayload>;
}) {
  const userId = accountUser?.platformUser?.id ?? accountUser?.uid ?? null;
  const roleEnabled = adminEnabled || brokerEnabled;
  const updatePayload = useCallback(
    (payload: {
      eventType: "INSERT" | "UPDATE" | "DELETE";
      new: Record<string, unknown>;
      old: Record<string, unknown>;
    }) => {
      const nextRow = Object.keys(payload.new).length
        ? (payload.new as unknown as NotificationRealtimeRow)
        : null;
      const previousRow = Object.keys(payload.old).length
        ? (payload.old as unknown as NotificationRealtimeRow)
        : null;
      if (brokerEnabled) {
        setBrokerNotifications((current) =>
          applyNotificationRealtimeChange(current, payload.eventType, nextRow, previousRow)
        );
      }
      if (adminEnabled) {
        setAdminNotifications((current) =>
          applyNotificationRealtimeChange(current, payload.eventType, nextRow, previousRow, { unhandledOnly: true })
        );
      }
    },
    [adminEnabled, brokerEnabled, setAdminNotifications, setBrokerNotifications]
  );

  useEffect(() => {
    if (!roleEnabled || !userId) return;

    let didCleanup = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      const accessToken = await syncSupabaseRealtimeAuth();
      if (didCleanup || !accessToken) return;

      channel = supabase
        .channel(`notification-feed-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_user_id=eq.${userId}`,
          },
          (payload) => updatePayload(payload as Parameters<typeof updatePayload>[0])
        );

      channel.subscribe();
    };

    void subscribe();

    return () => {
      didCleanup = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [roleEnabled, updatePayload, userId]);
}
