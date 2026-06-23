import { redirect } from "next/navigation";
import { DashboardSectionPage, type DashboardSectionId } from "@/app/dashboard/DashboardSectionPageClient";

const LEGACY_SECTION_ROUTES: Partial<Record<DashboardSectionId, string>> = {
  listings: "/dashboard/listings",
  enquiries: "/dashboard/enquiries",
  chats: "/dashboard/chats",
  requirements: "/dashboard/requirements",
  profile: "/dashboard/profile",
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildRedirectHref(pathname: string, searchParams: Record<string, string | string[] | undefined>) {
  const nextParams = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (key === "section") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => nextParams.append(key, item));
      return;
    }

    if (value !== undefined) {
      nextParams.set(key, value);
    }
  });

  const query = nextParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function DashboardPage({
  searchParams = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const requestedSection = getSearchParamValue(searchParams.section) as DashboardSectionId | undefined;
  const redirectPathname = requestedSection ? LEGACY_SECTION_ROUTES[requestedSection] : null;

  if (redirectPathname) {
    redirect(buildRedirectHref(redirectPathname, searchParams));
  }

  if (requestedSection === "overview") {
    redirect(buildRedirectHref("/dashboard", searchParams));
  }

  return <DashboardSectionPage section="overview" />;
}
