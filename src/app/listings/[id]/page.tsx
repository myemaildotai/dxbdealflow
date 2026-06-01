"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, type UIEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSnackbar } from "notistack";
import PhoneInput, { type Value as PhoneNumberValue } from "react-phone-number-input";
import { BackButton } from "@/components/BackButton";
import { BrokerAvatar } from "@/components/BrokerAvatar";
import { ListingMediaLinks } from "@/components/ListingMediaLinks";
import { PublicHeader } from "@/components/PublicHeader";
import { SkeletonBlock } from "@/components/SkeletonBlock";
import { buildListingIntel, formatPercentValue } from "@/components/browse-listings/browse-listings-utils";
import { useAuth } from "@/auth/useAuth";
import { resolveBrokerChatHref } from "@/lib/chat-navigation";
import { apiFetch, getApiCacheKey, getCachedApiData } from "@/lib/deal-api";
import { Listing, type ListingImage } from "@/lib/deal-types";
import { cn, formatCurrency, formatDate, formatDealType, formatListingStatus, formatPropertyType, getFullName, statusClasses } from "@/lib/deal-utils";
import { isValidInternationalPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import { canAccessBrokerWorkspace, isAdmin } from "@/lib/route-access";
import { useSessionQuery } from "@/hooks/useSessionQuery";

type ListingDetailResponse = {
  listing: Listing;
};

type BrowseListingsResponse = {
  viewerIsBroker: boolean;
  areas: Array<{
    id: string;
    name: string;
    city: string;
    slug: string;
  }>;
  listings: Listing[];
};

type ListingWithUiMetrics = Listing & {
  enquiry_count?: number | null;
  brokers_engaged_count?: number | null;
  interest_level?: string | null;
  listing_score?: number | null;
  listing_score_label?: string | null;
  below_market_percent?: number | null;
  demand_label?: string | null;
};

type EnquiryField = "contactName" | "contactEmail" | "contactPhone" | "message";
type EnquiryFieldErrors = Partial<Record<EnquiryField, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("Unable to copy listing link.");
  }
}

function getListingScoreData(listing: Listing, imageCount: number) {
  const checklist = [
    hasText(listing.title),
    Boolean(listing.property_type),
    Boolean(listing.area_id || listing.area?.name),
    Boolean(listing.deal_type),
    typeof listing.price === "number" && listing.price > 0,
    typeof listing.size_sqft === "number" && listing.size_sqft > 0,
    typeof listing.bedrooms === "number" && listing.bedrooms >= 0,
    hasText(listing.developer),
    hasText(listing.description),
    imageCount > 0,
    hasText(listing.payment_plan),
    Boolean(listing.handover_date),
    typeof listing.yield_percent === "number" && Number.isFinite(listing.yield_percent),
    hasText(listing.notes),
  ];

  const completedCount = checklist.filter(Boolean).length;
  const score = Math.round((completedCount / Math.max(checklist.length, 1)) * 100);

  if (score >= 100) {
    return { score, label: "Excellent" };
  }

  if (score >= 80) {
    return { score, label: "Good" };
  }

  if (score >= 50) {
    return { score, label: "Average" };
  }

  return { score, label: "Needs work" };
}

function getScoreTone(score: number) {
  if (score >= 80) {
    return {
      badgeClassName: "border-[#cfe7de] bg-[#edf7f2] text-[#2a6f5c]",
      barClassName: "from-[#dbeee6] via-[#b7ddd0] to-[#88c8b5]",
    };
  }

  if (score >= 50) {
    return {
      badgeClassName: "border-[#eadbb2] bg-[#fff7e5] text-[#9e6e09]",
      barClassName: "from-[#f5e8c1] via-[#ead090] to-[#d6b256]",
    };
  }

  return {
    badgeClassName: "border-[#eccfcb] bg-[#fff2ef] text-[#b55647]",
    barClassName: "from-[#f6d6d1] via-[#ecb7ae] to-[#d98677]",
  };
}

function getDisplayMetric(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
}

function normalizeImageIndex(index: number, imageCount: number) {
  if (imageCount <= 0) {
    return 0;
  }

  const normalizedIndex = index % imageCount;
  return normalizedIndex < 0 ? normalizedIndex + imageCount : normalizedIndex;
}

function getOrderedListingImages(images: ListingImage[] | undefined) {
  if (!images?.length) {
    return [];
  }

  const sortedImages = [...images].sort((left, right) => left.sort_order - right.sort_order);
  const coverImage = sortedImages.find((image) => image.is_cover) || sortedImages[0];

  return [coverImage, ...sortedImages.filter((image) => image.id !== coverImage.id)];
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M12.5 4.167 6.667 10l5.833 5.833" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M11.879 4.046a1.75 1.75 0 1 1 2.475 2.475L7.24 13.636 4.167 14.5l.864-3.072 6.848-7.382Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m10.833 5.167 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M14.583 6.25a2.083 2.083 0 1 0 0-4.167 2.083 2.083 0 0 0 0 4.167ZM5.417 12.083a2.083 2.083 0 1 0 0-4.166 2.083 2.083 0 0 0 0 4.166ZM14.583 17.917a2.083 2.083 0 1 0 0-4.167 2.083 2.083 0 0 0 0 4.167Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="m7.208 8.958 5.584-3.333M7.208 11.042l5.584 3.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M1.667 10s3.03-5 8.333-5c5.304 0 8.333 5 8.333 5s-3.03 5-8.333 5c-5.304 0-8.333-5-8.333-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 12.083a2.083 2.083 0 1 0 0-4.166 2.083 2.083 0 0 0 0 4.166Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.167 5.833h11.666c.92 0 1.667.747 1.667 1.667v5c0 .92-.746 1.667-1.667 1.667H9.517l-3.892 2.916v-2.916H4.167A1.667 1.667 0 0 1 2.5 12.5v-5c0-.92.746-1.667 1.667-1.667Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 1.667 12.242 6.39l5.091.742-3.683 3.59.87 5.07L10 13.334l-4.52 2.458.87-5.07-3.683-3.59 5.09-.742L10 1.667Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 15.833c3.222 0 5.833-1.492 5.833-3.333S13.222 9.167 10 9.167 4.167 10.658 4.167 12.5 6.778 15.833 10 15.833Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M15.833 7.5c0 1.841-2.611 3.333-5.833 3.333S4.167 9.341 4.167 7.5 6.778 4.167 10 4.167s5.833 1.492 5.833 3.333Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.167 7.5v5M15.833 7.5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M4.583 10.417 8.125 13.75 15.417 5.833" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 2.083 15 4.375v4.813c0 3.125-2.135 6.042-5 6.98-2.865-.938-5-3.855-5-6.98V4.375L10 2.083Z"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path
        d="M10 2.083 15 4.375v4.813c0 3.125-2.135 6.042-5 6.98-2.865-.938-5-3.855-5-6.98V4.375L10 2.083Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m7.917 8.958 1.458 1.459 2.708-2.709" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M6.667 8.333V6.667a3.333 3.333 0 1 1 6.666 0v1.666"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.833 8.333h8.334c.46 0 .833.373.833.834V15a.833.833 0 0 1-.833.833H5.833A.833.833 0 0 1 5 15V9.167c0-.461.373-.834.833-.834Z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11.25v1.667" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
    </svg>
  );
}

function StarFilledIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M10 2.083 12.423 6.99l5.417.786-3.92 3.821.925 5.395L10 14.444l-4.845 2.548.925-5.395-3.92-3.82 5.417-.787L10 2.083Z" />
    </svg>
  );
}

function maskNameSegment(value?: string | null) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.length === 1) {
    return `${trimmedValue}*`;
  }

  return `${trimmedValue[0]}${"*".repeat(Math.max(trimmedValue.length - 1, 5))}`;
}

function getMaskedBrokerName(firstName?: string | null, lastName?: string | null) {
  const maskedName = [maskNameSegment(firstName), maskNameSegment(lastName)].filter(Boolean).join(" ").trim();
  return maskedName || "R***** A*******";
}

function EnquiryFieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm text-[#b24b40]">{message}</p>;
}

function ListingDetailSkeleton() {
  return (
    <section className="shell page-section">
      <div className="rounded-[28px] border border-brand-line/80 bg-white/95 p-4 shadow-[0_18px_42px_rgba(15,42,95,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SkeletonBlock className="h-14 w-44 rounded-2xl" />
          <div className="flex flex-wrap gap-3">
            <SkeletonBlock className="h-14 w-36 rounded-2xl" />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.72fr)_minmax(320px,0.78fr)]">
        <section className="rounded-[30px] border border-brand-line bg-white p-4 shadow-[0_20px_48px_rgba(15,42,95,0.08)] sm:p-6">
          <SkeletonBlock className="h-[360px] w-full rounded-[24px]" />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-28 w-full rounded-[20px]" />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <SkeletonBlock className="h-9 w-24 rounded-full" />
            <SkeletonBlock className="h-9 w-24 rounded-full" />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-3">
              <SkeletonBlock className="h-10 w-4/5 rounded-2xl" />
              <SkeletonBlock className="h-5 w-2/5 rounded-xl" />
              <SkeletonBlock className="h-5 w-full rounded-xl" />
              <SkeletonBlock className="h-5 w-5/6 rounded-xl" />
            </div>
            <div className="space-y-3">
              <SkeletonBlock className="h-4 w-20 rounded-xl" />
              <SkeletonBlock className="h-12 w-full rounded-2xl" />
            </div>
          </div>
          <SkeletonBlock className="mt-8 h-20 w-full rounded-[22px]" />
          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            <SkeletonBlock className="h-14 w-full rounded-full" />
            <SkeletonBlock className="h-14 w-full rounded-full" />
            <SkeletonBlock className="h-14 w-full rounded-full" />
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-24 w-full rounded-[22px]" />
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[30px] border border-brand-line bg-white p-6 shadow-[0_20px_48px_rgba(15,42,95,0.08)]">
            <SkeletonBlock className="h-9 w-48 rounded-xl" />
            <SkeletonBlock className="mt-5 h-9 w-full rounded-2xl" />
            <div className="mt-6 space-y-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <SkeletonBlock className="h-6 w-40 rounded-xl" />
                  <SkeletonBlock className="h-4 w-32 rounded-xl" />
                </div>
              ))}
            </div>
            <SkeletonBlock className="mt-6 h-40 w-full rounded-[24px]" />
          </section>
        </div>
      </div>
    </section>
  );
}

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const { enqueueSnackbar } = useSnackbar();
  const { user, loading: authLoading } = useAuth();
  const initialEnquiryForm = {
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    preferredChannel: "email" as const,
    message: "",
  };
  const [submitting, setSubmitting] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [form, setForm] = useState(initialEnquiryForm);
  const [fieldErrors, setFieldErrors] = useState<EnquiryFieldErrors>({});

  const listingId = params?.id;
  const requestPath = listingId ? `/api/listings/${listingId}` : "";
  const brokerView = canAccessBrokerWorkspace(user);
  const adminView = isAdmin(user);
  const internalView = brokerView || adminView;
  const viewerCacheKey = user?.uid || "public";
  const fetchListing = useCallback(() => apiFetch<ListingDetailResponse>(requestPath), [requestPath]);
  const { data, error, loading, refresh } = useSessionQuery<ListingDetailResponse>(getApiCacheKey(`${requestPath || "/api/listings/unknown"}?viewer=${viewerCacheKey}&internal=${internalView ? "1" : "0"}`), fetchListing, {
    enabled: !!listingId && !authLoading,
    ttlMs: 60_000,
  });

  const listing = data?.listing ?? null;
  const listingImages = listing?.listing_images;
  const images = useMemo(() => getOrderedListingImages(listingImages), [listingImages]);
  const activeImageCount = images.length;
  const safeSelectedImageIndex = normalizeImageIndex(selectedImageIndex, activeImageCount);
  const selectedImage = images[safeSelectedImageIndex] || null;
  const galleryWheelTargetRef = useRef<HTMLDivElement | null>(null);
  const thumbnailScrollerRef = useRef<HTMLDivElement | null>(null);
  const thumbnailButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isProgrammaticThumbnailScrollRef = useRef(false);
  const programmaticThumbnailScrollTimeoutRef = useRef<number | null>(null);
  const wheelThumbnailScrollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [listing?.id]);

  useEffect(() => {
    setSelectedImageIndex((current) => {
      const nextIndex = normalizeImageIndex(current, activeImageCount);
      return current === nextIndex ? current : nextIndex;
    });
  }, [activeImageCount]);

  const clearProgrammaticThumbnailScroll = useCallback(() => {
    if (programmaticThumbnailScrollTimeoutRef.current !== null) {
      window.clearTimeout(programmaticThumbnailScrollTimeoutRef.current);
      programmaticThumbnailScrollTimeoutRef.current = null;
    }

    isProgrammaticThumbnailScrollRef.current = false;
  }, []);

  const releaseProgrammaticThumbnailScroll = useCallback((delayMs: number) => {
    if (programmaticThumbnailScrollTimeoutRef.current !== null) {
      window.clearTimeout(programmaticThumbnailScrollTimeoutRef.current);
    }

    programmaticThumbnailScrollTimeoutRef.current = window.setTimeout(() => {
      isProgrammaticThumbnailScrollRef.current = false;
      programmaticThumbnailScrollTimeoutRef.current = null;
    }, delayMs);
  }, []);

  const getVisibleThumbnailIndex = useCallback((node: HTMLDivElement, scrollLeft = node.scrollLeft) => {
    const containerRect = node.getBoundingClientRect();
    const containerStyles = window.getComputedStyle(node);
    const paddingLeft = Number.parseFloat(containerStyles.paddingLeft) || 0;
    const activeLine = scrollLeft + paddingLeft;
    const viewportStart = scrollLeft;
    const viewportEnd = scrollLeft + node.clientWidth;
    let nextIndex: number | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    images.forEach((image, index) => {
      const button = thumbnailButtonRefs.current[image.id];
      if (!button) {
        return;
      }

      const buttonRect = button.getBoundingClientRect();
      const buttonStart = buttonRect.left - containerRect.left + node.scrollLeft;
      const buttonEnd = buttonStart + buttonRect.width;
      const visibleWidth = Math.min(buttonEnd, viewportEnd) - Math.max(buttonStart, viewportStart);
      if (visibleWidth <= 0) {
        return;
      }

      const distance = Math.abs(buttonStart - activeLine);
      if (distance < closestDistance) {
        closestDistance = distance;
        nextIndex = index;
      }
    });

    return nextIndex;
  }, [images]);

  const updateSelectedImageFromThumbnailScroll = useCallback((node: HTMLDivElement, scrollLeft = node.scrollLeft) => {
    if (activeImageCount <= 1) {
      return;
    }

    const nextIndex = getVisibleThumbnailIndex(node, scrollLeft);
    if (nextIndex === null) {
      return;
    }

    setSelectedImageIndex((current) => (current === nextIndex ? current : nextIndex));
  }, [activeImageCount, getVisibleThumbnailIndex]);

  const handleThumbnailScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    if (isProgrammaticThumbnailScrollRef.current) {
      return;
    }

    updateSelectedImageFromThumbnailScroll(event.currentTarget);
  }, [updateSelectedImageFromThumbnailScroll]);

  const scrollSelectedThumbnailIntoView = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    if (activeImageCount <= 1) {
      return;
    }

    const image = images[normalizeImageIndex(index, activeImageCount)];
    const button = image ? thumbnailButtonRefs.current[image.id] : null;
    if (!button) {
      return;
    }

    isProgrammaticThumbnailScrollRef.current = true;
    button.scrollIntoView({
      behavior,
      block: "nearest",
      inline: "nearest",
    });

    releaseProgrammaticThumbnailScroll(behavior === "smooth" ? 700 : 0);
  }, [activeImageCount, images, releaseProgrammaticThumbnailScroll]);

  const selectImage = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    if (activeImageCount <= 0) {
      return;
    }

    const nextIndex = normalizeImageIndex(index, activeImageCount);
    setSelectedImageIndex((current) => (current === nextIndex ? current : nextIndex));
    scrollSelectedThumbnailIntoView(nextIndex, behavior);
  }, [activeImageCount, scrollSelectedThumbnailIntoView]);

  const handleThumbnailWheel = useCallback((event: WheelEvent) => {
    const node = thumbnailScrollerRef.current;
    if (!node) {
      return;
    }

    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    if (maxScrollLeft <= 0) {
      return;
    }

    const rawScrollDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;

    if (rawScrollDelta === 0) {
      return;
    }

    const deltaMultiplier =
      event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientWidth : 1;
    const currentScrollLeft = node.scrollLeft;
    const nextScrollLeft = Math.min(
      maxScrollLeft,
      Math.max(0, currentScrollLeft + rawScrollDelta * deltaMultiplier),
    );

    if (Math.abs(nextScrollLeft - currentScrollLeft) < 0.5) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }
    clearProgrammaticThumbnailScroll();
    node.style.scrollSnapType = "none";

    node.scrollTo({ left: nextScrollLeft, behavior: "auto" });
    updateSelectedImageFromThumbnailScroll(node, nextScrollLeft);

    if (wheelThumbnailScrollTimeoutRef.current !== null) {
      window.clearTimeout(wheelThumbnailScrollTimeoutRef.current);
    }

    wheelThumbnailScrollTimeoutRef.current = window.setTimeout(() => {
      node.style.scrollSnapType = "";
      wheelThumbnailScrollTimeoutRef.current = null;
      updateSelectedImageFromThumbnailScroll(node);
    }, 140);
  }, [clearProgrammaticThumbnailScroll, updateSelectedImageFromThumbnailScroll]);

  useEffect(() => {
    const wheelTarget = galleryWheelTargetRef.current;
    if (!wheelTarget || activeImageCount <= 1) {
      return;
    }

    wheelTarget.addEventListener("wheel", handleThumbnailWheel, { passive: false });

    return () => {
      wheelTarget.removeEventListener("wheel", handleThumbnailWheel);
    };
  }, [activeImageCount, handleThumbnailWheel]);

  useEffect(() => {
    scrollSelectedThumbnailIntoView(0, "auto");
  }, [listing?.id, scrollSelectedThumbnailIntoView]);

  useEffect(() => clearProgrammaticThumbnailScroll, [clearProgrammaticThumbnailScroll]);

  useEffect(() => {
    const node = thumbnailScrollerRef.current;

    return () => {
      if (wheelThumbnailScrollTimeoutRef.current !== null) {
        window.clearTimeout(wheelThumbnailScrollTimeoutRef.current);
        wheelThumbnailScrollTimeoutRef.current = null;
      }

      if (node) {
        node.style.scrollSnapType = "";
      }
    };
  }, []);

  const validateEnquiryField = (field: EnquiryField, nextForm = form) => {
    switch (field) {
      case "contactName":
        return nextForm.contactName.trim() ? "" : "Full name is required.";
      case "contactEmail":
        if (!nextForm.contactEmail.trim()) {
          return "Email address is required.";
        }

        return EMAIL_REGEX.test(nextForm.contactEmail.trim()) ? "" : "Enter a valid email address.";
      case "contactPhone":
        if (!nextForm.contactPhone.trim()) {
          return "";
        }

        return isValidInternationalPhoneNumber(normalizePhoneNumber(nextForm.contactPhone))
          ? ""
          : "Enter a valid phone number for the selected country code.";
      case "message":
        return nextForm.message.trim() ? "" : "Message is required.";
      default:
        return "";
    }
  };

  const validateEnquiryForm = (nextForm = form) => {
    const nextErrors: EnquiryFieldErrors = {};
    const fields: EnquiryField[] = ["contactName", "contactEmail", "contactPhone", "message"];

    fields.forEach((field) => {
      const error = validateEnquiryField(field, nextForm);
      if (error) {
        nextErrors[field] = error;
      }
    });

    return nextErrors;
  };

  const updateEnquiryFieldError = (field: EnquiryField, nextForm: typeof form) => {
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      const error = validateEnquiryField(field, nextForm);

      if (error) {
        nextErrors[field] = error;
      } else {
        delete nextErrors[field];
      }

      return nextErrors;
    });
  };

  const handleEnquiryFieldChange = (field: EnquiryField, value: string) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);

    if (fieldErrors[field]) {
      updateEnquiryFieldError(field, nextForm);
    }
  };

  const handleShareListing = useCallback(async () => {
    if (!listing) return;

    const listingUrl = window.location.href;
    const shareData = {
      title: listing.title,
      text: listing.title,
      url: listingUrl,
    };

    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        return;
      }

      await copyTextToClipboard(listingUrl);
      enqueueSnackbar("Listing link copied.", { variant: "success" });
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        return;
      }

      try {
        await copyTextToClipboard(listingUrl);
        enqueueSnackbar("Listing link copied.", { variant: "success" });
      } catch (copyError) {
        enqueueSnackbar(copyError instanceof Error ? copyError.message : "Unable to copy listing link.", { variant: "error" });
      }
    }
  }, [enqueueSnackbar, listing]);

  const handleEnquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!listing) return;

    const nextForm = {
      ...form,
      contactName: form.contactName.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim(),
      message: form.message.trim(),
    };
    const nextErrors = validateEnquiryForm(nextForm);

    setForm(nextForm);

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      enqueueSnackbar("Please correct the highlighted fields before submitting.", { variant: "error" });
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/api/leads/public", {
        method: "POST",
        body: JSON.stringify({
          listingId: listing.id,
          contactName: nextForm.contactName,
          contactEmail: nextForm.contactEmail,
          contactPhone: nextForm.contactPhone ? normalizePhoneNumber(nextForm.contactPhone) : "",
          preferredChannel: nextForm.preferredChannel,
          message: nextForm.message,
        }),
      });
      enqueueSnackbar("Enquiry submitted successfully.", { variant: "success" });
      setForm(initialEnquiryForm);
      setFieldErrors({});
      await refresh();
    } catch (requestError) {
      enqueueSnackbar(requestError instanceof Error ? requestError.message : "Failed to submit enquiry.", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChat = async () => {
    if (!listing) return;

    setOpeningChat(true);
    try {
      const href = await resolveBrokerChatHref(listing.id);
      window.open(href, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningChat(false);
    }
  };

  if ((authLoading || loading) && !listing) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <ListingDetailSkeleton />
      </div>
    );
  }

  if (!listing && error) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <div className="shell page-section">
          <div className="panel p-10 text-center">
            <h1 className="font-heading text-3xl font-semibold text-brand-navy">Listing unavailable</h1>
            <p className="mt-3 text-sm text-brand-slate">This listing may be inactive, hidden, or no longer accessible.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  const uiListing = listing as ListingWithUiMetrics;
  const cachedListings =
    getCachedApiData<BrowseListingsResponse>("/api/listings?page=1&pageSize=12")?.listings ||
    getCachedApiData<BrowseListingsResponse>("/api/listings?page=1&pageSize=1000")?.listings ||
    [];
  const marketIntel = cachedListings.length ? buildListingIntel(listing, cachedListings) : null;
  const listingScoreData = getListingScoreData(listing, images.length);
  const listingScore = uiListing.listing_score ?? listingScoreData.score;
  const scoreTone = getScoreTone(listingScore);
  const scoreLabel = uiListing.listing_score_label || listingScoreData.label;
  const listingStatusLabel = formatListingStatus(listing.status);
  const priceLabel = formatCurrency(listing.price);
  const areaLabel = listing.area?.name || "Area pending";
  const description = listing.description || "No description provided.";
  const brokersEngagedValue = typeof uiListing.brokers_engaged_count === "number" ? uiListing.brokers_engaged_count : null;
  const enquiriesValue = typeof uiListing.enquiry_count === "number" ? uiListing.enquiry_count : null;
  const interestValue = uiListing.interest_level || marketIntel?.highlight || (internalView ? scoreLabel : areaLabel);
  const roiValue =
    marketIntel && marketIntel.roiPercent > 0
      ? `${formatPercentValue(marketIntel.roiPercent)} ROI`
      : typeof listing.yield_percent === "number" && Number.isFinite(listing.yield_percent)
        ? `${formatPercentValue(listing.yield_percent)} ROI`
        : "ROI Pending";
  const belowMarketValue =
    marketIntel && marketIntel.belowMarketPercent > 0
      ? formatPercentValue(marketIntel.belowMarketPercent)
      : typeof uiListing.below_market_percent === "number" && uiListing.below_market_percent > 0
        ? formatPercentValue(uiListing.below_market_percent)
        : priceLabel;
  const demandValue =
    uiListing.demand_label ||
    (marketIntel?.comparableCount
      ? `${marketIntel.comparableCount} comparable${marketIntel.comparableCount === 1 ? "" : "s"}`
      : areaLabel);
  const checklistItems = [
    {
      label: "Strong photos",
      complete: images.length > 0,
      helper: images.length ? `${images.length} image${images.length === 1 ? "" : "s"} uploaded` : "Add listing images",
    },
    {
      label: "Detailed description",
      complete: hasText(listing.description),
      helper: hasText(listing.description) ? `${listing.description?.trim().length || 0} characters added` : "Description missing",
    },
    {
      label: "Competitive price",
      complete: typeof listing.price === "number" && listing.price > 0,
      helper: typeof listing.price === "number" && listing.price > 0 ? priceLabel : "Price missing",
    },
  ];
  const publicBroker = listing.public_broker || null;
  const maskedBrokerName = getMaskedBrokerName(publicBroker?.first_name, publicBroker?.last_name);
  const brokerAvatarSrc = publicBroker?.profile_photo || null;
  const brokerRatingLabel = "4.8";
  const brokerDealsLabel = "127 Deals Closed";
  const enquiryLabelClassName = "mb-1.5 block text-[0.85rem] font-semibold text-[#384255] sm:mb-2 sm:text-[0.90rem]";
  const enquiryInputClassName =
    "h-11 w-full rounded-md border border-[#e4e8f0] bg-white px-3 text-sm text-[#1f2b44] shadow-[0_8px_18px_rgba(15,42,95,0.04)] outline-none transition placeholder:text-[#9ba5b8] focus:border-[#95ade6] focus:ring-4 focus:ring-[#dfe8ff] sm:h-12 sm:rounded-[12px] sm:px-4 sm:text-[0.90rem]";
  const enquiryErrorInputClassName = "border-[#d37b72] focus:border-[#d37b72] focus:ring-[#f1d1cd]";

  const goToPreviousImage = () => {
    if (images.length <= 1) return;
    selectImage(safeSelectedImageIndex - 1);
  };

  const goToNextImage = () => {
    if (images.length <= 1) return;
    selectImage(safeSelectedImageIndex + 1);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f9fc_0%,#f5f7fb_52%,#f8fafc_100%)]">
      <PublicHeader />

      <section className="shell page-section !pt-2 sm:!pt-8">
        <div className="hidden rounded-[12px] border border-brand-line/80 bg-white/95 p-3 shadow-[0_18px_42px_rgba(15,42,95,0.08)] backdrop-blur sm:block">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <BackButton
              fallbackHref="/listings"
              className="hidden min-h-[48px] items-center gap-2 rounded-2xl border border-brand-line bg-white px-5 text-[1.02rem] font-medium text-brand-navy shadow-[0_12px_28px_rgba(15,42,95,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-brand-blue/30 hover:bg-brand-panel-soft sm:inline-flex"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Back to Listings</span>
            </BackButton>

            {internalView ? (
              <div className="hidden w-full flex-wrap items-center gap-2 sm:gap-3 lg:flex lg:w-auto lg:justify-end">
                {listing.can_edit ? (
                  <Link
                    href={`/post-listing?id=${listing.id}`}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-brand-line bg-white px-4 text-sm font-medium text-brand-navy shadow-[0_12px_28px_rgba(15,42,95,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-brand-blue/30 hover:bg-brand-panel-soft sm:min-h-[48px] sm:w-auto sm:rounded-2xl sm:px-5 sm:text-[1.02rem]"
                  >
                    <PencilIcon className="h-5 w-5 text-brand-blue" />
                    <span>Edit Listing</span>
                  </Link>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handleShareListing()}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-brand-line bg-white px-4 text-sm font-medium text-brand-navy shadow-[0_12px_28px_rgba(15,42,95,0.06)] sm:min-h-[48px] sm:w-auto sm:rounded-2xl sm:px-5 sm:text-[1.02rem]"
                >
                  <ShareIcon className="h-5 w-5" />
                  <span>Share Listing</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1.72fr)_minmax(320px,0.78fr)]">
          <div className="space-y-4 lg:space-y-6">
            <section className="rounded-[16px] border border-brand-line bg-white p-2.5 shadow-[0_20px_48px_rgba(15,42,95,0.08)] lg:p-6">
              <div className="mb-3 flex items-start gap-3 lg:hidden">
                <h1 className="min-w-0 flex-1 break-words font-heading pt-2 text-xl font-bold leading-tight tracking-[-0.04em] text-brand-navy sm:text-2xl">
                  {listing.title}
                </h1>

                {listing.can_edit ? (
                  <Link
                    href={`/post-listing?id=${listing.id}`}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-line bg-white text-brand-navy shadow-[0_10px_22px_rgba(15,42,95,0.08)] transition duration-200 hover:border-brand-blue/30 hover:bg-brand-panel-soft sm:h-11 sm:w-11"
                    aria-label="Edit listing"
                  >
                    <PencilIcon className="h-5 w-5 text-brand-blue" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleShareListing()}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-line bg-white text-brand-navy shadow-[0_10px_22px_rgba(15,42,95,0.08)] transition duration-200 hover:border-brand-blue/30 hover:bg-brand-panel-soft sm:h-11 sm:w-11"
                    aria-label="Share listing"
                  >
                    <ShareIcon className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div ref={galleryWheelTargetRef} className="overflow-hidden rounded-[14px] border border-brand-line/70 bg-[linear-gradient(135deg,#eef3f8_0%,#dfe7f1_100%)] lg:rounded-[16px]">
                {selectedImage ? (
                  <div className="relative">
                    <div className="relative aspect-[4/3] overflow-hidden lg:aspect-[3]">
                      <Image
                        src={selectedImage.public_url}
                        alt={listing.title}
                        fill
                        priority={safeSelectedImageIndex === 0}
                        loading={safeSelectedImageIndex === 0 ? undefined : "eager"}
                        fetchPriority={safeSelectedImageIndex === 0 ? "high" : "auto"}
                        sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1279px) calc(100vw - 3rem), 66vw"
                        className="object-cover transition duration-500 hover:scale-[1.02]"
                      />
                    </div>

                    {images.length > 1 ? (
                      <>
                        <button
                          type="button"
                          onClick={goToPreviousImage}
                          className="absolute left-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-white/20 bg-[#10284f]/72 text-white shadow-[0_14px_28px_rgba(9,22,50,0.2)] backdrop-blur transition duration-200 hover:bg-[#0f2a5f] sm:left-3 sm:h-10 sm:w-10 lg:h-11 lg:w-11 lg:rounded-2xl"
                          aria-label="Previous image"
                        >
                          <ArrowLeftIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={goToNextImage}
                          className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-white/20 bg-[#10284f]/72 text-white shadow-[0_14px_28px_rgba(9,22,50,0.2)] backdrop-blur transition duration-200 hover:bg-[#0f2a5f] sm:right-3 sm:h-10 sm:w-10 lg:h-11 lg:w-11 lg:rounded-2xl"
                          aria-label="Next image"
                        >
                          <ArrowLeftIcon className="h-5 w-5 rotate-180" />
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center px-4 text-center text-sm font-medium text-brand-slate lg:aspect-[1.72] lg:px-6">
                    No images uploaded
                  </div>
                )}

                {images.length > 1 ? (
                  <div
                    ref={thumbnailScrollerRef}
                    onPointerDown={clearProgrammaticThumbnailScroll}
                    onScroll={handleThumbnailScroll}
                    className="flex cursor-grab touch-pan-x snap-x snap-mandatory gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain whitespace-nowrap border-t border-brand-line/70 bg-white p-1.5 pb-2 active:cursor-grabbing [scrollbar-width:thin]"
                  >
                    {images.map((image, index) => {
                      const isActiveThumbnail = index === safeSelectedImageIndex;

                      return (
                        <button
                          key={image.id}
                          ref={(node) => {
                            thumbnailButtonRefs.current[image.id] = node;
                          }}
                          type="button"
                          aria-pressed={isActiveThumbnail}
                          onClick={() => selectImage(index, "auto")}
                          className={cn(
                            "group relative w-[62%] shrink-0 snap-start overflow-hidden rounded-[10px] border bg-brand-panel-soft transition duration-200 sm:w-[30%] md:w-[22%] lg:w-[18rem] lg:rounded-[12px] xl:w-[15.5rem]",
                            isActiveThumbnail
                              ? "border-brand-navy shadow-[0_10px_24px_rgba(15,42,95,0.12)]"
                              : "border-transparent hover:border-brand-blue/25",
                          )}
                        >
                          <div className="relative aspect-[1.42] overflow-hidden">
                            <Image
                              src={image.public_url}
                              alt={`${listing.title} image ${index + 1}`}
                              fill
                              loading={index <= 3 ? "eager" : "lazy"}
                              sizes="(max-width: 640px) 72vw, (max-width: 768px) 31vw, (max-width: 1280px) 24vw, 248px"
                              quality={65}
                              className={cn(
                                "object-cover transition duration-300 group-hover:scale-[1.04] group-hover:opacity-95",
                                isActiveThumbnail ? "opacity-100" : "opacity-90",
                              )}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 lg:mt-6">
                {internalView ? (
                  <span className={cn(statusClasses(listing.status), "font-semibold")}>{listingStatusLabel.toUpperCase()}</span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-[#d9dfeb] bg-[#f5f7fc] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-navy">
                    {formatDealType(listing.deal_type).toUpperCase()}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full border border-[#d9dfeb] bg-[#f5f7fc] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-navy">
                  {formatPropertyType(listing.property_type).toUpperCase()}
                </span>
              </div>

              <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start lg:gap-5">
                <div className="min-w-0">
                  <h1 className="hidden font-heading text-[1.6rem] font-bold tracking-[-0.04em] text-brand-navy sm:text-[1.9rem] lg:block lg:text-[2.5rem]">
                    {listing.title}
                  </h1>
                  <p className="mt-2 text-sm text-brand-slate lg:mt-3 lg:text-base">
                    {areaLabel} | Added {formatDate(listing.created_at)}
                  </p>
                  <p className="mt-3 max-w-4xl text-sm leading-6 text-brand-slate lg:mt-4 lg:text-[1.03rem] lg:leading-8">{description}</p>
                </div>

                <div className="rounded-[12px] p-3 text-left lg:p-5 lg:text-right">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-brand-slate lg:text-[12px] lg:tracking-[0.32em]">Price</p>
                  <p className="mt-2 break-words font-heading text-xl font-semibold tracking-[-0.04em] text-brand-navy lg:mt-3 lg:text-3xl">
                    {priceLabel}
                  </p>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[6px] border border-brand-line/80 bg-[linear-gradient(180deg,#f7f9fc_0%,#f2f5fb_100%)] shadow-[0_10px_24px_rgba(15,42,95,0.04)] lg:mt-8">
                <div className="grid divide-y divide-brand-line/70 text-brand-navy sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <div className="flex items-center gap-2.5 px-3 py-3 lg:gap-3 lg:px-5 lg:py-4">
                    <EyeIcon className="h-5 w-5 shrink-0 text-[#66789f]" />
                    <div className="min-w-0">
                      <p className="text-[13px] text-brand-slate lg:text-sm">Brokers Engaged</p>
                      <p className="text-[0.98rem] font-semibold text-brand-navy lg:text-[1.02rem]">{getDisplayMetric(brokersEngagedValue)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-3 lg:gap-3 lg:px-5 lg:py-4">
                    <ChatIcon className="h-5 w-5 shrink-0 text-[#66789f]" />
                    <div className="min-w-0">
                      <p className="text-[13px] text-brand-slate lg:text-sm">Enquiries</p>
                      <p className="text-[0.98rem] font-semibold text-brand-navy lg:text-[1.02rem]">{getDisplayMetric(enquiriesValue)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-3 lg:gap-3 lg:px-5 lg:py-4">
                    <SparkIcon className="h-5 w-5 shrink-0 text-[#cf8b11]" />
                    <div className="min-w-0">
                      <p className="text-[13px] text-brand-slate lg:text-sm">Interest level</p>
                      <p className="truncate text-[0.98rem] font-semibold text-[#9e6e09] lg:text-[1.02rem]">{interestValue}</p>
                    </div>
                  </div>
                </div>
              </div>

              {listing.property_video_url ? (
                <div className="mt-8">
                  <ListingMediaLinks url={listing.property_video_url} />
                </div>
              ) : null}

              <div className="mt-8">
                <p className="text-[1.02rem] font-medium text-brand-slate">Deal Strength</p>
                <div className="mt-3 grid gap-2.5 lg:mt-4 lg:grid-cols-3 lg:gap-3">
                  <div className="flex items-center gap-2.5 border border-[#b7d8d6] bg-[linear-gradient(135deg,#7db7bf_0%,#68a7b0_55%,#5b99a5_100%)] px-3 py-3 text-white shadow-[0_14px_30px_rgba(91,153,165,0.18)] lg:gap-3 lg:px-4">
                    <SparkIcon className="h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/78">ROI</p>
                      <p className="truncate text-[1.02rem] font-semibold text-white">{roiValue}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 border border-[#ead7a4] bg-[linear-gradient(135deg,#f4deb0_0%,#dfc06b_58%,#d0a93d_100%)] px-3 py-3 text-[#6d4f08] shadow-[0_14px_30px_rgba(212,175,55,0.18)] lg:gap-3 lg:px-4">
                    <CoinIcon className="h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#8b6305]/75">Below Market</p>
                      <p className="truncate text-[1.02rem] font-semibold">{belowMarketValue}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 border border-[#dde2eb] bg-[linear-gradient(135deg,#f8fafc_0%,#edf1f7_100%)] px-3 py-3 text-brand-navy shadow-[0_12px_28px_rgba(15,42,95,0.06)] lg:gap-3 lg:px-4">
                    <SparkIcon className="h-5 w-5 shrink-0 text-[#66789f]" />
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.2em] text-brand-slate">Demand Area</p>
                      <p className="truncate text-[1.02rem] font-semibold text-brand-navy">{demandValue}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="overflow-hidden rounded-[6px] border border-brand-line/80 bg-[linear-gradient(180deg,#f9fbfe_0%,#f4f7fb_100%)] shadow-[0_10px_24px_rgba(15,42,95,0.04)]">
                  <div className="grid divide-y divide-brand-line/70 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
                    <div className="px-3 py-3 lg:px-5 lg:py-5">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-brand-slate">Bedrooms</p>
                      <p className="mt-2 text-lg font-semibold text-brand-ink">{listing.bedrooms ?? "N/A"}</p>
                    </div>
                    <div className="px-3 py-3 lg:px-5 lg:py-5">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-brand-slate">Size</p>
                      <p className="mt-2 text-lg font-semibold text-brand-ink">{listing.size_sqft ? `${listing.size_sqft} sqft` : "N/A"}</p>
                    </div>
                    <div className="px-3 py-3 lg:px-5 lg:py-5">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-brand-slate">{internalView ? "Visibility" : "Deal Type"}</p>
                      <p className="mt-2 text-lg font-semibold text-brand-ink">{internalView ? (listing.is_visible ? "Public" : "Hidden") : formatDealType(listing.deal_type)}</p>
                    </div>
                    <div className="px-3 py-3 lg:px-5 lg:py-5">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-brand-slate">{internalView ? "Status" : "Developer"}</p>
                      <p className="mt-2 text-lg font-semibold text-brand-ink">{internalView ? listingStatusLabel : listing.developer || "Not provided"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:space-y-6 xl:sticky xl:top-28 xl:self-start">
            {internalView ? (
              <section className="rounded-[12px] border border-brand-line bg-white p-4 shadow-[0_20px_48px_rgba(15,42,95,0.08)] lg:p-6">
                <div>
                  <h2 className="font-heading text-[1.35rem] font-semibold tracking-[-0.04em] text-brand-navy lg:text-[1.75rem]">
                    Listing Score: {listingScore}%
                  </h2>
                  <div className={cn("mt-5 inline-flex rounded-2xl border px-4 py-2 text-base font-medium", scoreTone.badgeClassName)}>
                    {scoreLabel}
                  </div>
                </div>

                <div className="mt-5 h-4 overflow-hidden rounded-full bg-[#edf2f6]">
                  <div className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-300", scoreTone.barClassName)} style={{ width: `${Math.max(6, Math.min(100, listingScore))}%` }} />
                </div>

                <div className="mt-6 space-y-5">
                  {checklistItems.map((item, index) => (
                    <div key={item.label} className={cn(index > 0 ? "border-t border-brand-line/70 pt-5" : "")}>
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                            item.complete ? "border-[#c9e6d6] bg-[#eef8f3] text-[#60b893]" : "border-[#e4d4d0] bg-[#fff4f1] text-[#c78a80]"
                          )}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[1rem] font-semibold text-brand-ink">{item.label}</p>
                          <p className="mt-1 text-sm text-brand-slate">{item.helper}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {!internalView ? (
              <section className="rounded-[12px] border border-[#e7ebf2] bg-white p-4 shadow-[0_24px_48px_rgba(16,36,80,0.10)] lg:p-7">
                <h2 className="font-heading text-[1.45rem] font-semibold tracking-[-0.04em] text-[#1c376b] lg:text-[1.95rem]">Connect with the Broker</h2>

                <div className="mt-3 flex items-center gap-3 rounded-[12px] bg-[#eef4ff] px-2 py-3 lg:mt-4 lg:py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#dce8ff] text-[#7a98df] lg:h-12 lg:w-12 lg:rounded-[16px]">
                    <ShieldIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-6 text-[#2b3f68] lg:text-[0.90rem] lg:leading-7">Fill in the below to connect with the broker and reveal all details.</p>
                    <p className="mt-1 text-[0.82rem] leading-5 text-[#5d6a82] lg:text-[0.85rem] lg:leading-6">We&apos;ll share your enquiry directly with the broker.</p>
                  </div>
                </div>

                <div className="mt-3 flex items-stretch overflow-hidden rounded-[14px] bg-white lg:mt-4 lg:rounded-[18px]">
                    <div className="flex w-[74px] items-center justify-center lg:w-[92px]">
                    <BrokerAvatar
                      src={brokerAvatarSrc}
                      alt="Broker profile"
                      className="h-[60px] w-[60px] rounded-[14px] border border-[#d9e7ff] lg:h-[78px] lg:w-[78px] lg:rounded-[18px]"
                    />
                  </div>

                  <div className="min-w-0 flex-1 py-2 pl-3 pr-3 lg:pl-4 lg:pr-4">
                    <p className="text-[0.85rem] font-medium text-[#7d879b] lg:text-[0.98rem]">Broker</p>

                    <p className="truncate text-[1.1rem] font-semibold tracking-[-0.04em] text-[#1b3566] lg:text-[1.5rem]">
                      {maskedBrokerName}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.82rem] text-[#4c5669] lg:gap-2 lg:text-[0.90rem]">
                      <StarFilledIcon className="h-4 w-4 text-[#1f2940]" />
                      <span className="font-semibold text-[#2e384d]">{brokerRatingLabel}</span>
                      <span className="text-[#a0a8b8]">|</span>
                      <span>{brokerDealsLabel}</span>
                    </div>
                  </div>
                </div>

                <form className="mt-4 grid gap-3 lg:mt-6 lg:gap-4" onSubmit={handleEnquiry}>
                  <div>
                    <label className={enquiryLabelClassName} htmlFor="public-enquiry-name">
                      Full Name *
                    </label>
                    <input
                      id="public-enquiry-name"
                      className={cn(enquiryInputClassName, fieldErrors.contactName ? enquiryErrorInputClassName : "")}
                      value={form.contactName}
                      onChange={(event) => handleEnquiryFieldChange("contactName", event.target.value)}
                      onBlur={() => updateEnquiryFieldError("contactName", form)}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      aria-invalid={fieldErrors.contactName ? "true" : "false"}
                      disabled={submitting}
                      required
                    />
                    <EnquiryFieldError message={fieldErrors.contactName} />
                  </div>
                  <div>
                    <label className={enquiryLabelClassName} htmlFor="public-enquiry-email">
                      Email Address *
                    </label>
                    <input
                      id="public-enquiry-email"
                      className={cn(enquiryInputClassName, fieldErrors.contactEmail ? enquiryErrorInputClassName : "")}
                      type="email"
                      value={form.contactEmail}
                      onChange={(event) => handleEnquiryFieldChange("contactEmail", event.target.value)}
                      onBlur={() => updateEnquiryFieldError("contactEmail", form)}
                      placeholder="Enter your email address"
                      autoComplete="email"
                      aria-invalid={fieldErrors.contactEmail ? "true" : "false"}
                      disabled={submitting}
                      required
                    />
                    <EnquiryFieldError message={fieldErrors.contactEmail} />
                  </div>
                  <div>
                    <label className={enquiryLabelClassName} htmlFor="public-enquiry-phone">
                      Phone Number
                    </label>
                    <PhoneInput
                      id="public-enquiry-phone"
                      international
                      countryCallingCodeEditable={false}
                      defaultCountry="AE"
                      value={(form.contactPhone || undefined) as PhoneNumberValue | undefined}
                      onChange={(value) => handleEnquiryFieldChange("contactPhone", value || "")}
                      onBlur={() => updateEnquiryFieldError("contactPhone", form)}
                      placeholder="Enter phone number"
                      autoComplete="tel"
                      className={cn(
                        "phone-input public-enquiry-phone-input",
                        fieldErrors.contactPhone ? "public-enquiry-phone-input--error" : ""
                      )}
                      aria-invalid={fieldErrors.contactPhone ? "true" : "false"}
                      disabled={submitting}
                    />
                    <EnquiryFieldError message={fieldErrors.contactPhone} />
                  </div>
                  <div>
                    <label className={enquiryLabelClassName} htmlFor="public-enquiry-message">
                      Message *
                    </label>
                    <textarea
                      id="public-enquiry-message"
                      className={cn(
                        "min-h-[104px] w-full rounded-md border border-[#e4e8f0] bg-white px-3 py-2 text-sm text-[#1f2b44] shadow-[0_8px_18px_rgba(15,42,95,0.04)] outline-none transition placeholder:text-[#9ba5b8] focus:border-[#95ade6] focus:ring-4 focus:ring-[#dfe8ff] sm:min-h-[124px] sm:rounded-[14px] sm:px-4 sm:py-3.5 sm:text-[0.98rem]",
                        fieldErrors.message ? enquiryErrorInputClassName : ""
                      )}
                      value={form.message}
                      onChange={(event) => handleEnquiryFieldChange("message", event.target.value)}
                      onBlur={() => updateEnquiryFieldError("message", form)}
                      placeholder="Share your requirements, budget and preferred timeline"
                      aria-invalid={fieldErrors.message ? "true" : "false"}
                      disabled={submitting}
                      required
                    />
                    <EnquiryFieldError message={fieldErrors.message} />
                  </div>
                  <button
                    className="mt-1 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#153a79] px-4 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(21,58,121,0.24)] transition duration-200 hover:bg-[#12346d] disabled:cursor-not-allowed disabled:bg-[#45659b] sm:min-h-[56px] sm:gap-2.5 sm:rounded-[16px] sm:px-5 sm:text-[1.02rem]"
                    type="submit"
                    disabled={submitting}
                  >
                    <LockIcon className="h-[18px] w-[18px]" />
                    <span>{submitting ? "Submitting..." : "Submit Enquiry"}</span>
                  </button>
                </form>

                <div className="mt-3 flex items-center justify-center gap-2 text-center text-sm font-medium text-[#8b94a7] lg:mt-4 lg:text-[0.95rem]">
                  <LockIcon className="h-4 w-4" />
                  <span>Your details are safe and secure</span>
                </div>
              </section>
            ) : (
              <section className="rounded-[12px] border border-brand-line bg-white p-4 shadow-[0_20px_48px_rgba(15,42,95,0.08)] lg:p-6">
                <h2 className="font-heading text-[1.35rem] font-semibold tracking-[-0.03em] text-brand-navy lg:text-[1.75rem]">Broker tools</h2>
                <div className="mt-4 rounded-[14px] border border-brand-line/80 bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)] p-3 shadow-[0_14px_32px_rgba(15,42,95,0.06)] lg:mt-5 lg:rounded-[18px] lg:p-5">
                  <p className="text-base font-semibold text-brand-ink lg:text-lg">{getFullName(listing.owner?.first_name, listing.owner?.last_name)}</p>
                  <p className="mt-2 text-sm text-brand-slate">{listing.owner?.email || "Email hidden"}</p>
                  <p className="mt-1 text-sm text-brand-slate">{listing.owner?.phone || "Phone hidden"}</p>
                  <p className="mt-3 text-sm font-semibold text-brand-ink lg:mt-4">{listing.agency?.name || "Agency not set"}</p>
                  <p className="mt-2 text-sm text-brand-slate">Payment plan: {listing.payment_plan || "Not provided"}</p>
                  <p className="mt-1 text-sm text-brand-slate">Handover: {formatDate(listing.handover_date)}</p>
                  <p className="mt-1 text-sm text-brand-slate">
                    Co-broke: {typeof listing.commission_terms?.co_broke_percent === "number" ? `${listing.commission_terms.co_broke_percent}%` : "TBD"}
                  </p>
                  {adminView || listing.can_edit ? (
                    <p className="mt-1 text-sm text-brand-slate">
                      Documents: {listing.listing_documents?.length || 0} attached
                    </p>
                  ) : null}
                  {adminView ? (
                    <>
                      <p className="mt-1 text-sm text-brand-slate">Credits used: {listing.credits_used}</p>
                      <p className="mt-1 text-sm text-brand-slate">Internal notes: {listing.notes || "Not provided"}</p>
                    </>
                  ) : null}
                </div>

                {listing.can_chat ? (
                  <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:gap-3 lg:mt-5">
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#173972_0%,#0F2A5F_58%,#0C214B_100%)] px-4 text-sm font-medium text-white shadow-[0_16px_30px_rgba(15,42,95,0.18)] transition duration-200 hover:-translate-y-0.5 sm:w-auto lg:min-h-[52px] lg:rounded-2xl lg:px-5"
                      onClick={handleOpenChat}
                      disabled={openingChat}
                    >
                      {openingChat ? "Opening..." : "Open Chat"}
                    </button>
                    {listing.can_edit ? (
                      <Link
                        href={`/post-listing?id=${listing.id}`}
                        className="hidden min-h-[44px] w-full items-center justify-center rounded-xl border border-brand-line bg-white px-4 text-sm font-medium text-brand-navy shadow-[0_10px_24px_rgba(15,42,95,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-brand-blue/30 hover:bg-brand-panel-soft sm:w-auto lg:inline-flex lg:min-h-[52px] lg:rounded-2xl lg:px-5"
                      >
                        Edit Listing
                      </Link>
                    ) : null}
                  </div>
                ) : listing.can_edit ? (
                  <div className="mt-4 hidden lg:mt-5 lg:block">
                    <Link
                      href={`/post-listing?id=${listing.id}`}
                      className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-brand-line bg-white px-4 text-sm font-medium text-brand-navy shadow-[0_10px_24px_rgba(15,42,95,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-brand-blue/30 hover:bg-brand-panel-soft sm:w-auto lg:min-h-[52px] lg:rounded-2xl lg:px-5"
                    >
                      Edit Listing
                    </Link>
                  </div>
                ) : ( null  )}
              </section>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
