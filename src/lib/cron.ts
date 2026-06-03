import { NextRequest, NextResponse } from "next/server";
import { withNoStore } from "@/lib/deal-server";

export function validateCronRequest(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      withNoStore({ status: 500 })
    );
  }

  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice("bearer ".length).trim()
    : "";
  const headerSecret = request.headers.get("x-cron-secret") || "";

  if (bearerToken !== expectedSecret && headerSecret !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized cron request." },
      withNoStore({ status: 401 })
    );
  }

  return null;
}
