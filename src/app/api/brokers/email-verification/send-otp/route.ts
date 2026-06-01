import { NextRequest, NextResponse } from "next/server";
import {
  BROKER_EMAIL_OTP_MAX_ATTEMPTS,
  generateBrokerEmailOtp,
  getBrokerEmailOtpCooldownCutoff,
  getBrokerEmailOtpExpiresAt,
  hashBrokerEmailOtp,
} from "@/lib/broker-email-verification";
import { getServiceSupabase, jsonError, requireApprovedBroker, withNoStore } from "@/lib/deal-server";
import { getFullName } from "@/lib/deal-utils";
import { isValidEmailAddress } from "@/lib/email";
import { sendBrokerEmailVerificationOtp } from "@/lib/email-notifications";

type BrokerEmailVerificationRow = {
  email: string;
  verified_at: string | null;
};

export async function POST(request: NextRequest) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const brokerEmail = auth.user.email?.trim().toLowerCase() || "";
  if (!isValidEmailAddress(brokerEmail)) {
    return jsonError("A valid broker email is required before verification.", 400);
  }

  try {
    const supabase = getServiceSupabase();
    const { data: verification } = await supabase
      .from("broker_email_verifications")
      .select("email, verified_at")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    const currentVerification = verification as BrokerEmailVerificationRow | null;
    if (currentVerification?.verified_at && currentVerification.email?.toLowerCase() === brokerEmail) {
      return NextResponse.json(
        { success: true, alreadyVerified: true, emailVerifiedAt: currentVerification.verified_at },
        withNoStore()
      );
    }

    const { data: recentOtp } = await supabase
      .from("broker_email_verification_otps")
      .select("id, created_at")
      .eq("user_id", auth.user.id)
      .eq("email", brokerEmail)
      .is("consumed_at", null)
      .gte("created_at", getBrokerEmailOtpCooldownCutoff())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentOtp) {
      return jsonError("Please wait a moment before requesting another OTP.", 429);
    }

    const now = new Date().toISOString();
    await supabase
      .from("broker_email_verification_otps")
      .update({ consumed_at: now })
      .eq("user_id", auth.user.id)
      .eq("email", brokerEmail)
      .is("consumed_at", null);

    const otp = generateBrokerEmailOtp();
    const expiresAt = getBrokerEmailOtpExpiresAt();
    const otpHash = hashBrokerEmailOtp(auth.user.id, brokerEmail, otp);

    const { error: verificationError } = await supabase.from("broker_email_verifications").upsert(
      {
        user_id: auth.user.id,
        email: brokerEmail,
        verified_at: null,
      },
      { onConflict: "user_id" }
    );

    if (verificationError) {
      return jsonError(verificationError.message || "Failed to prepare email verification.", 500);
    }

    const { data: otpRow, error: otpError } = await supabase
      .from("broker_email_verification_otps")
      .insert({
        user_id: auth.user.id,
        email: brokerEmail,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempts: 0,
        max_attempts: BROKER_EMAIL_OTP_MAX_ATTEMPTS,
      })
      .select("id")
      .single();

    if (otpError || !otpRow) {
      return jsonError(otpError?.message || "Failed to create verification OTP.", 500);
    }

    const emailResult = await sendBrokerEmailVerificationOtp({
      brokerName: getFullName(auth.user.first_name, auth.user.last_name),
      brokerEmail,
      otp,
      expiresAt,
    });

    if (!emailResult.ok) {
      await supabase
        .from("broker_email_verification_otps")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", otpRow.id);

      console.error("[broker-email-verification] Failed to send OTP email.", {
        userId: auth.user.id,
        provider: emailResult.provider,
        error: emailResult.error,
      });

      return jsonError("Failed to send verification OTP. Please try again later.", 502);
    }

    await supabase.from("activity_log").insert({
      actor_user_id: auth.user.id,
      action: "broker_email_verification_otp_sent",
      target_table: "broker_email_verifications",
      target_id: auth.user.id,
      metadata: { email: brokerEmail, expiresAt },
    });

    return NextResponse.json({ success: true, expiresAt }, withNoStore());
  } catch (error) {
    console.error("[broker-email-verification] Send OTP failed.", {
      userId: auth.user.id,
      error: error instanceof Error ? error.message : error,
    });
    return jsonError(error instanceof Error ? error.message : "Failed to send verification OTP.", 500);
  }
}
