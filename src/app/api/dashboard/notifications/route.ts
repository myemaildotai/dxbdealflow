import { NextRequest, NextResponse } from "next/server";
import type { BrokerNotificationTimings } from "@/lib/broker-dashboard-server";
import { getServiceSupabase, requireApprovedBroker, withNoStore } from "@/lib/deal-server";
import { getNotificationsPage } from "@/lib/notifications-server";

function recordTiming(timings: BrokerNotificationTimings, name: string, startedAt: number) {
  timings.set(name, performance.now() - startedAt);
}

function buildServerTimingHeader(timings: BrokerNotificationTimings) {
  return Array.from(timings.entries())
    .map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`)
    .join(", ");
}

export async function GET(request: NextRequest) {
  const requestStartedAt = performance.now();
  const timings: BrokerNotificationTimings = new Map();
  const authStartedAt = performance.now();
  const auth = await requireApprovedBroker(request, { includeBrokerProfileId: true });
  recordTiming(timings, "auth", authStartedAt);
  timings.set("broker_profile", 0);

  if ("error" in auth && auth.error) {
    recordTiming(timings, "total", requestStartedAt);
    auth.error.headers.set("Server-Timing", buildServerTimingHeader(timings));
    return auth.error;
  }

  const supabase = getServiceSupabase();
  const notificationsStartedAt = performance.now();
  const payload = await getNotificationsPage(supabase, {
    cursor: request.nextUrl.searchParams.get("cursor"),
    limit: Number(request.nextUrl.searchParams.get("limit")),
    recipientRole: "broker",
    recipientUserId: auth.user.id,
  });
  recordTiming(timings, "notifications", notificationsStartedAt);
  const serializationStartedAt = performance.now();
  const serializedPayload = JSON.stringify(payload);
  recordTiming(timings, "serialization", serializationStartedAt);
  recordTiming(timings, "total", requestStartedAt);

  return new NextResponse(
    serializedPayload,
    withNoStore({
      headers: {
        "Content-Type": "application/json",
        "Server-Timing": buildServerTimingHeader(timings),
      },
    })
  );
}
