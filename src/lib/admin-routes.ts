export type AdminTabId = "brokers" | "listings" | "chats" | "requirements" | "enquiries" | "leads" | "activity";
export type AdminBrokerTabId = "overview" | "listings" | "requirements" | "enquiries" | "activity";

const ADMIN_TAB_HREFS: Record<AdminTabId, string> = {
  brokers: "/admin",
  listings: "/admin/listings",
  chats: "/admin/chats",
  requirements: "/admin/requirements",
  enquiries: "/admin/enquiries",
  leads: "/admin/leads",
  activity: "/admin/activity",
};

const ADMIN_BROKER_TAB_SEGMENTS: Record<AdminBrokerTabId, string> = {
  overview: "",
  listings: "listings",
  requirements: "requirements",
  enquiries: "enquiries",
  activity: "activity",
};

const ADMIN_TAB_BY_PATH = new Map(Object.entries(ADMIN_TAB_HREFS).map(([tab, href]) => [href, tab as AdminTabId]));
const ADMIN_BROKER_TAB_IDS = new Set<AdminBrokerTabId>(["overview", "listings", "requirements", "enquiries", "activity"]);
const ADMIN_BROKER_WORKSPACE_PATTERN =
  /^\/admin\/brokers\/([^/]+)(?:\/(listings|requirements|enquiries|activity))?$/;

function normalizePathname(pathname: string) {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function isAdminTabId(value: string): value is AdminTabId {
  return Object.prototype.hasOwnProperty.call(ADMIN_TAB_HREFS, value);
}

function isAdminBrokerTabId(value: string): value is AdminBrokerTabId {
  return ADMIN_BROKER_TAB_IDS.has(value as AdminBrokerTabId);
}

export function getAdminTabHref(tab: AdminTabId) {
  return ADMIN_TAB_HREFS[tab];
}

export function getAdminTabFromPathname(pathname: string): AdminTabId {
  return ADMIN_TAB_BY_PATH.get(normalizePathname(pathname)) || "brokers";
}

export function isAdminWorkspacePath(pathname: string) {
  return ADMIN_TAB_BY_PATH.has(normalizePathname(pathname));
}

export function getAdminBrokerTabHref(brokerId: string | null | undefined, tab: AdminBrokerTabId) {
  const baseHref = `/admin/brokers/${brokerId || ""}`.replace(/\/$/, "");
  const segment = ADMIN_BROKER_TAB_SEGMENTS[tab];
  return segment ? `${baseHref}/${segment}` : baseHref;
}

export function getAdminBrokerTabFromPathname(pathname: string): AdminBrokerTabId {
  const match = normalizePathname(pathname).match(ADMIN_BROKER_WORKSPACE_PATTERN);
  const segment = match?.[2] || "overview";
  return isAdminBrokerTabId(segment) ? segment : "overview";
}

export function isAdminBrokerWorkspacePath(pathname: string) {
  return ADMIN_BROKER_WORKSPACE_PATTERN.test(normalizePathname(pathname));
}

export function getLegacyAdminTabRedirectPath(pathname: string, requestedTab: string) {
  const normalizedPathname = normalizePathname(pathname);

  if (isAdminWorkspacePath(normalizedPathname)) {
    return isAdminTabId(requestedTab) ? getAdminTabHref(requestedTab) : normalizedPathname;
  }

  const brokerMatch = normalizedPathname.match(ADMIN_BROKER_WORKSPACE_PATTERN);
  if (!brokerMatch) {
    return null;
  }

  return isAdminBrokerTabId(requestedTab)
    ? getAdminBrokerTabHref(brokerMatch[1], requestedTab)
    : normalizedPathname;
}
