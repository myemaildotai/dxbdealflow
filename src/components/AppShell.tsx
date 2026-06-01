"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { AccountNotificationBell } from "@/components/AccountNotificationBell";
import { BrokerAvatar } from "@/components/BrokerAvatar";
import { BrokerEmailVerificationBanner } from "@/components/BrokerEmailVerificationModal";
import { useAuth } from "@/auth/useAuth";
import { authOperations } from "@/auth/authOperations";
import { resetClientSessionState } from "@/lib/client-session";
import { prefetchApi } from "@/lib/deal-api";
import { cn, getFullName } from "@/lib/deal-utils";
import { getHeaderNavItems } from "@/lib/header-nav";
import { getPostSignOutRoute } from "@/lib/public-maintenance";
import { canAccessBrokerWorkspace, canShowAuthenticatedHeader } from "@/lib/route-access";

export function AppShell({
  children,
  title,
  subtitle,
  hidePageHeader = false,
  mainClassName,
  pageHeaderActions,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  hidePageHeader?: boolean;
  mainClassName?: string;
  pageHeaderActions?: ReactNode;
}) {
  const pathname = usePathname();
  const resolvedPathname = pathname || "";
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { user, loading, setError, setLoading, setUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const accountUser = user && canShowAuthenticatedHeader(user) ? user : null;
  const navItems = useMemo(() => getHeaderNavItems(accountUser, loading), [accountUser, loading]);
  const mobileMenuId = "app-shell-mobile-menu";
  const showBrokerOnlineIndicator = canAccessBrokerWorkspace(accountUser);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [accountUser?.uid, pathname]);

  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });

    if (accountUser?.role === "broker") {
      prefetchApi("/api/dashboard?scope=notifications", {}, { ttlMs: 45_000 });
    }

    if (accountUser?.role === "admin") {
      prefetchApi("/api/admin/overview?scope=notifications", {}, { ttlMs: 45_000 });
    }
  }, [accountUser?.role, navItems, router]);

  const handleSignOut = async () => {
    const previousUser = user;

    setMobileMenuOpen(false);
    resetClientSessionState(null);
    setUser(null);
    setError(null);
    setLoading(false);

    try {
      const nextRoute = await getPostSignOutRoute();
      await authOperations.signOut();
      enqueueSnackbar("Logged out successfully.", { variant: "success" });
      router.replace(nextRoute);
    } catch (error) {
      setUser(previousUser);
      setError(error as Error);
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to log out.", { variant: "error" });
    }
  };

  const isActiveNavItem = (href: string) => {
    if (href === "/admin") {
      return resolvedPathname === "/admin" || resolvedPathname.startsWith("/admin/");
    }

    if (href === "/dashboard") {
      return (
        resolvedPathname === "/dashboard" ||
        resolvedPathname.startsWith("/dashboard/") ||
        resolvedPathname === "/post-listing" ||
        resolvedPathname === "/post-requirement" ||
        resolvedPathname === "/my-requirements"
      );
    }

    if (href === "/listings") {
      return resolvedPathname === "/listings" || resolvedPathname.startsWith("/listings/");
    }

    if (href === "/requirements") {
      return resolvedPathname === "/requirements";
    }

    return resolvedPathname === href;
  };

  const showPageHeader = !hidePageHeader && (title || subtitle);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-brand-line/80 bg-white/88 backdrop-blur-xl">
        <div className="shell tablet-header-shell xl:px-10">
          <div className="tablet-header-grid grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:h-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] md:gap-4 lg:h-[76px] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6">
            <div className="flex min-w-0 items-center gap-4">
              <Link href="/" onClick={closeMobileMenu} className="flex min-w-0 items-center gap-4">
                <div className="min-w-0">
                  <div className="tablet-header-logo relative h-6 w-[114px] sm:h-8 sm:w-[146px] lg:h-11 lg:w-[198px]">
                    <Image src="/assets/Logo-Blue.png" alt="DXB Deal Flow" fill className="object-contain object-left" sizes="198px" priority />
                  </div>
                </div>
              </Link>
            </div>

            <nav className="tablet-header-nav hidden min-w-0 items-center justify-center gap-2 overflow-visible pb-0 md:flex md:flex-nowrap lg:flex-wrap">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "tablet-header-nav-link inline-flex min-h-[38px] items-center whitespace-nowrap rounded-full border px-3 py-2 text-xs font-medium transition duration-200 lg:min-h-[42px] lg:px-4 lg:text-sm",
                    isActiveNavItem(item.href)
                      ? "border-brand-navy bg-brand-navy text-white shadow-[0_10px_24px_rgba(15,42,95,0.16)]"
                      : "border-brand-line bg-white text-brand-slate hover:border-brand-blue/30 hover:text-brand-navy"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="tablet-header-actions flex min-w-0 items-center justify-end gap-2 md:justify-self-end lg:gap-3">
              {accountUser ? <AccountNotificationBell accountUser={accountUser} /> : null}

              {accountUser ? (
                <div className="tablet-header-account hidden min-w-0 items-center gap-2 md:flex lg:gap-3">
                  <div className="tablet-header-profile-copy hidden text-right sm:block">
                    <p className="max-w-[9rem] truncate text-xs font-semibold text-brand-ink lg:max-w-none lg:text-sm">{getFullName(accountUser.firstName, accountUser.lastName)}</p>
                    <div className="mt-1 flex items-center justify-end gap-2">
                      <span className="micro-copy">{accountUser.role || "broker"}</span>
                    </div>
                  </div>
                  <div className="tablet-header-avatar relative h-9 w-9 shrink-0 lg:h-11 lg:w-11">
                    <BrokerAvatar
                      src={accountUser.brokerProfile?.profile_photo || accountUser.photoURL}
                      alt={`${getFullName(accountUser.firstName, accountUser.lastName)} profile photo`}
                      className="h-full w-full border border-brand-line bg-brand-panel-soft"
                    />
                    {showBrokerOnlineIndicator ? (
                      <span
                        className="pointer-events-none absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#22c55e] shadow-[0_0_0_1px_rgba(15,42,95,0.08)] lg:h-3 lg:w-3"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                  <button onClick={handleSignOut} className="btn-secondary tablet-header-signout min-h-[38px] rounded-full px-4 py-2 text-xs lg:min-h-[42px] lg:px-5 lg:text-sm">
                    Log Out
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-line bg-white text-brand-navy shadow-[0_10px_24px_rgba(15,42,95,0.08)] transition duration-200 hover:border-brand-blue/30 hover:bg-brand-panel-soft sm:h-11 sm:w-11 md:hidden"
                aria-expanded={mobileMenuOpen}
                aria-controls={mobileMenuId}
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                onClick={() => setMobileMenuOpen((open) => !open)}
              >
                <span className="relative h-4 w-5" aria-hidden="true">
                  <span
                    className={cn(
                      "absolute left-0 top-0 h-[2px] w-5 rounded-full bg-current transition duration-200",
                      mobileMenuOpen ? "top-[7px] rotate-45" : ""
                    )}
                  />
                  <span
                    className={cn(
                      "absolute left-0 top-[7px] h-[2px] w-5 rounded-full bg-current transition duration-200",
                      mobileMenuOpen ? "opacity-0" : ""
                    )}
                  />
                  <span
                    className={cn(
                      "absolute left-0 top-[14px] h-[2px] w-5 rounded-full bg-current transition duration-200",
                      mobileMenuOpen ? "top-[7px] -rotate-45" : ""
                    )}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>

        <div
          id={mobileMenuId}
          className={cn(
            "fixed inset-0 z-50 transition-[visibility] duration-300 md:hidden",
            mobileMenuOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"
          )}
          aria-hidden={!mobileMenuOpen}
        >
          <button
            type="button"
            className={cn(
              "absolute inset-0 bg-slate-950/45 transition-opacity duration-300",
              mobileMenuOpen ? "opacity-100" : "opacity-0"
            )}
            aria-label="Close navigation menu"
            tabIndex={mobileMenuOpen ? 0 : -1}
            onClick={closeMobileMenu}
          />
          <aside
            className={cn(
              "absolute right-0 top-0 flex h-dvh w-[min(20rem,calc(100vw-2rem))] max-w-full flex-col overflow-y-auto border-l border-brand-line bg-white p-4 shadow-[0_24px_70px_rgba(15,42,95,0.22)] transition-transform duration-300 sm:w-[22rem] sm:p-5",
              mobileMenuOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="flex h-12 items-center justify-between gap-3 sm:h-14">
              <div className="relative h-6 w-[114px] sm:h-8 sm:w-[146px]">
                <Image src="/assets/Logo-Blue.png" alt="DXB Deal Flow" fill className="object-contain object-left" sizes="146px" />
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-line bg-white text-brand-navy shadow-[0_10px_24px_rgba(15,42,95,0.08)]"
                aria-label="Close navigation menu"
                onClick={closeMobileMenu}
              >
                <span className="relative h-4 w-4" aria-hidden="true">
                  <span className="absolute left-0 top-1/2 h-[2px] w-4 -translate-y-1/2 rotate-45 rounded-full bg-current" />
                  <span className="absolute left-0 top-1/2 h-[2px] w-4 -translate-y-1/2 -rotate-45 rounded-full bg-current" />
                </span>
              </button>
            </div>

            {accountUser ? (
              <div className="mt-4 flex items-center gap-3 rounded-[16px] border border-brand-line/80 bg-brand-panel-soft px-3 py-3">
                <div className="relative h-10 w-10 shrink-0">
                  <BrokerAvatar
                    src={accountUser.brokerProfile?.profile_photo || accountUser.photoURL}
                    alt={`${getFullName(accountUser.firstName, accountUser.lastName)} profile photo`}
                    className="h-full w-full border border-brand-line bg-white"
                  />
                  {showBrokerOnlineIndicator ? (
                    <span
                      className="pointer-events-none absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#22c55e] shadow-[0_0_0_1px_rgba(15,42,95,0.08)]"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-ink">{getFullName(accountUser.firstName, accountUser.lastName)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="micro-copy">{accountUser.role || "broker"}</span>
                  </div>
                </div>
              </div>
            ) : null}

            <nav className="mt-4 grid gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={cn(
                    "inline-flex min-h-[42px] min-w-0 items-center rounded-[12px] border px-3 py-2 text-sm font-medium transition duration-200",
                    isActiveNavItem(item.href)
                      ? "border-brand-navy bg-brand-navy text-white shadow-[0_10px_24px_rgba(15,42,95,0.16)]"
                      : "border-brand-line bg-white text-brand-slate hover:border-brand-blue/30 hover:text-brand-navy"
                  )}
                >
                  <span className="min-w-0 truncate">{item.label}</span>
                </Link>
              ))}
            </nav>

            {accountUser ? (
              <div className="mt-4">
                <button onClick={handleSignOut} className="btn-secondary w-full min-h-[42px] rounded-[12px]">
                  Log Out
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      </header>

      <BrokerEmailVerificationBanner />

      <main className={cn("shell min-w-0 overflow-x-clip pb-8", showPageHeader ? "pt-6 sm:pt-8 lg:pt-10" : "flex min-h-[calc(100dvh-7rem)] flex-col pt-6 sm:pt-8", mainClassName)}>
        {showPageHeader ? (
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              {title ? <h1 className="mt-3 page-title">{title}</h1> : null}
              {subtitle ? <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-slate sm:text-base">{subtitle}</p> : null}
            </div>
            {pageHeaderActions ? <div className="flex w-full flex-wrap justify-start gap-2 sm:w-auto lg:justify-end">{pageHeaderActions}</div> : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
