import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, withNoStore } from "@/lib/deal-server";
import { EARLY_ACCESS_SOURCE, validateEarlyAccessLeadInput } from "@/lib/early-access";
import { notifyComingSoonInterestConfirmation } from "@/lib/email-notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const { values, errors, isValid } = validateEarlyAccessLeadInput(body);

    if (!isValid) {
      return NextResponse.json(
        {
          error: "Please correct the highlighted fields.",
          fieldErrors: errors,
        },
        withNoStore({ status: 400 })
      );
    }

    const supabase = getServiceSupabase();
    const [emailMatch, phoneMatch] = await Promise.all([
      supabase.from("early_access_leads").select("id", { count: "exact", head: true }).eq("email", values.email),
      supabase.from("early_access_leads").select("id", { count: "exact", head: true }).eq("whatsapp_number", values.whatsapp_number),
    ]);

    if (emailMatch.error || phoneMatch.error) {
      throw new Error("Failed to validate existing early access leads.");
    }

    const fieldErrors: Record<string, string> = {};

    if (emailMatch.count) {
      fieldErrors.email = "This email is already registered for early access.";
    }

    if (phoneMatch.count) {
      fieldErrors.whatsapp_number = "This WhatsApp number is already registered for early access.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        {
          error: "You have already joined the early access list.",
          fieldErrors,
        },
        withNoStore({ status: 409 })
      );
    }

    const { data, error } = await supabase
      .from("early_access_leads")
      .insert({
        name: values.name,
        email: values.email,
        whatsapp_number: values.whatsapp_number,
        source: EARLY_ACCESS_SOURCE,
      })
      .select("id")
      .single();

    if (error || !data) {
      const duplicateFieldErrors: Record<string, string> = {};
      const details = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();

      if (error?.code === "23505" || details.includes("duplicate")) {
        if (details.includes("email")) {
          duplicateFieldErrors.email = "This email is already registered for early access.";
        }

        if (details.includes("whatsapp_number")) {
          duplicateFieldErrors.whatsapp_number = "This WhatsApp number is already registered for early access.";
        }

        return NextResponse.json(
          {
            error: "You have already joined the early access list.",
            fieldErrors: duplicateFieldErrors,
          },
          withNoStore({ status: 409 })
        );
      }

      throw new Error("Failed to save early access lead.");
    }

    // Email trigger: early-access interest confirmation before launch.
    await notifyComingSoonInterestConfirmation({
      email: values.email,
      registrationId: data.id,
      source: "early_access_leads",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Thanks. You are on the early access list.",
      },
      withNoStore({ status: 201 })
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to join the early access list.",
      },
      withNoStore({ status: 500 })
    );
  }
}
