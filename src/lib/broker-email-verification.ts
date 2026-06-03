import { createHash, randomInt, timingSafeEqual } from "crypto";

export const BROKER_EMAIL_OTP_TTL_MINUTES = 10;
export const BROKER_EMAIL_OTP_MAX_ATTEMPTS = 5;
export const BROKER_EMAIL_OTP_REQUEST_COOLDOWN_SECONDS = 60;

export function normalizeOtp(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "").slice(0, 6) : "";
}

export function isValidOtp(value: string) {
  return /^\d{6}$/.test(value);
}

export function generateBrokerEmailOtp() {
  return randomInt(100000, 1000000).toString();
}

export function getBrokerEmailOtpExpiresAt() {
  return new Date(Date.now() + BROKER_EMAIL_OTP_TTL_MINUTES * 60 * 1000).toISOString();
}

export function getBrokerEmailOtpCooldownCutoff() {
  return new Date(Date.now() - BROKER_EMAIL_OTP_REQUEST_COOLDOWN_SECONDS * 1000).toISOString();
}

function getOtpHashSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!secret) {
    throw new Error("Email OTP secret is missing.");
  }

  return secret;
}

export function hashBrokerEmailOtp(userId: string, email: string, otp: string) {
  return createHash("sha256")
    .update(`${getOtpHashSecret()}:${userId}:${email.trim().toLowerCase()}:${otp}`)
    .digest("hex");
}

export function verifyBrokerEmailOtpHash(userId: string, email: string, otp: string, expectedHash: string) {
  const actualHash = hashBrokerEmailOtp(userId, email, otp);
  const actual = Buffer.from(actualHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
