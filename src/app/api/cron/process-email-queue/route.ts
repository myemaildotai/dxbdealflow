import { NextRequest, NextResponse } from "next/server";
import { validateCronRequest } from "@/lib/cron";
import { withNoStore } from "@/lib/deal-server";
import { processEmailQueue } from "@/lib/email-queue-processor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const cronError = validateCronRequest(request);
  if (cronError) return cronError;

  const result = await processEmailQueue(25);

  return NextResponse.json(
    {
      success: true,
      ...result,
    },
    withNoStore()
  );
}

export async function GET(request: NextRequest) {
  const cronError = validateCronRequest(request);
  if (cronError) return cronError;

  const result = await processEmailQueue(25);

  return NextResponse.json(
    {
      success: true,
      ...result,
    },
    withNoStore()
  );
}
