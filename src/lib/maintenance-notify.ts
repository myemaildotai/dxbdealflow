import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidEmailAddress } from "@/lib/email";
import { getMaintenanceModeState } from "@/lib/maintenance-mode";

export const MAINTENANCE_NOTIFY_MESSAGES = {
  maintenanceOff: "DXB Deal Flow is available now. Notification signup is no longer needed.",
  success: "Thank you! We\u2019ll notify you as soon as DXB Deal Flow is available again.",
  duplicate: "You are already on the notification list.",
} as const;

const NAME_MAX_LENGTH = 30;
const EMAIL_MAX_LENGTH = 60;

type MaintenanceNotifyValues = {
  name: string;
  email: string;
};

type MaintenanceNotifyValidation =
  | {
      isValid: true;
      values: MaintenanceNotifyValues;
      message: null;
    }
  | {
      isValid: false;
      values: null;
      message: string;
    };

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isDuplicateError(error: SupabaseErrorLike | null | undefined) {
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return error?.code === "23505" || message.includes("duplicate") || message.includes("unique");
}

export function validateMaintenanceNotifyInput(input: unknown): MaintenanceNotifyValidation {
  const body = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const name = readString(body.name);
  const email = readString(body.email).toLowerCase();

  if (!name) {
    return {
      isValid: false,
      values: null,
      message: "Name is required.",
    };
  }

  if (name.length > NAME_MAX_LENGTH) {
    return {
      isValid: false,
      values: null,
      message: `Name must be ${NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!email) {
    return {
      isValid: false,
      values: null,
      message: "Email is required.",
    };
  }

  if (email.length > EMAIL_MAX_LENGTH) {
    return {
      isValid: false,
      values: null,
      message: `Email must be ${EMAIL_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!isValidEmailAddress(email)) {
    return {
      isValid: false,
      values: null,
      message: "Enter a valid email address.",
    };
  }

  return {
    isValid: true,
    values: {
      name,
      email,
    },
    message: null,
  };
}

async function resolveMaintenanceVersion(supabase: SupabaseClient) {
  const { data: latestRow, error: latestError } = await supabase
    .from("maintenance_notify_requests")
    .select("maintenance_version")
    .order("maintenance_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw new Error("Failed to resolve the maintenance notification cycle.");
  }

  const latestVersion = Number((latestRow as { maintenance_version?: number | null } | null)?.maintenance_version || 0);

  if (!latestVersion) {
    return 1;
  }

  const { count, error: pendingError } = await supabase
    .from("maintenance_notify_requests")
    .select("id", { count: "exact", head: true })
    .eq("maintenance_version", latestVersion)
    .eq("status", "pending");

  if (pendingError) {
    throw new Error("Failed to resolve the maintenance notification cycle.");
  }

  return count && count > 0 ? latestVersion : latestVersion + 1;
}

export async function createMaintenanceNotifyRequest(
  supabase: SupabaseClient,
  values: MaintenanceNotifyValues,
) {
  const maintenanceState = await getMaintenanceModeState(supabase);

  if (!maintenanceState.enabled) {
    return {
      success: false,
      message: MAINTENANCE_NOTIFY_MESSAGES.maintenanceOff,
    };
  }

  const maintenanceVersion = await resolveMaintenanceVersion(supabase);
  const { error } = await supabase.from("maintenance_notify_requests").insert({
    name: values.name,
    email: values.email,
    maintenance_version: maintenanceVersion,
    status: "pending",
  });

  if (error) {
    if (isDuplicateError(error)) {
      return {
        success: true,
        duplicate: true,
        message: MAINTENANCE_NOTIFY_MESSAGES.duplicate,
      };
    }

    throw new Error("Failed to save your notification request.");
  }

  return {
    success: true,
    message: MAINTENANCE_NOTIFY_MESSAGES.success,
  };
}
