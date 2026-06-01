"use client";

import { cn } from "@/lib/deal-utils";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="m20 20-4.4-4.4M18 10.8a7.2 7.2 0 1 1-14.4 0 7.2 7.2 0 0 1 14.4 0Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SearchField({
  ariaLabel,
  className,
  inputClassName,
  onChange,
  placeholder,
  value,
}: {
  ariaLabel: string;
  className?: string;
  inputClassName?: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className={cn("block min-w-0 w-full", className)}>
      <span className="sr-only">{ariaLabel}</span>
      <span className="relative block">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8b96ab]" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className={cn(
            "h-11 min-w-0 w-full rounded-[14px] border border-[#dfe5ef] bg-white pl-10 pr-4 text-[14px] text-[#1f2940] outline-none transition placeholder:text-[#9aa3b6] focus:border-[#cbb05c] focus:shadow-[0_0_0_4px_rgba(212,175,55,0.14)]",
            inputClassName
          )}
        />
      </span>
    </label>
  );
}
