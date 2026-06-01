import { NextRequest, NextResponse } from "next/server";
import {
  BROKER_EMAIL_OTP_MAX_ATTEMPTS,
  isValidOtp,
  normalizeOtp,
  verifyBrokerEmailOtpHash,
} from "@/lib/broker-email-verification";
import { getServiceSupabase, jsonError, requireApprovedBroker, withNoStore } from "@/lib/deal-server";
import { isValidEmailAddress } from "@/lib/email";

type BrokerEmailVerificationRow = {
  email: string;
  verified_at: string | null;
};

type BrokerEmailOtpRow = {
  id: string;
  otp_hash: string;
  expires_at: string;
  attempts: number;
  max_attempts: number | null;
};

export async function POST(request: NextRequest) {
  const auth = await requireApprovedBroker(request);
  if ("error" in auth) return auth.error;

  const brokerEmail = auth.user.email?.trim().toLowerCase() || "";
  if (!isValidEmailAddress(brokerEmail)) {
    return jsonError("A valid broker email is required before verification.", 400);
  }

  const body = await request.json().catch(() => null);
  const otp = normalizeOtp(body?.otp);

  if (!isValidOtp(otp)) {
    return jsonError("Enter the 6-digit OTP sent to your email.", 400);
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

    const { data: otpRow } = await supabase
      .from("broker_email_verification_otps")
      .select("id, otp_hash, expires_at, attempts, max_attempts")
      .eq("user_id", auth.user.id)
      .eq("email", brokerEmail)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentOtp = otpRow as BrokerEmailOtpRow | null;
    if (!currentOtp) {
      return jsonError("No active OTP was found. Please request a new OTP.", 400);
    }

    if (new Date(currentOtp.expires_at).getTime() <= Date.now()) {
      await supabase
        .from("broker_email_verification_otps")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", currentOtp.id);
      return jsonError("This OTP has expired. Please request a new OTP.", 400);
    }

    const maxAttempts = currentOtp.max_attempts || BROKER_EMAIL_OTP_MAX_ATTEMPTS;
    if (currentOtp.attempts >= maxAttempts) {
      await supabase
        .from("broker_email_verification_otps")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", currentOtp.id);
      return jsonError("Too many incorrect attempts. Please request a new OTP.", 429);
    }

    const isMatch = verifyBrokerEmailOtpHash(auth.user.id, brokerEmail, otp, currentOtp.otp_hash);
    if (!isMatch) {
      const nextAttempts = currentOtp.attempts + 1;
      await supabase
        .from("broker_email_verification_otps")
        .update({
          attempts: nextAttempts,
          consumed_at: nextAttempts >= maxAttempts ? new Date().toISOString() : null,
        })
        .eq("id", currentOtp.id);

      return jsonError(
        nextAttempts >= maxAttempts
          ? "Too many incorrect attempts. Please request a new OTP."
          : "The OTP you entered is incorrect.",
        nextAttempts >= maxAttempts ? 429 : 400
      );
    }

    const verifiedAt = new Date().toISOString();
    const { error: verificationError } = await supabase.from("broker_email_verifications").upsert(
      {
        user_id: auth.user.id,
        email: brokerEmail,
        verified_at: verifiedAt,
      },
      { onConflict: "user_id" }
    );

    if (verificationError) {
      return jsonError(verificationError.message || "Failed to verify email.", 500);
    }

    await supabase
      .from("broker_email_verification_otps")
      .update({ consumed_at: verifiedAt, attempts: currentOtp.attempts + 1 })
      .eq("id", currentOtp.id);

    await supabase.from("activity_log").insert({
      actor_user_id: auth.user.id,
      action: "broker_email_verified",
      target_table: "broker_email_verifications",
      target_id: auth.user.id,
      metadata: { email: brokerEmail, verifiedAt },
    });

    return NextResponse.json({ success: true, emailVerifiedAt: verifiedAt }, withNoStore());
  } catch (error) {
    console.error("[broker-email-verification] Verify OTP failed.", {
      userId: auth.user.id,
      error: error instanceof Error ? error.message : error,
    });
    return jsonError(error instanceof Error ? error.message : "Failed to verify OTP.", 500);
  }
}
