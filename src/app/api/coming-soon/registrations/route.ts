import { NextRequest, NextResponse } from "next/server";
import { validateComingSoonRegistrationInput } from "@/lib/coming-soon";
import { getServiceSupabase, withNoStore } from "@/lib/deal-server";
import { notifyComingSoonInterestConfirmation } from "@/lib/email-notifications";

function resolveDuplicateFieldErrors(message: string) {
  const normalizedMessage = message.toLowerCase();
  const fieldErrors: Record<string, string> = {};

  if (normalizedMessage.includes("email")) {
    fieldErrors.email = "This email is already registered for early interest.";
  }

  if (normalizedMessage.includes("whatsapp")) {
    fieldErrors.whatsapp_number = "This WhatsApp number is already registered for early interest.";
  }

  return fieldErrors;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const { values, errors, isValid } = validateComingSoonRegistrationInput(body);

    if (!isValid) {
      return NextResponse.json(
        {
          error: errors.website ? "We could not submit that request. Please try again." : "Please correct the highlighted fields.",
          fieldErrors: errors,
        },
        withNoStore({ status: 400 })
      );
    }

    const supabase = getServiceSupabase();
    const { data: role, error: roleError } = await supabase
      .from("coming_soon_role_options")
      .select("id, name")
      .eq("id", values.role_id)
      .eq("is_active", true)
      .maybeSingle();

    if (roleError) {
      throw new Error("Failed to validate selected role.");
    }

    if (!role) {
      return NextResponse.json(
        {
          error: "Please select an active role option.",
          fieldErrors: {
            role_id: "Select an active role.",
          },
        },
        withNoStore({ status: 400 })
      );
    }

    const [emailMatch, phoneMatch] = await Promise.all([
      supabase
        .from("coming_soon_registrations")
        .select("id", { count: "exact", head: true })
        .eq("email", values.email),
      supabase
        .from("coming_soon_registrations")
        .select("id", { count: "exact", head: true })
        .eq("whatsapp_number", values.whatsapp_number),
    ]);

    if (emailMatch.error || phoneMatch.error) {
      throw new Error("Failed to check existing registrations.");
    }

    const duplicateFieldErrors: Record<string, string> = {};

    if (emailMatch.count) {
      duplicateFieldErrors.email = "This email is already registered for early interest.";
    }

    if (phoneMatch.count) {
      duplicateFieldErrors.whatsapp_number = "This WhatsApp number is already registered for early interest.";
    }

    if (Object.keys(duplicateFieldErrors).length) {
      return NextResponse.json(
        {
          error: "You are already registered for early interest.",
          fieldErrors: duplicateFieldErrors,
        },
        withNoStore({ status: 409 })
      );
    }

    const { error: insertError } = await supabase.from("coming_soon_registrations").insert({
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      whatsapp_number: values.whatsapp_number,
      instagram_handle: values.instagram_handle || null,
      company_agency_name: values.company_agency_name,
      role_id: role.id,
      role_name: role.name,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            error: "You are already registered for early interest.",
            fieldErrors: resolveDuplicateFieldErrors(`${insertError.message} ${insertError.details || ""}`),
          },
          withNoStore({ status: 409 })
        );
      }

      throw new Error("Failed to save your registration.");
    }

    try {
      await notifyComingSoonInterestConfirmation({ email: values.email });
    } catch (emailError) {
      console.error("[coming-soon] Failed to trigger interest confirmation email.", {
        error: emailError instanceof Error ? emailError.message : "Unknown email trigger error.",
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Thanks. You are on the early interest list.",
      },
      withNoStore({ status: 201 })
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to submit your registration.",
      },
      withNoStore({ status: 500 })
    );
  }
}
