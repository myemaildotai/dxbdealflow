export type EarlyAccessLeadInput = {
  name: string;
  email: string;
  whatsapp_number: string;
};

export type EarlyAccessLeadErrors = Partial<Record<keyof EarlyAccessLeadInput, string>>;

export const EARLY_ACCESS_SOURCE = "coming_soon";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeWhatsappNumber(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

export function normalizeEarlyAccessLeadInput(input: Partial<EarlyAccessLeadInput> | null | undefined): EarlyAccessLeadInput {
  return {
    name: input?.name?.trim() || "",
    email: normalizeEmail(input?.email || ""),
    whatsapp_number: normalizeWhatsappNumber(input?.whatsapp_number || ""),
  };
}

export function validateEarlyAccessLeadInput(input: Partial<EarlyAccessLeadInput> | null | undefined) {
  const normalized = normalizeEarlyAccessLeadInput(input);
  const errors: EarlyAccessLeadErrors = {};

  if (!normalized.name) {
    errors.name = "Name is required.";
  }

  if (!normalized.email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(normalized.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!normalized.whatsapp_number) {
    errors.whatsapp_number = "WhatsApp number is required.";
  } else if (!PHONE_REGEX.test(normalized.whatsapp_number)) {
    errors.whatsapp_number = "Enter a valid WhatsApp number with country code.";
  }

  return {
    values: normalized,
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}
