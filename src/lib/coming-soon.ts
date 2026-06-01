import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeInstagramProfile } from "@/lib/broker-social";
import { isValidInternationalPhoneNumber, normalizePhoneNumber } from "@/lib/phone";

export const COMING_SOON_MODE_SETTING_KEY = "coming_soon_mode";

export type ComingSoonModeState = {
  enabled: boolean;
  updated_at: string | null;
  updated_by: string | null;
};

export type ComingSoonRoleOption = {
  id: string;
  name: string;
  display_order: number;
};

export type ComingSoonRegistrationInput = {
  first_name: string;
  last_name: string;
  email: string;
  whatsapp_number: string;
  instagram_handle: string;
  company_agency_name: string;
  role_id: string;
  website?: string;
};

export type ComingSoonRegistrationErrors = Partial<Record<keyof ComingSoonRegistrationInput, string>>;

type SettingsRow = {
  value: { enabled?: boolean } | null;
  updated_at: string | null;
  updated_by: string | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseComingSoonModeState(row: SettingsRow | null | undefined): ComingSoonModeState {
  return {
    enabled: !!row?.value?.enabled,
    updated_at: row?.updated_at || null,
    updated_by: row?.updated_by || null,
  };
}

export async function getComingSoonModeState(supabase: SupabaseClient): Promise<ComingSoonModeState> {
  const { data, error } = await supabase
    .from("settings")
    .select("value, updated_at, updated_by")
    .eq("key", COMING_SOON_MODE_SETTING_KEY)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load coming soon mode state.");
  }

  return parseComingSoonModeState((data as SettingsRow | null) || null);
}

export async function setComingSoonModeState(supabase: SupabaseClient, enabled: boolean, updatedBy: string) {
  const { data, error } = await supabase
    .from("settings")
    .upsert(
      {
        key: COMING_SOON_MODE_SETTING_KEY,
        value: { enabled },
        updated_by: updatedBy,
      },
      { onConflict: "key" }
    )
    .select("value, updated_at, updated_by")
    .single();

  if (error) {
    throw new Error("Failed to update coming soon mode state.");
  }

  return parseComingSoonModeState(data as SettingsRow);
}

export async function getActiveComingSoonRoleOptions(supabase: SupabaseClient): Promise<ComingSoonRoleOption[]> {
  const { data, error } = await supabase
    .from("coming_soon_role_options")
    .select("id, name, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error("Failed to load coming soon role options.");
  }

  return ((data as ComingSoonRoleOption[] | null) || []).map((role) => ({
    id: role.id,
    name: role.name,
    display_order: role.display_order,
  }));
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeWhatsappNumber(value: string) {
  return normalizePhoneNumber(value);
}

function trimToLength(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

export function normalizeComingSoonRegistrationInput(
  input: Partial<ComingSoonRegistrationInput> | null | undefined
): ComingSoonRegistrationInput {
  return {
    first_name: trimToLength(input?.first_name || "", 80),
    last_name: trimToLength(input?.last_name || "", 80),
    email: normalizeEmail(input?.email || ""),
    whatsapp_number: normalizeWhatsappNumber(input?.whatsapp_number || ""),
    instagram_handle: trimToLength(input?.instagram_handle || "", 120),
    company_agency_name: trimToLength(input?.company_agency_name || "", 160),
    role_id: (input?.role_id || "").trim(),
    website: (input?.website || "").trim(),
  };
}

export function validateComingSoonRegistrationInput(input: Partial<ComingSoonRegistrationInput> | null | undefined) {
  const values = normalizeComingSoonRegistrationInput(input);
  const errors: ComingSoonRegistrationErrors = {};

  if (values.website) {
    errors.website = "Please try again.";
  }

  if (!values.first_name) {
    errors.first_name = "First name is required.";
  }

  if (!values.last_name) {
    errors.last_name = "Last name is required.";
  }

  if (!values.email) {
    errors.email = "Email address is required.";
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.whatsapp_number) {
    errors.whatsapp_number = "WhatsApp number is required.";
  } else if (!isValidInternationalPhoneNumber(values.whatsapp_number)) {
    errors.whatsapp_number = "Enter a valid WhatsApp number including country code.";
  }

  if (values.instagram_handle) {
    try {
      values.instagram_handle = normalizeInstagramProfile(values.instagram_handle) || "";
    } catch (error) {
      errors.instagram_handle = error instanceof Error ? error.message : "Enter a valid Instagram profile URL or handle.";
    }
  }

  if (!values.company_agency_name) {
    errors.company_agency_name = "Company or agency name is required.";
  }

  if (!values.role_id) {
    errors.role_id = "Select your role.";
  } else if (!UUID_REGEX.test(values.role_id)) {
    errors.role_id = "Select a valid role.";
  }

  return {
    values,
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}
