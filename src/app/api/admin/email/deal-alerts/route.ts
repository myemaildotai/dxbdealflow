import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAdmin, withNoStore } from "@/lib/deal-server";
import { NewDealAlertCooldownError, triggerNewDealAlertForListing } from "@/lib/email-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const listingId = typeof body?.listingId === "string" ? body.listingId.trim() : "";

  if (!listingId) {
    return jsonError("listingId is required.", 400);
  }

  let result: Awaited<ReturnType<typeof triggerNewDealAlertForListing>>;

  try {
    result = await triggerNewDealAlertForListing({
      listingId,
      subject: typeof body?.subject === "string" ? body.subject : null,
      limitedStockWarning: typeof body?.limitedStockWarning === "string" ? body.limitedStockWarning : null,
      campaignKey: typeof body?.campaignKey === "string" ? body.campaignKey : null,
      includeListingOwner: Boolean(body?.includeListingOwner),
    });
  } catch (error) {
    if (error instanceof NewDealAlertCooldownError) {
      return NextResponse.json(
        {
          error: error.message,
          availableAt: error.availableAt,
          lastSentAt: error.lastSentAt,
        },
        withNoStore({ status: 429 })
      );
    }

    return jsonError(error instanceof Error ? error.message : "Failed to send New Deal Alert.", 500);
  }

  return NextResponse.json(
    {
      success: true,
      result,
    },
    withNoStore()
  );
}
