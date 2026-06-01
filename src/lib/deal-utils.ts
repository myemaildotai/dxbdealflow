import { APP_CONFIG } from "@/config";
export {
  LISTING_DOCUMENT_ACCEPT,
  LISTING_DOCUMENT_MAX_SIZE,
  LISTING_DOCUMENT_MAX_SIZE_LABEL,
  LISTING_DOCUMENT_UPLOAD_CONFIG,
  getListingDocumentAllowedFormatsLabel,
  getListingDocumentValidationError,
  isSupportedListingDocument,
} from "@/lib/document-upload";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const LISTING_RENEWAL_WINDOW_DAYS = 14;

export function cn(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(" ");
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "TBD";
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "TBD";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "TBD";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function statusClasses(status: string) {
  switch (status) {
    case "active":
    case "approved":
      return "badge border-[#bfe9d1] bg-[#edf9f2] text-[#1f8a4d]";
    case "medium":
    case "pending":
      return "badge border-[#f3dca5] bg-[#fff7e7] text-[#b97805]";
    case "low":
    case "planning":
      return "badge border-[#d6dceb] bg-[#f5f7fb] text-[#5d6c88]";
    case "inactive":
      return "badge border-[#d6dceb] bg-[#f6f8fb] text-[#6b7482]";
    case "read":
      return "badge border-[#d6dceb] bg-[#f6f8fb] text-[#5d6c88]";
    case "new":
      return "badge border-[#f3dca5] bg-[#fff7e7] text-[#b97805]";
    case "contacted":
      return "badge border-[#bfe9d1] bg-[#edf9f2] text-[#1f8a4d]";
    case "archived":
      return "badge border-[#d6dceb] bg-[#f6f8fb] text-[#6b7482]";
    case "closed":
      return "badge border-[#ecc4bd] bg-[#fff1ee] text-[#b85546]";
    case "high":
    case "rejected":
    case "deactivated":
      return "badge border-[#ecc4bd] bg-[#fff1ee] text-[#b85546]";
    case "deleted":
      return "badge border-[#ecc4bd] bg-[#fff1ee] text-[#b85546]";
    case "suspended":
    case "expired":
      return "badge border-[#d6dceb] bg-[#f6f8fb] text-[#6b7482]";
    case "hot":
      return "badge border-[#e7d195] bg-[#fff8df] text-[#8e6a0e]";
    default:
      return "badge border-[#d6dceb] bg-[#f6f8fb] text-[#6b7482]";
  }
}

export function initials(name?: string | null) {
  if (!name) return "DE";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getFullName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Broker";
}

export function formatDealType(value: string | null | undefined) {
  switch (value) {
    case "off_plan":
    case "offplan":
      return "Off-Plan";
    case "secondary":
      return "Secondary";
    case "distressed":
      return "Distressed";
    case "urgent_sale":
    case "urgent":
      return "Urgent Sale";
    default:
      return value || "Unknown";
  }
}

export function formatRequirementUrgency(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatRequirementStatus(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

export function formatRequirementMatchStatus(value: string | null | undefined) {
  return formatRequirementStatus(value);
}

export function formatPropertyType(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatUserStatus(value: string | null | undefined) {
  if (!value) return "Unknown";
  if (value === "approved") return "Active";
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

export function formatListingStatus(value: string | null | undefined) {
  if (!value) return "Unknown";
  if (value === "approved") return "Active";
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

export function formatListingDisplayStatus(value: string | null | undefined, deletedAt?: string | null) {
  if (deletedAt) return "Deleted";
  return formatListingStatus(value);
}

export function getWhatsappLink(phone: string, text: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return `${APP_CONFIG.whatsappPrefix}${digits}?text=${encodeURIComponent(text)}`;
}

export function getMailtoLink(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseBoolean(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value === "string") {
    return value === "true" || value === "1" || value === "on";
  }
  return false;
}

export function isActiveBrokerStatus(status: string | null | undefined) {
  return status === "active" || status === "approved";
}

export function isActiveListingStatus(status: string | null | undefined) {
  return status === "active" || status === "approved";
}

export function getLastReconfirmedAt(renewalDueAt?: string | null, fallbackDate?: string | null) {
  if (renewalDueAt) {
    return new Date(new Date(renewalDueAt).getTime() - LISTING_RENEWAL_WINDOW_DAYS * DAY_IN_MS).toISOString();
  }
  return fallbackDate || null;
}

export function getRenewalMeta(renewalDueAt?: string | null) {
  if (!renewalDueAt) {
    return { label: "Renewal not scheduled", tone: "neutral" as const, daysUntilDue: null as number | null };
  }

  const dueAt = new Date(renewalDueAt);
  const daysUntilDue = Math.ceil((dueAt.getTime() - Date.now()) / DAY_IN_MS);

  if (daysUntilDue < 0) {
    return { label: `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"} overdue`, tone: "critical" as const, daysUntilDue };
  }

  if (daysUntilDue <= 7) {
    return { label: `Renew in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`, tone: "warning" as const, daysUntilDue };
  }

  return { label: `Renewal due in ${daysUntilDue} days`, tone: "healthy" as const, daysUntilDue };
}
