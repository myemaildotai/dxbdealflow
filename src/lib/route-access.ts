import { AuthUser } from "@/auth/types";
import { isActiveBrokerStatus } from "@/lib/deal-utils";

export type BrokerStatusPageStatus = "pending" | "rejected" | "deactivated" | "suspended";

const BROKER_STATUS_PAGE_STATUSES = new Set<string>(["pending", "rejected", "deactivated", "suspended"]);

export function isBrokerStatusPageStatus(status: string | null | undefined): status is BrokerStatusPageStatus {
  return !!status && BROKER_STATUS_PAGE_STATUSES.has(status);
}

export function isBlockedBrokerStatus(status: string | null | undefined) {
  return !!status && !isActiveBrokerStatus(status);
}

export function getBrokerStatusRedirectPath(status: string | null | undefined) {
  const pageStatus = isBrokerStatusPageStatus(status) ? status : "pending";
  return `/pending?status=${encodeURIComponent(pageStatus)}`;
}

export function getDefaultRouteForUser(user: AuthUser | null) {
  if (!user) return "/login";
  if (user.role === "admin") return "/admin";
  if (user.role === "broker" && isActiveBrokerStatus(user.status)) return "/dashboard";
  if (user.role === "broker") return getBrokerStatusRedirectPath(user.status);
  return "/login";
}

export function isPendingBroker(user: AuthUser | null) {
  return !!user && user.role === "broker" && user.status === "pending";
}

export function isBlockedBroker(user: AuthUser | null) {
  return !!user && user.role === "broker" && isBlockedBrokerStatus(user.status);
}

export function canAccessBrokerWorkspace(user: AuthUser | null) {
  return !!user && user.role === "broker" && isActiveBrokerStatus(user.status);
}

export function canManageListings(user: AuthUser | null) {
  return !!user && user.role === "broker" && isActiveBrokerStatus(user.status);
}

export function canShowAuthenticatedHeader(user: AuthUser | null) {
  return !!user && (user.role === "admin" || canAccessBrokerWorkspace(user));
}

export function isAdmin(user: AuthUser | null) {
  return user?.role === "admin";
}
