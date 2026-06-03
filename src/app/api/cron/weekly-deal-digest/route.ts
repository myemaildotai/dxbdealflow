import { NextRequest, NextResponse } from "next/server";
import { validateCronRequest } from "@/lib/cron";
import { withNoStore } from "@/lib/deal-server";
import { sendWeeklyDealDigestEmails } from "@/lib/email-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronError = validateCronRequest(request);
  if (cronError) return cronError;

  const result = await sendWeeklyDealDigestEmails();

  return NextResponse.json(
    {
      success: true,
      result,
    },
    withNoStore()
  );
}
