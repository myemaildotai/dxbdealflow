"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSnackbar } from "notistack";
import { AppShell } from "@/components/AppShell";
import { BackButton } from "@/components/BackButton";
import { LoadingScreen } from "@/components/LoadingScreen";
import { RequirementSuccessModal } from "@/components/RequirementSuccessModal";
import { useAuth } from "@/auth/useAuth";
import { apiFetch } from "@/lib/deal-api";
import { invalidateRequirementCaches } from "@/lib/client-cache";
import { cn, formatDealType, formatPropertyType, formatRequirementUrgency } from "@/lib/deal-utils";
import { getRequirementMatchSummary, type RequirementListingMatchSummary } from "@/lib/requirement-matching";
import { canAccessBrokerWorkspace, getDefaultRouteForUser } from "@/lib/route-access";
import {
  formatRequirementBedrooms,
  parseRequirementBedroomOption,
  REQUIREMENT_BEDROOM_OPTIONS,
  REQUIREMENT_DEAL_TYPES,
  REQUIREMENT_PROPERTY_TYPES,
  REQUIREMENT_URGENCY_OPTIONS,
} from "@/lib/requirements";
import type { Listing, Requirement, RequirementFormValues } from "@/lib/deal-types";

type RequirementsResponse = {
  areas: string[];
};

type RequirementDetailResponse = {
  requirement: Requirement;
};

type ListingsResponse = {
  listings: Listing[];
};

type RequirementFieldKey = keyof RequirementFormValues;
type RequirementErrors = Partial<Record<RequirementFieldKey, string>>;
type RequirementTouched = Partial<Record<RequirementFieldKey, boolean>>;
type RequirementSuccessKind = "created" | "updated";
type MatchInsightTone = {
  label: string;
  note: string;
  ringColor: string;
  chipClassName: string;
  progressClassName: string;
};

const SELECT_OPTION_STYLE = { backgroundColor: "#ffffff", color: "#0f172a" } as const;
const FIELD_ORDER: RequirementFieldKey[] = ["title", "propertyType", "dealType", "bedrooms", "area", "budgetMin", "budgetMax", "urgency", "description", "timeline"];
const EMPTY_MATCH_SUMMARY: RequirementListingMatchSummary = {
  bestMatchPercentage: 0,
  matchedListingsCount: 0,
  totalListingsConsidered: 0,
};

const initialValues: RequirementFormValues = {
  title: "",
  description: "",
  propertyType: "apartment",
  dealType: "secondary",
  bedrooms: "",
  budgetMin: "",
  budgetMax: "",
  area: "",
  urgency: "medium",
  timeline: "",
};

function Field({
  label,
  id,
  children,
  hint,
  required = false,
  error,
}: {
  label: string;
  id: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-slate sm:mb-2.5 sm:gap-2 sm:tracking-[0.24em]">
        <span className="min-w-0 break-words">{label}</span>
        {required ? <span className="text-[#c65345]">*</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1.5 break-words text-sm font-medium text-[#c65345] sm:mt-2">{error}</p> : hint ? <p className="mt-1.5 break-words text-sm leading-6 text-brand-slate sm:mt-2">{hint}</p> : null}
    </div>
  );
}

function SelectWrap({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-w-0">
      {children}
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-brand-slate sm:right-5" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
      <path d="M11.75 4.75L6.5 10L11.75 15.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckBulletIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M5.25 10.25L8.2 13.2L14.75 6.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MatchInsightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 4.75L11.7 8.2L15.5 8.75L12.75 11.45L13.4 15.25L10 13.45L6.6 15.25L7.25 11.45L4.5 8.75L8.3 8.2L10 4.75Z" fill="currentColor" />
    </svg>
  );
}

function UrgencyToneIcon({ urgency }: { urgency: RequirementFormValues["urgency"] }) {
  if (urgency === "high" || urgency === "hot") {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M10.2 3.75c.2 2-1.3 3.03-1.3 4.6 0 1.32.92 2.2 2.06 2.2 1.3 0 2.33-1.04 2.33-2.6 0-1.18-.56-2.1-1.56-3.2 2.37.6 4.02 2.67 4.02 5.06A5.74 5.74 0 0 1 10 15.5a5.74 5.74 0 0 1-5.75-5.69c0-2.1 1.1-3.9 2.9-4.93-.19 2.25 1.07 3.53 2.23 3.53 1.18 0 2-.9 2-2.15 0-.9-.35-1.62-1.18-2.51Z" fill="currentColor" />
      </svg>
    );
  }

  if (urgency === "medium" || urgency === "active") {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="10" cy="10" r="2.2" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6.6V10L12.25 11.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SummaryIcon({ kind }: { kind: "location" | "budget" | "details" | "bell" }) {
  if (kind === "location") {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
        <path d="M10 17s4.5-4.8 4.5-8.2A4.5 4.5 0 0 0 5.5 8.8C5.5 12.2 10 17 10 17Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <circle cx="10" cy="8.5" r="1.6" fill="currentColor" />
      </svg>
    );
  }

  if (kind === "budget") {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
        <path d="M5 6.25H15V13.75H5V6.25Z" stroke="currentColor" strokeWidth="1.7" />
        <path d="M10 5V15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "bell") {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
        <path d="M10 4.75a3 3 0 0 1 3 3v1.1c0 .75.2 1.48.6 2.12l.82 1.33a.7.7 0 0 1-.6 1.07H6.18a.7.7 0 0 1-.6-1.07l.82-1.33c.4-.64.6-1.37.6-2.12v-1.1a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8.5 15.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
      <path d="M4.75 6.25H15.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4.75 10H15.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4.75 13.75H11.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function FormFooterItem({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3 text-sm text-brand-slate sm:items-center sm:text-[15px]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef2f7] text-brand-blue">
        <CheckBulletIcon />
      </span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function ScoreRing({
  score,
  ringColor,
  ariaLabel,
}: {
  score: number;
  ringColor: string;
  ariaLabel: string;
}) {
  return (
    <div
      className="relative flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full sm:h-[96px] sm:w-[96px]"
      style={{
        background: `conic-gradient(${ringColor} ${score}%, #dfe6ee ${score}% 100%)`,
      }}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
    >
      <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_18px_rgba(15,23,42,0.08)] sm:h-[78px] sm:w-[78px]">
        <span className="text-2xl font-semibold tracking-[-0.04em] text-brand-ink sm:text-[28px]">{score}%</span>
      </div>
    </div>
  );
}

function PreviewSummaryRow({
  icon,
  text,
  subtleText,
}: {
  icon: "location" | "budget" | "details";
  text: string;
  subtleText?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 sm:items-center">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3f6fa] text-[#7b8798]">
        <SummaryIcon kind={icon} />
      </span>
      <div className="min-w-0">
        <p className="break-words text-[15px] font-medium text-brand-ink">{text}</p>
        {subtleText ? (
          <p className="mt-1 break-words text-sm leading-6 text-brand-slate">{subtleText}</p>
        ) : null}
      </div>
    </div>
  );
}

function inputClass(hasError: boolean, extraClassName?: string) {
  return cn(
    "input min-h-[42px] rounded-md border bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] px-3 py-2 text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_12px_28px_rgba(15,23,42,0.04)] transition duration-200 sm:text-base md:min-h-[46px] md:rounded-[10px] md:px-4 md:text-[15px]",
    hasError
      ? "border-[#dfa097] bg-[#fff8f6] text-brand-ink placeholder:text-[#c98276] focus:border-[#cf6f60] focus:shadow-[0_0_0_4px_rgba(207,111,96,0.16)]"
      : "border-[#d8dee8] hover:border-brand-blue/30 focus:border-brand-gold",
    extraClassName
  );
}

function sanitizeNumberInput(value: string) {
  const cleaned = value.replace(/,/g, "").replace(/\s+/g, "");
  if (!cleaned) return "";
  if (/^\d*\.?\d*$/.test(cleaned)) return cleaned;
  return null;
}

function isValidNumber(value: string) {
  if (!value.trim()) return false;
  return Number.isFinite(Number(value));
}

function isPositiveNumber(value: string) {
  return isValidNumber(value) && Number(value) > 0;
}

function hasValue(value: string | null | undefined) {
  return Boolean(value && value.trim());
}

function normalizeAreaValues(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const dedupedAreas = new Map<string, string>();

  values.forEach((area) => {
    if (typeof area !== "string") return;
    const normalizedArea = area.replace(/\s+/g, " ").trim();
    if (!normalizedArea) return;
    const key = normalizedArea.toLowerCase();
    if (!dedupedAreas.has(key)) dedupedAreas.set(key, normalizedArea);
  });

  return Array.from(dedupedAreas.values()).sort((left, right) => left.localeCompare(right));
}

function validateForm(values: RequirementFormValues): RequirementErrors {
  const nextErrors: RequirementErrors = {};

  if (!values.title.trim()) nextErrors.title = "Enter a requirement title.";
  if (!values.propertyType) nextErrors.propertyType = "Select a property type.";
  if (!values.bedrooms) nextErrors.bedrooms = "Select the bedroom count.";
  if (!values.area.trim()) nextErrors.area = "Select an area.";
  if (!isPositiveNumber(values.budgetMin)) nextErrors.budgetMin = "Enter a valid minimum budget.";
  if (!isPositiveNumber(values.budgetMax)) nextErrors.budgetMax = "Enter a valid maximum budget.";

  if (!nextErrors.budgetMin && !nextErrors.budgetMax && Number(values.budgetMax) < Number(values.budgetMin)) {
    nextErrors.budgetMax = "Maximum budget cannot be lower than minimum budget.";
  }

  return nextErrors;
}

function formatCompactCurrency(value: string) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(parsedValue);
}

function getBudgetPreviewLabel(values: RequirementFormValues) {
  const minLabel = formatCompactCurrency(values.budgetMin);
  const maxLabel = formatCompactCurrency(values.budgetMax);

  if (minLabel && maxLabel) return `${minLabel} - ${maxLabel}`;
  if (maxLabel) return `Up to ${maxLabel}`;
  if (minLabel) return `From ${minLabel}`;
  return "Budget range pending";
}

function getMatchingListingsLabel(count: number) {
  return count === 1 ? "1 listing found" : `${count} listings found`;
}

function getMatchInsightTone(matchedListingsCount: number, matchPercentage: number, unavailable: boolean): MatchInsightTone {
  if (unavailable) {
    return {
      label: "Live data unavailable",
      note: "We couldn't refresh the market match feed just now.",
      ringColor: "#94a3b8",
      chipClassName: "border-[#d9e2eb] bg-[#f4f7fa] text-[#64748b]",
      progressClassName: "from-[#eff3f7] via-[#dbe4ed] to-[#94a3b8]",
    };
  }

  if (matchPercentage <= 0) {
    return {
      label: "No live matches",
      note: "No matching listings found yet based on the current live inventory.",
      ringColor: "#94a3b8",
      chipClassName: "border-[#d9e2eb] bg-[#f4f7fa] text-[#64748b]",
      progressClassName: "from-[#eff3f7] via-[#dbe4ed] to-[#94a3b8]",
    };
  }

  if (matchPercentage >= 90) {
    return {
      label: "Excellent live fit",
      note: "Strong live inventory alignment for this requirement.",
      ringColor: "#5f9d79",
      chipClassName: "border-[#d8eadf] bg-[#eef8f1] text-[#3f7f59]",
      progressClassName: "from-[#d8eadf] via-[#b9d8c2] to-[#5f9d79]",
    };
  }

  if (matchPercentage >= 70) {
    return {
      label: "Qualified matches",
      note: "There are live listings already meeting the requirement threshold.",
      ringColor: "#7a9db8",
      chipClassName: "border-[#dbe8f3] bg-[#f1f7fc] text-[#486c86]",
      progressClassName: "from-[#dbe8f3] via-[#bfd5e7] to-[#7a9db8]",
    };
  }

  return {
    label: "Live coverage found",
    note: "The current market has partial but relevant availability for this requirement.",
    ringColor: "#d4af37",
    chipClassName: "border-[#f1e1ad] bg-[#fff8e1] text-[#9d7514]",
    progressClassName: "from-[#f8efcf] via-[#edd58a] to-[#d4af37]",
  };
}

function getUrgencyTone(urgency: RequirementFormValues["urgency"]) {
  if (urgency === "high" || urgency === "hot") {
    return {
      headline: "HOT BUYER",
      badgeClassName: "border-[#f3d4cc] bg-[#fff4ef] text-[#b35f4c]",
      chipClassName: "border-[#f3d4cc] bg-[#fff4ef] text-[#b35f4c]",
      accentClassName: "text-[#c06a56]",
    };
  }

  if (urgency === "medium" || urgency === "active") {
    return {
      headline: "ACTIVE BUYER",
      badgeClassName: "border-[#e6dbb0] bg-[#fff8e1] text-[#9d7514]",
      chipClassName: "border-[#e6dbb0] bg-[#fff8e1] text-[#9d7514]",
      accentClassName: "text-[#ae7f17]",
    };
  }

  return {
    headline: "PLANNING BUYER",
    badgeClassName: "border-[#d9e2eb] bg-[#f4f7fa] text-[#64748b]",
    chipClassName: "border-[#d9e2eb] bg-[#f4f7fa] text-[#64748b]",
    accentClassName: "text-[#64748b]",
  };
}

export default function PostRequirementPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Preparing requirement form..." />}>
      <PostRequirementPageContent />
    </Suspense>
  );
}

function PostRequirementPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedSearchParams = searchParams ?? new URLSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { user, loading } = useAuth();
  const editId = resolvedSearchParams.get("id");
  const isEditMode = Boolean(editId);
  const submitInFlightRef = useRef(false);

  const [areas, setAreas] = useState<string[]>([]);
  const [listingPool, setListingPool] = useState<Listing[]>([]);
  const [listingInsightsUnavailable, setListingInsightsUnavailable] = useState(false);
  const [values, setValues] = useState<RequirementFormValues>(initialValues);
  const [touched, setTouched] = useState<RequirementTouched>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successKind, setSuccessKind] = useState<RequirementSuccessKind | null>(null);

  useEffect(() => {
    document.body.classList.add("post-listing-page");
    return () => document.body.classList.remove("post-listing-page");
  }, []);

  useEffect(() => {
    if (!loading && !canAccessBrokerWorkspace(user)) {
      router.replace(getDefaultRouteForUser(user));
      return;
    }

    if (!loading && user) {
      const controller = new AbortController();

      Promise.all([
        apiFetch<RequirementsResponse>("/api/requirements?page=1&pageSize=1000", { signal: controller.signal }),
        editId ? apiFetch<RequirementDetailResponse>(`/api/requirements/${editId}`, { signal: controller.signal }) : Promise.resolve(null),
        apiFetch<ListingsResponse>("/api/listings?page=1&pageSize=1000", { signal: controller.signal })
          .then((payload) => ({ payload, failed: false }))
          .catch(() => ({ payload: { listings: [] as Listing[] }, failed: true })),
      ])
        .then(([payload, detail, listingResponse]) => {
          if (controller.signal.aborted) {
            return;
          }

          setAreas(normalizeAreaValues(payload.areas));
          setListingPool(listingResponse.payload.listings || []);
          setListingInsightsUnavailable(listingResponse.failed);
          if (detail?.requirement) {
            setValues({
              title: detail.requirement.title || "",
              description: detail.requirement.description,
              propertyType: detail.requirement.property_type,
              dealType: detail.requirement.deal_type,
              bedrooms: parseRequirementBedroomOption(detail.requirement.bedrooms) || "",
              budgetMin: detail.requirement.budget_min?.toString() || "",
              budgetMax: detail.requirement.budget_max?.toString() || "",
              area: detail.requirement.area || "",
              urgency: detail.requirement.urgency,
              timeline: detail.requirement.timeline || "",
            });
          }
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }

          enqueueSnackbar(error instanceof Error ? error.message : "Failed to prepare form.", { variant: "error" });
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setPageLoading(false);
          }
        });

      return () => controller.abort();
    }
  }, [editId, enqueueSnackbar, loading, router, user]);

  const pageTitle = useMemo(() => (isEditMode ? "Edit Buyer Requirement" : "Post Buyer Requirement"), [isEditMode]);
  const submitLabel = submitting ? "Saving..." : isEditMode ? "Update Requirement" : "Post Requirement";
  const errors = useMemo(() => validateForm(values), [values]);
  const areaOptions = useMemo(() => areas, [areas]);
  const urgencyTone = useMemo(() => getUrgencyTone(values.urgency), [values.urgency]);
  const liveMatchRequirement = useMemo(
    () => ({
      area: hasValue(values.area) ? values.area.trim() : null,
      area_id: null,
      bedrooms: hasValue(values.bedrooms) ? values.bedrooms : null,
      budget_min: isPositiveNumber(values.budgetMin) ? Number(values.budgetMin) : null,
      budget_max: isPositiveNumber(values.budgetMax) ? Number(values.budgetMax) : null,
    }),
    [values.area, values.bedrooms, values.budgetMax, values.budgetMin]
  );
  const liveMatchSummary = useMemo(
    () => (listingInsightsUnavailable ? EMPTY_MATCH_SUMMARY : getRequirementMatchSummary(liveMatchRequirement, listingPool)),
    [listingInsightsUnavailable, listingPool, liveMatchRequirement]
  );
  const liveMatchPercentage = useMemo(
    () => liveMatchSummary.bestMatchPercentage,
    [liveMatchSummary.bestMatchPercentage]
  );
  const matchInsightTone = useMemo(
    () => getMatchInsightTone(liveMatchSummary.matchedListingsCount, liveMatchPercentage, listingInsightsUnavailable),
    [listingInsightsUnavailable, liveMatchPercentage, liveMatchSummary.matchedListingsCount]
  );
  const matchingListingsLabel = useMemo(
    () => getMatchingListingsLabel(liveMatchSummary.matchedListingsCount),
    [liveMatchSummary.matchedListingsCount]
  );
  const previewTitle = useMemo(() => {
    if (hasValue(values.title)) return values.title.trim();
    if (hasValue(values.area)) return `Requirement in ${values.area.trim()}`;
    return "Requirement preview";
  }, [values.area, values.title]);
  const previewArea = useMemo(() => (hasValue(values.area) ? values.area.trim() : "Area pending"), [values.area]);
  const previewBudget = useMemo(() => getBudgetPreviewLabel(values), [values]);
  const previewBedrooms = useMemo(() => formatRequirementBedrooms(values.bedrooms) || "Bedrooms pending", [values.bedrooms]);
  const previewBrief = useMemo(
    () =>
      hasValue(values.description)
        ? values.description.trim()
        : "Describe the buyer intent, to help brokers qualify stronger matches.",
    [values.description]
  );
  const previewTimeline = useMemo(
    () => (hasValue(values.timeline) ? values.timeline.trim() : "Closing timeline and urgency notes will appear here."),
    [values.timeline]
  );

  const updateField = <K extends RequirementFieldKey>(field: K, nextValue: RequirementFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: nextValue }));
  };

  const handleBlur = (field: RequirementFieldKey) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const handleNumberChange = (field: "budgetMin" | "budgetMax") => (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = sanitizeNumberInput(event.target.value);
    if (nextValue !== null) updateField(field, nextValue);
  };

  const visibleError = (field: RequirementFieldKey) => (!touched[field] && !submitAttempted ? undefined : errors[field]);

  const focusFirstError = (nextErrors: RequirementErrors) => {
    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
    const target = firstInvalid ? document.getElementById(`${firstInvalid}-field`) : null;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement) {
      target.focus();
    }
  };

  const closeSuccessModalToRequirements = () => {
    setSuccessKind(null);
    router.push("/dashboard?section=requirements");
  };

  const handleBackToDashboardFromSuccess = () => {
    setSuccessKind(null);
    router.push("/dashboard");
  };

  const handleSubmit = async () => {
    if (submitInFlightRef.current || successKind) {
      return;
    }

    setSubmitAttempted(true);

    if (Object.keys(errors).length) {
      focusFirstError(errors);
      enqueueSnackbar("Please review the highlighted fields.", { variant: "error" });
      return;
    }

    submitInFlightRef.current = true;
    setSubmitting(true);
    let succeeded = false;
    try {
      if (editId) {
        await apiFetch(`/api/requirements/${editId}`, {
          method: "PUT",
          body: JSON.stringify(values),
        });
      } else {
        await apiFetch("/api/requirements", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }

      setSuccessKind(editId ? "updated" : "created");
      succeeded = true;
      invalidateRequirementCaches(editId || undefined);
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to save requirement.", { variant: "error" });
    } finally {
      if (!succeeded) {
        submitInFlightRef.current = false;
      }
      setSubmitting(false);
    }
  };

  if (loading || pageLoading || !user) {
    return <LoadingScreen label="Preparing requirement form..." />;
  }

  const successModalContent =
    successKind === "created"
      ? {
          title: "Requirement Created Successfully",
          message: "Your buyer requirement has been posted and is now visible on the Buyer Board.",
        }
      : successKind === "updated"
        ? {
            title: "Requirement Updated Successfully",
            message: "Your buyer requirement changes have been saved successfully.",
          }
        : null;

  return (
    <AppShell hidePageHeader mainClassName="!max-w-[1540px] xl:!px-10">
      <div className="space-y-5 pb-10 sm:space-y-6">
        <div className="hidden items-center gap-3 sm:flex">
          <BackButton
            fallbackHref="/dashboard?section=requirements"
            aria-label="Back to Requirements"
            className={cn(
              "inline-flex items-center justify-center border border-brand-line bg-white text-brand-navy shadow-[0_10px_24px_rgba(15,42,95,0.05)] transition",
              "h-11 w-11 rounded-full hover:border-brand-blue/28 hover:bg-brand-panel-soft",
              "sm:h-auto sm:w-auto sm:rounded-[18px] sm:px-4 sm:py-2.5 sm:text-sm sm:font-semibold"
            )}
          >
            <span className="sm:hidden">
              <BackArrowIcon />
            </span>
            <span className="hidden sm:inline">Back to Requirements</span>
          </BackButton>
        </div>

        <div className="max-w-[920px]">
          <h1 className="font-heading text-2xl font-bold tracking-[-0.05em] text-brand-ink sm:text-3xl md:text-4xl lg:text-[2.85rem]">{pageTitle}</h1>
            <p className="mt-2 text-sm leading-6 text-brand-slate sm:text-[15px] sm:leading-7">
              Keep the buyer brief specific, balanced, and easy to scan for a faster broker response.
            </p>
        </div>

        <div className="grid items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.2fr)_460px]">
          <section className="panel overflow-hidden rounded-[18px] border border-[#e3e7ef] bg-white shadow-[0_28px_60px_rgba(15,23,42,0.08)]">
            <div className="space-y-5 px-4 py-4 sm:space-y-8 sm:px-8 sm:py-8">
                <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
                  <div className="lg:col-span-2">
                    <Field label="Requirement title" id="title-field" required error={visibleError("title")}>
                      <input
                        id="title-field"
                        className={inputClass(Boolean(visibleError("title")))}
                        value={values.title}
                        onBlur={() => handleBlur("title")}
                        onChange={(event) => updateField("title", event.target.value)}
                        placeholder="Seeking 2BR Downtown residence"
                        aria-invalid={Boolean(visibleError("title"))}
                      />
                    </Field>
                  </div>

                  <Field label="Property type" id="propertyType-field" required error={visibleError("propertyType")}>
                    <SelectWrap>
                      <select
                        id="propertyType-field"
                        className={inputClass(Boolean(visibleError("propertyType")), "appearance-none pr-12")}
                        value={values.propertyType}
                        onBlur={() => handleBlur("propertyType")}
                        onChange={(event) => updateField("propertyType", event.target.value as RequirementFormValues["propertyType"])}
                        aria-invalid={Boolean(visibleError("propertyType"))}
                      >
                        {REQUIREMENT_PROPERTY_TYPES.map((type) => (
                          <option key={type} value={type} style={SELECT_OPTION_STYLE}>
                            {formatPropertyType(type)}
                          </option>
                        ))}
                      </select>
                    </SelectWrap>
                  </Field>

                  <Field label="Deal type" id="dealType-field">
                    <SelectWrap>
                      <select
                        id="dealType-field"
                        className={inputClass(false, "appearance-none pr-12")}
                        value={values.dealType}
                        onBlur={() => handleBlur("dealType")}
                        onChange={(event) => updateField("dealType", event.target.value as RequirementFormValues["dealType"])}
                      >
                        {REQUIREMENT_DEAL_TYPES.map((type) => (
                          <option key={type} value={type} style={SELECT_OPTION_STYLE}>
                            {formatDealType(type)}
                          </option>
                        ))}
                      </select>
                    </SelectWrap>
                  </Field>

                  <Field label="Bedrooms" id="bedrooms-field" required error={visibleError("bedrooms")}>
                    <SelectWrap>
                      <select
                        id="bedrooms-field"
                        className={inputClass(Boolean(visibleError("bedrooms")), "appearance-none pr-12")}
                        value={values.bedrooms}
                        onBlur={() => handleBlur("bedrooms")}
                        onChange={(event) => updateField("bedrooms", event.target.value)}
                        aria-invalid={Boolean(visibleError("bedrooms"))}
                      >
                        <option value="" style={SELECT_OPTION_STYLE}>
                          Select Bedrooms
                        </option>
                        {REQUIREMENT_BEDROOM_OPTIONS.map((bedrooms) => (
                          <option key={bedrooms} value={bedrooms} style={SELECT_OPTION_STYLE}>
                            {bedrooms}
                          </option>
                        ))}
                      </select>
                    </SelectWrap>
                  </Field>

                  <Field label="Area" id="area-field" required error={visibleError("area")}>
                    <SelectWrap>
                      <select
                        id="area-field"
                        className={inputClass(Boolean(visibleError("area")), "appearance-none pr-12")}
                        value={values.area}
                        onBlur={() => handleBlur("area")}
                        onChange={(event) => updateField("area", event.target.value)}
                        aria-invalid={Boolean(visibleError("area"))}
                      >
                        <option value="" style={SELECT_OPTION_STYLE}>
                          Select Area
                        </option>
                        {areaOptions.map((area) => (
                          <option key={area} value={area} style={SELECT_OPTION_STYLE}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </SelectWrap>
                  </Field>

                  <div className="lg:col-span-2">
                    <Field label="Urgency" id="urgency-field">
                      <SelectWrap>
                        <select
                          id="urgency-field"
                          className={inputClass(false, "appearance-none pr-12")}
                          value={values.urgency}
                          onBlur={() => handleBlur("urgency")}
                          onChange={(event) => updateField("urgency", event.target.value as RequirementFormValues["urgency"])}
                        >
                          {REQUIREMENT_URGENCY_OPTIONS.map((urgency) => (
                            <option key={urgency} value={urgency} style={SELECT_OPTION_STYLE}>
                              {formatRequirementUrgency(urgency)}
                            </option>
                          ))}
                        </select>
                      </SelectWrap>
                    </Field>
                  </div>
                </div>

              <div className="border-t border-[#edf1f6]" />

                <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
                  <Field label="Minimum budget" id="budgetMin-field" required error={visibleError("budgetMin")}>
                    <input
                      id="budgetMin-field"
                      className={inputClass(Boolean(visibleError("budgetMin")))}
                      value={values.budgetMin}
                      onBlur={() => handleBlur("budgetMin")}
                      onChange={handleNumberChange("budgetMin")}
                      placeholder="2500000"
                      inputMode="decimal"
                      aria-invalid={Boolean(visibleError("budgetMin"))}
                    />
                  </Field>

                  <Field label="Maximum budget" id="budgetMax-field" required error={visibleError("budgetMax")}>
                    <input
                      id="budgetMax-field"
                      className={inputClass(Boolean(visibleError("budgetMax")))}
                      value={values.budgetMax}
                      onBlur={() => handleBlur("budgetMax")}
                      onChange={handleNumberChange("budgetMax")}
                      placeholder="4000000"
                      inputMode="decimal"
                      aria-invalid={Boolean(visibleError("budgetMax"))}
                    />
                  </Field>

                  <div className="lg:col-span-2">
                    <Field label="Buyer brief" id="description-field" hint="Be specific to attract better matches.">
                      <textarea
                        id="description-field"
                        className={inputClass(false, "min-h-[112px] resize-y px-3 py-2 leading-6 sm:min-h-[148px] md:px-4 md:py-4 md:leading-7")}
                        value={values.description}
                        onBlur={() => handleBlur("description")}
                        onChange={(event) => updateField("description", event.target.value)}
                        placeholder="Describe the target asset, buyer intent, preferred location details, and what makes the opportunity a fit."
                      />
                    </Field>
                  </div>

                  <div className="lg:col-span-2">
                    <Field label="Timeline" id="timeline-field">
                      <textarea
                        id="timeline-field"
                        className={inputClass(false, "min-h-[104px] resize-y px-3 py-2 leading-6 sm:min-h-[136px] md:px-4 md:py-4 md:leading-7")}
                        value={values.timeline}
                        onBlur={() => handleBlur("timeline")}
                        onChange={(event) => updateField("timeline", event.target.value)}
                        placeholder="Looking to close within 30 days, reviewing shortlist this week, cash buyer awaiting final sign-off, etc."
                      />
                    </Field>
                  </div>
                </div>

              <div className="flex flex-col gap-4 border-t border-[#edf1f6] pt-5 sm:gap-6 sm:pt-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <FormFooterItem>Structured briefs attract stronger broker matches.</FormFooterItem>
                  <FormFooterItem>Precise budget and timeline details help brokers respond faster.</FormFooterItem>
                </div>

                <button
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[14px] border border-[#223152] bg-[linear-gradient(135deg,#35476d_0%,#253149_58%,#1a2439_100%)] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_18px_32px_rgba(37,49,73,0.22)] transition hover:-translate-y-0.5 hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[56px] sm:w-auto sm:min-w-[240px] sm:rounded-[18px] sm:px-7"
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitLabel}
                </button>
              </div>
            </div>
          </section>

          <aside className="xl:sticky xl:top-28">
            <section className="panel overflow-hidden rounded-[18px] border border-[#e3e7ef] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4 shadow-[0_24px_54px_rgba(15,23,42,0.08)] sm:px-6 sm:py-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.32em] text-brand-slate">Live Preview</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-brand-ink sm:text-[30px]">
                      {matchingListingsLabel}
                    </p>
                    <div className={cn(
                      "mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold",
                      matchInsightTone.chipClassName
                    )}>
                      <MatchInsightIcon />
                      <span>{matchInsightTone.label}</span>
                    </div>
                  </div>
                  <ScoreRing
                    score={liveMatchPercentage}
                    ringColor={matchInsightTone.ringColor}
                    ariaLabel={`Best listing match score ${liveMatchPercentage}%`}
                  />
                </div>

              <div className="mt-4 rounded-[18px] border border-[#e6ebf2] bg-white px-3 py-4 shadow-[0_12px_26px_rgba(15,23,42,0.05)] sm:mt-5 sm:rounded-[24px] sm:px-5 sm:py-5">
                <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em]", urgencyTone.badgeClassName)}>
                  <span className={cn("flex items-center justify-center", urgencyTone.accentClassName)} aria-hidden="true">
                    <UrgencyToneIcon urgency={values.urgency} />
                  </span>
                  <span>{urgencyTone.headline}</span>
                </div>

                <h2 className="mt-3 break-words text-2xl font-semibold leading-[1.12] tracking-[-0.04em] text-brand-ink sm:mt-4 sm:text-[28px]">{previewTitle}</h2>

                <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-3.5">
                  <PreviewSummaryRow icon="location" text={previewArea} />
                  <PreviewSummaryRow
                    icon="budget"
                    text={previewBudget}
                    subtleText={liveMatchPercentage > 0 ? `${liveMatchPercentage}% best current match score` : "No live listing has reached the current match threshold yet"}
                  />
                  <PreviewSummaryRow
                    icon="details"
                    text={`${formatPropertyType(values.propertyType)} | ${formatDealType(values.dealType)}`}
                    subtleText={`${previewBedrooms} | ${formatRequirementUrgency(values.urgency)} urgency`}
                  />
                </div>

                <div className="mt-4 rounded-[16px] border border-[#ecf0f5] bg-[#fbfcfe] px-3 py-3 sm:mt-6 sm:rounded-[20px] sm:px-4 sm:py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-slate">Buyer Brief Preview</p>
                  <p className="mt-3 text-[15px] leading-7 text-brand-ink">{previewBrief}</p>
                  <div className="mt-4 rounded-[16px] border border-[#edf1f5] bg-white px-3.5 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-slate">Timeline</p>
                    <p className="mt-2 text-[14px] leading-6 text-brand-slate">{previewTimeline}</p>
                  </div>
                </div>

              </div>
            </section>
          </aside>
        </div>
      </div>
      {successModalContent ? (
        <RequirementSuccessModal
          open
          title={successModalContent.title}
          message={successModalContent.message}
          onClose={closeSuccessModalToRequirements}
          onViewMyRequirements={closeSuccessModalToRequirements}
          onBackToDashboard={handleBackToDashboardFromSuccess}
        />
      ) : null}
    </AppShell>
  );
}
