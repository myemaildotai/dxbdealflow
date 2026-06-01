import type { AuthUser } from "@/auth/types";

export type HeaderNavItem = {
  href: string;
  label: string;
};

export function getHeaderNavItems(user: AuthUser | null, loading: boolean): HeaderNavItem[] {
  if (loading) {
    return [];
  }

  if (user?.role === "broker") {
    return [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/listings", label: "Browse Listings" },
      { href: "/requirements", label: "Buyer Board" },
    ];
  }

  if (user?.role === "admin") {
    return [
      { href: "/admin", label: "Dashboard" },
      { href: "/listings", label: "Browse Listings" },
      { href: "/requirements", label: "Buyer Board" },
    ];
  }

  return [{ href: "/listings", label: "Browse Listings" }];
}
