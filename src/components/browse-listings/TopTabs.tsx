"use client";

import { cn } from "@/lib/deal-utils";
import {
  BrowseTab,
  BrowseTabId,
} from "@/components/browse-listings/browse-listings-utils";

function StarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 3.2 11.8 6.9l4.1.6-2.95 2.87.7 4.06L10 12.56 6.35 14.5l.7-4.06L4.1 7.5l4.1-.6L10 3.2Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 3.2 17 16.2H3L10 3.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 7.15v3.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="13.55" r=".85" fill="currentColor" />
    </svg>
  );
}

function ChartIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 13.9 7.15 10.75l2.35 2.35 5.25-6.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16.15h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GlobeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="6.8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.7 10h12.6M10 3.3c1.55 1.9 2.35 4.14 2.35 6.7 0 2.56-.8 4.8-2.35 6.7M10 3.3C8.45 5.2 7.65 7.44 7.65 10c0 2.56.8 4.8 2.35 6.7"
        stroke="currentColor"
        strokeWidth="1.35"
      />
    </svg>
  );
}

function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="4.8"
        y="8.7"
        width="10.4"
        height="7.2"
        rx="1.7"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7.1 8.7V7.45A2.9 2.9 0 0 1 10 4.55a2.9 2.9 0 0 1 2.9 2.9V8.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m8 5.8 4.2 4.2L8 14.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const preferredOrder: BrowseTabId[] = [
  "all",
  "new-deals",
  "best-deals",
  "urgent-sellers",
  "below-market",
  "recent-price-drop",
  "off-market",
];

const iconMap: Record<BrowseTabId, typeof StarIcon> = {
  all: GlobeIcon,
  "new-deals": StarIcon,
  "best-deals": StarIcon,
  "urgent-sellers": AlertIcon,
  "below-market": ChartIcon,
  "off-market": LockIcon,
  "recent-price-drop": ChartIcon,
};

export function TopTabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: BrowseTab[];
  activeTab: BrowseTabId;
  onChange: (tabId: BrowseTabId) => void;
}) {
  const orderedTabs = [...tabs].sort(
    (left, right) =>
      preferredOrder.indexOf(left.id) - preferredOrder.indexOf(right.id),
  );

  return (
    <div className="overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-2.5">
        {orderedTabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = iconMap[tab.id] || GlobeIcon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "group inline-flex min-h-[44px] shrink-0 items-center gap-3 rounded-[14px] border px-3.5 py-2.5 text-left shadow-[0_8px_18px_rgba(15,42,95,0.05)] transition duration-200",
                isActive
                  ? "border-[#d9e2ef] bg-[#f7faff] text-brand-navy"
                  : "border-[#e4e8f0] bg-white text-[#425168] hover:-translate-y-0.5 hover:border-[#d7deea] hover:text-brand-navy",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  tab.id === "urgent-sellers"
                    ? "bg-[#fff0e3] text-[#b76412]"
                    : tab.id === "best-deals"
                      ? "bg-[#fff4d7] text-[#ae7c10]"
                      : "bg-[#edf2fa] text-brand-navy",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>

              <span className="whitespace-nowrap text-[15px] font-semibold tracking-[-0.02em]">
                {tab.label}
              </span>

              <span
                className={cn(
                  "inline-flex min-w-[26px] items-center justify-center rounded-full px-2 py-1 text-[11px] font-semibold",
                  isActive
                    ? "bg-white text-brand-navy"
                    : "bg-[#f4f7fb] text-[#66748b]",
                )}
              >
                {tab.count}
              </span>

              <ChevronRightIcon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  isActive ? "text-brand-navy" : "text-[#98a4b6]",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
