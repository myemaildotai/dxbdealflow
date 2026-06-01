"use client";

import { cn } from "@/lib/deal-utils";
import {
  BrowseTabId,
  DealIntelItem,
  DealIntelTone,
} from "@/components/browse-listings/browse-listings-utils";

function CheckIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m5.2 10.15 3.1 3.1 6.5-6.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 2.75 11.45 7l4.25 1.45-4.25 1.45L10 14.15 8.55 9.9 4.3 8.45 8.55 7 10 2.75Z"
        fill="currentColor"
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
        d="M10 7.3v3.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="13.55" r=".8" fill="currentColor" />
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
        d="M4 13.75 7.3 10.45l2.5 2.5 5.2-6.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16.25h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MarketIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 12.2 8.15 9l2.2 2.2 4.7-5.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.4 6.1h2.65v2.65"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const toneClasses: Record<DealIntelTone, string> = {
  gold: "text-[#d49a17]",
  amber: "text-[#c28b16]",
  navy: "text-[#9f7a16]",
  slate: "text-brand-navy",
};

const iconMap = {
  "new-deals": SparkIcon,
  "urgent-sellers": AlertIcon,
  "below-market": MarketIcon,
  "recent-price-drop": ChartIcon,
} as const;

export function DealIntelStrip({
  items,
  activeTab,
  onTabChange,
}: {
  items: DealIntelItem[];
  activeTab: BrowseTabId;
  onTabChange: (tabId: BrowseTabId) => void;
}) {
  return (
    <div className="mb-3 max-w-full overflow-x-auto rounded-[14px] border border-[#e5e7ef] bg-[rgba(255,255,255,0.75)] px-1.5 py-1.5 shadow-[0_10px_28px_rgba(15,42,95,0.06)] backdrop-blur-[16px] [scrollbar-width:none] sm:mb-4 sm:rounded-[16px] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-h-[44px] min-w-max flex-nowrap items-center gap-1 sm:min-h-[52px] sm:min-w-0 sm:flex-wrap">
        <button
          type="button"
          onClick={() => onTabChange("all")}
          aria-pressed={activeTab === "all"}
          className={cn(
            "inline-flex h-[38px] min-w-[8rem] shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-semibold tracking-[-0.02em] transition duration-200 sm:h-[42px] sm:min-w-0 sm:flex-1 sm:gap-2 sm:rounded-[12px] sm:px-3 sm:text-sm md:flex-none md:px-4 md:text-[15px]",
            activeTab === "all"
              ? "bg-brand-navy text-white shadow-[0_10px_22px_rgba(15,42,95,0.18)]"
              : "bg-transparent text-[#24314c] hover:bg-white/80 hover:text-brand-navy",
          )}
        >
          <CheckIcon className="h-5 w-5 sm:h-8 sm:w-8" />
          Deal Intel
        </button>

        {items.map((item, index) => {
          const Icon = iconMap[item.id as keyof typeof iconMap] || SparkIcon;
          const isActive = activeTab === item.id;

          return (
            <div key={item.id} className="flex min-w-0 shrink-0 items-center sm:flex-1 md:flex-none">
              <span
                className={cn(
                  "mx-1 hidden h-6 w-px bg-[#e8ecf2] sm:block",
                  index === 0 ? "sm:ml-2" : "",
                  isActive ? "opacity-0" : "",
                )}
              />

              <button
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-pressed={isActive}
                className={cn(
                  "flex h-[38px] min-w-[10rem] shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-medium tracking-[-0.02em] transition duration-200 sm:h-[42px] sm:min-w-0 sm:flex-1 sm:gap-2 sm:rounded-[12px] sm:px-3 sm:text-sm md:flex-none md:gap-2.5 md:px-4 md:text-[15px]",
                  isActive
                    ? "bg-brand-navy text-white shadow-[0_10px_22px_rgba(15,42,95,0.18)]"
                    : "bg-transparent text-[#24314c] hover:bg-white/80 hover:text-brand-navy",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 sm:h-8 sm:w-8",
                    isActive ? "text-white" : toneClasses[item.tone],
                  )}
                />
                <span
                  className={cn(
                    "whitespace-nowrap font-semibold",
                    isActive ? "text-white" : "text-[#1f2b43]",
                  )}
                >
                  {item.value}
                </span>
                <span
                  className={cn(
                    "min-w-0 truncate whitespace-nowrap",
                    isActive ? "text-white" : "text-[#344256]",
                  )}
                >
                  {item.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
