import { APP_CONFIG } from "@/config";

export type BrokerSocialField = "instagramProfile" | "linkedinProfile";

const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]);
const LINKEDIN_HOSTS = new Set(["linkedin.com", "www.linkedin.com"]);
const INSTAGRAM_RESERVED_PATHS = new Set([
  "about",
  "accounts",
  "developer",
  "direct",
  "explore",
  "legal",
  "p",
  "privacy",
  "reel",
  "reels",
  "stories",
  "tv",
]);
const LINKEDIN_PATH_PREFIXES = new Set(["in", "company", "school"]);
const INSTAGRAM_HANDLE_REGEX = /^(?!\.)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9._]{1,30}$/;
const LINKEDIN_SLUG_REGEX = /^[A-Za-z0-9][A-Za-z0-9._-]{1,99}$/;

function readTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseLooseUrl(value: string) {
  const normalizedValue = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    return new URL(normalizedValue);
  } catch {
    return null;
  }
}

function normalizeInstagramHandle(value: string) {
  const handle = safeDecodeURIComponent(value.trim().replace(/^@+/, ""));

  if (!INSTAGRAM_HANDLE_REGEX.test(handle) || INSTAGRAM_RESERVED_PATHS.has(handle.toLowerCase())) {
    throw new Error("Enter a valid Instagram profile URL or handle.");
  }

  return handle;
}

function normalizeLinkedInSlug(value: string) {
  const slug = safeDecodeURIComponent(value.trim().replace(/^@+/, ""));

  if (!LINKEDIN_SLUG_REGEX.test(slug)) {
    throw new Error("Enter a valid LinkedIn profile URL or handle.");
  }

  return slug;
}

function getInstagramProfileInputValue(value: unknown) {
  const trimmedValue = readTrimmedString(value);

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.includes("instagram.com") || /^https?:\/\//i.test(trimmedValue)) {
    const parsedUrl = parseLooseUrl(trimmedValue);

    if (parsedUrl && INSTAGRAM_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
      const [handle] = parsedUrl.pathname.split("/").filter(Boolean);

      if (handle) {
        try {
          return normalizeInstagramHandle(handle);
        } catch {
          return trimmedValue;
        }
      }
    }
  }

  return trimmedValue;
}

function getLinkedInProfileInputValue(value: unknown) {
  const trimmedValue = readTrimmedString(value);

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.includes("linkedin.com") || /^https?:\/\//i.test(trimmedValue)) {
    const parsedUrl = parseLooseUrl(trimmedValue);

    if (parsedUrl && LINKEDIN_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
      const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
      const prefix = pathSegments[0]?.toLowerCase();
      const slugSegment = pathSegments[1];

      if (prefix && slugSegment && LINKEDIN_PATH_PREFIXES.has(prefix)) {
        try {
          const slug = normalizeLinkedInSlug(slugSegment);
          return prefix === "in" ? slug : `${prefix}/${slug}`;
        } catch {
          return trimmedValue;
        }
      }
    }
  }

  return trimmedValue;
}

export function normalizeInstagramProfile(value: unknown) {
  const trimmedValue = readTrimmedString(value);

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.includes("instagram.com") || /^https?:\/\//i.test(trimmedValue)) {
    const parsedUrl = parseLooseUrl(trimmedValue);

    if (!parsedUrl || !INSTAGRAM_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
      throw new Error("Enter a valid Instagram profile URL or handle.");
    }

    const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
    if (pathSegments.length !== 1) {
      throw new Error("Enter a valid Instagram profile URL or handle.");
    }

    const handle = normalizeInstagramHandle(pathSegments[0]);
    return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
  }

  const handle = normalizeInstagramHandle(trimmedValue);
  return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
}

export function normalizeLinkedInProfile(value: unknown) {
  const trimmedValue = readTrimmedString(value);

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.includes("linkedin.com") || /^https?:\/\//i.test(trimmedValue)) {
    const parsedUrl = parseLooseUrl(trimmedValue);

    if (!parsedUrl || !LINKEDIN_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
      throw new Error("Enter a valid LinkedIn profile URL or handle.");
    }

    const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
    if (pathSegments.length !== 2 || !LINKEDIN_PATH_PREFIXES.has(pathSegments[0].toLowerCase())) {
      throw new Error("Enter a valid LinkedIn profile URL or handle.");
    }

    const prefix = pathSegments[0].toLowerCase();
    const slug = normalizeLinkedInSlug(pathSegments[1]);
    return `https://www.linkedin.com/${prefix}/${encodeURIComponent(slug)}/`;
  }

  const prefixedValue = trimmedValue.replace(/^\/+/, "");
  const prefixedSegments = prefixedValue.split("/").filter(Boolean);

  if (prefixedSegments.length === 2 && LINKEDIN_PATH_PREFIXES.has(prefixedSegments[0].toLowerCase())) {
    const prefix = prefixedSegments[0].toLowerCase();
    const slug = normalizeLinkedInSlug(prefixedSegments[1]);
    return `https://www.linkedin.com/${prefix}/${encodeURIComponent(slug)}/`;
  }

  const slug = normalizeLinkedInSlug(trimmedValue);
  return `https://www.linkedin.com/in/${encodeURIComponent(slug)}/`;
}

export function normalizeBrokerSocialValue(field: BrokerSocialField, value: unknown) {
  return field === "instagramProfile" ? normalizeInstagramProfile(value) : normalizeLinkedInProfile(value);
}

export function getBrokerSocialInputValue(field: BrokerSocialField, value: unknown) {
  return field === "instagramProfile" ? getInstagramProfileInputValue(value) : getLinkedInProfileInputValue(value);
}

export function getBrokerSocialFieldError(field: BrokerSocialField, value: unknown) {
  try {
    normalizeBrokerSocialValue(field, value);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "Enter a valid social profile.";
  }
}

export function getBrokerWhatsappProfileUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/[^\d]/g, "");
  return digits ? `${APP_CONFIG.whatsappPrefix}${digits}` : null;
}
