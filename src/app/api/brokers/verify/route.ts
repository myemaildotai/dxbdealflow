import { NextRequest, NextResponse } from "next/server";
import { verifyBrokerRegistration } from "@/lib/broker-verification";
import { jsonError, withNoStore } from "@/lib/deal-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const brokerNumber = typeof body.brokerNumber === "string" ? body.brokerNumber : typeof body.reraBrn === "string" ? body.reraBrn : "";
    const email = typeof body.email === "string" ? body.email : "";
    const mobileNumber = typeof body.mobileNumber === "string" ? body.mobileNumber : typeof body.phone === "string" ? body.phone : "";

    if (!brokerNumber) {
      return jsonError("brokerNumber is required.");
    }

    if (!email) {
      return jsonError("email is required.");
    }

    if (!mobileNumber) {
      return jsonError("mobileNumber is required.");
    }

    const result = await verifyBrokerRegistration({
      brokerNumber,
      email,
      mobileNumber,
    });

    return NextResponse.json(
      {
        broker_found: result.broker_found,
        email_match: result.email_match,
        phone_match: result.phone_match,
        status: result.status,
      },
      withNoStore()
    );
  } catch {
    return NextResponse.json(
      {
        broker_found: false,
        email_match: false,
        phone_match: false,
        status: "pending",
      },
      withNoStore()
    );
  }
}
