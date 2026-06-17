"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { BrokerAvatar } from "@/components/BrokerAvatar";
import { EmptyState } from "@/components/EmptyState";
import { ListPaginationControls } from "@/components/ListPaginationControls";
import { MatchSubmissionDetailModal } from "@/components/MatchSubmissionDetailModal";
import { RequirementDeleteDialog } from "@/components/RequirementDeleteDialog";
import { RequirementMatchesBrokerModal } from "@/components/RequirementMatchesBrokerModal";
import {
  RequirementModalField,
  RequirementModalLabel,
  RequirementModalPanel,
  RequirementModalShell,
} from "@/components/RequirementModalPrimitives";
import { useClientPagination } from "@/hooks/useClientPagination";
import {
  getImmediateBrokerChatHref,
  warmBrokerChatPayload,
} from "@/lib/chat-navigation";
import { apiFetch } from "@/lib/deal-api";
import { invalidateRequirementCaches } from "@/lib/client-cache";
import type { BrokerChatNavigationSummary, Requirement, RequirementMatch } from "@/lib/deal-types";
import { cn, formatCurrency, formatDate, formatDateTime, formatDealType, formatPropertyType, formatRequirementUrgency } from "@/lib/deal-utils";
import { formatRequirementBedrooms, getRequirementStatus } from "@/lib/requirements";

type RequirementStatusFilterId = "all" | "active" | "inactive" | "closed";
type RequirementSortId = "newest" | "oldest" | "budget_high" | "submissions_high";
type RequirementStatusAction = "activate" | "deactivate";
type PendingRequirementStatusAction = {
  action: RequirementStatusAction;
  requirement: Requirement;
};

type RequirementMatchesResponse = {
  submittedMatches: RequirementMatch[];
  matches: RequirementMatch[];
};

const STATUS_FILTER_OPTIONS: Array<{ value: RequirementStatusFilterId; label: string; description: string }> = [
  { value: "all", label: "All Requirements", description: "Show every requirement in your board." },
  { value: "active", label: "Active Only", description: "Focus on currently live buyer briefs." },
  { value: "inactive", label: "Inactive Only", description: "Review paused requirements." },
  { value: "closed", label: "Closed Only", description: "View requirements already closed." },
];

const SORT_OPTIONS: Array<{ value: RequirementSortId; label: string; description: string }> = [
  { value: "newest", label: "Newest first", description: "Latest buyer briefs at the top." },
  { value: "oldest", label: "Oldest first", description: "Review your earliest requirements first." },
  { value: "budget_high", label: "Highest budget", description: "Show highest-value opportunities first." },
  { value: "submissions_high", label: "Most submissions", description: "Surface the busiest requirements first." },
];

const LAYER_ORDER = {
  actionMenu: 80,
  toolbarMenu: 90,
  modal: 70,
} as const;

function useAnchoredLayer<TTrigger extends HTMLElement>({
  open,
  onClose,
  width,
  align = "end",
  offset = 10,
}: {
  open: boolean;
  onClose: () => void;
  width: number | "trigger";
  align?: "start" | "end";
  offset?: number;
}) {
  const triggerRef = useRef<TTrigger | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({
    top: -9999,
    left: -9999,
    width: width === "trigger" ? 220 : width,
    maxHeight: 320,
  });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) {
      return;
    }

    const viewportPadding = 12;
    const rect = triggerRef.current.getBoundingClientRect();
    const nextWidth = width === "trigger" ? Math.max(rect.width, 220) : width;
    let nextLeft = align === "end" ? rect.right - nextWidth : rect.left;
    const layerHeight = contentRef.current?.offsetHeight ?? 260;
    const availableBelow = window.innerHeight - rect.bottom - offset - viewportPadding;
    const availableAbove = rect.top - offset - viewportPadding;
    const shouldOpenAbove = availableBelow < layerHeight && availableAbove > availableBelow;
    let nextTop = shouldOpenAbove ? rect.top - offset - layerHeight : rect.bottom + offset;

    nextLeft = Math.max(viewportPadding, Math.min(nextLeft, window.innerWidth - nextWidth - viewportPadding));
    nextTop = Math.max(viewportPadding, Math.min(nextTop, window.innerHeight - layerHeight - viewportPadding));

    setPosition({
      top: nextTop,
      left: nextLeft,
      width: nextWidth,
      maxHeight: Math.max(160, shouldOpenAbove ? availableAbove : availableBelow),
    });
  }, [align, offset, width]);

  useEffect(() => {
    if (!open) {
      return;
    }

    updatePosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (triggerRef.current?.contains(target) || contentRef.current?.contains(target)) {
        return;
      }

      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const handleReposition = () => {
      updatePosition();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [onClose, open, updatePosition]);

  return {
    triggerRef,
    contentRef,
    position,
  };
}

function countRequirementSubmittedMatches(requirement: Requirement) {
  return requirement.submitted_match_count || 0;
}

function getResolvedRequirementStatus(requirement: Requirement) {
  return requirement.status || getRequirementStatus(requirement);
}

function getRequirementLabel(requirement: Pick<Requirement, "title" | "area">) {
  return requirement.title || `Buyer brief in ${requirement.area || "preferred areas"}`;
}

function getRequirementSearchText(requirement: Requirement) {
  const bedroomsLabel = formatRequirementBedrooms(requirement.bedrooms);

  return [
    requirement.title,
    requirement.description,
    requirement.area,
    requirement.deal_type,
    requirement.property_type,
    bedroomsLabel,
    requirement.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function RequirementStatusConfirmationDialog({
  action,
  loading,
  onClose,
  onConfirm,
}: {
  action: RequirementStatusAction;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isActivating = action === "activate";
  const closeIfIdle = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <RequirementModalShell onClose={closeIfIdle} maxWidthClassName="max-w-lg">
      <div className="p-3 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Confirm Requirement Action</p>
            <h3 className="mt-2 text-2xl font-semibold text-brand-navy">
              {isActivating ? "Activate requirement?" : "Deactivate requirement?"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-brand-slate">
              {isActivating
                ? "This requirement will become active and visible again."
                : "This requirement will be deactivated and hidden from active requirement views."}
            </p>
          </div>
          <button
            type="button"
            onClick={closeIfIdle}
            className="modal-close-button"
            disabled={loading}
            aria-label="Close confirmation"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? "Saving..." : isActivating ? "Activate" : "Deactivate"}
          </button>
        </div>
      </div>
    </RequirementModalShell>
  );
}

function formatRelativeTime(value: string | null | undefined) {
  if (!value) {
    return "Just now";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return formatDate(value);
}

function getRequirementBudgetLine(requirement: Requirement) {
  if (requirement.budget_min !== null && requirement.budget_min !== undefined && requirement.budget_max !== null && requirement.budget_max !== undefined) {
    return `${formatCurrency(requirement.budget_min)} - ${formatCurrency(requirement.budget_max)}`;
  }

  if (requirement.budget_max !== null && requirement.budget_max !== undefined) {
    return `Up to ${formatCurrency(requirement.budget_max)}`;
  }

  if (requirement.budget_min !== null && requirement.budget_min !== undefined) {
    return `From ${formatCurrency(requirement.budget_min)}`;
  }

  return "Budget on request";
}

function getRequirementSummaryLine(requirement: Requirement) {
  const bedroomsLabel = formatRequirementBedrooms(requirement.bedrooms);

  return [
    bedroomsLabel || "Open bedrooms",
    formatPropertyType(requirement.property_type),
    getRequirementBudgetLine(requirement),
    requirement.area || "Flexible area",
  ]
    .filter(Boolean)
    .join(" | ");
}

function getRequirementStateMessage(requirement: Requirement, requirementStatus: Requirement["status"] | RequirementStatusFilterId) {
  const submittedMatchCount = countRequirementSubmittedMatches(requirement);

  if (requirementStatus === "closed") {
    return "Closed requirement";
  }

  if (requirementStatus === "inactive") {
    return requirement.deactivated_by === "admin" ? "Paused by admin" : "Paused by you";
  }

  if (submittedMatchCount > 0) {
    return `Matched with ${submittedMatchCount} broker submission${submittedMatchCount === 1 ? "" : "s"}`;
  }

  return "Awaiting broker submissions";
}

function getRequirementActivityTimestamp(requirement: Requirement, requirementStatus: Requirement["status"] | RequirementStatusFilterId) {
  if (requirement.deleted_at && requirementStatus === "closed") {
    return `Closed ${formatRelativeTime(requirement.deleted_at)}`;
  }

  if (requirement.latest_submission_at) {
    return `Latest activity ${formatRelativeTime(requirement.latest_submission_at)}`;
  }

  return `Posted ${formatRelativeTime(requirement.created_at)}`;
}

function getStatusBadgeLabel(status: Requirement["status"] | RequirementStatusFilterId) {
  if (status === "closed") return "Closed";
  if (status === "inactive") return "Inactive";
  if (status === "active") return "Active";
  return "Unknown";
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16L21 21" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M4 6H20" strokeLinecap="round" />
      <path d="M7 12H17" strokeLinecap="round" />
      <path d="M10 18H14" strokeLinecap="round" />
    </svg>
  );
}

function SortIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M8 6L5 9L8 12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9H15" strokeLinecap="round" />
      <path d="M16 18L19 15L16 12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 15H19" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M7 10L12 15L17 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.75C12.34 2.75 12.66 2.94 12.81 3.24L15.09 7.88L19.88 8.57C20.21 8.62 20.49 8.85 20.61 9.16C20.73 9.48 20.67 9.83 20.46 10.08L17 13.49L17.82 18.3C17.88 18.63 17.74 18.97 17.46 19.16C17.18 19.36 16.81 19.39 16.51 19.25L12.24 17L7.97 19.25C7.67 19.4 7.3 19.36 7.02 19.16C6.74 18.97 6.6 18.63 6.66 18.3L7.48 13.49L4.02 10.08C3.81 9.83 3.75 9.48 3.87 9.16C3.99 8.85 4.27 8.62 4.6 8.57L9.39 7.88L11.67 3.24C11.82 2.94 12.14 2.75 12.48 2.75H12Z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12.5L15.5 14.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M2.5 12C4.8 7.7 8.1 5.5 12 5.5C15.9 5.5 19.2 7.7 21.5 12C19.2 16.3 15.9 18.5 12 18.5C8.1 18.5 4.8 16.3 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M4 20H8L18 10C18.5 9.5 18.5 8.7 18 8.2L15.8 6C15.3 5.5 14.5 5.5 14 6L4 16V20Z" strokeLinejoin="round" />
      <path d="M12.5 7.5L16.5 11.5" strokeLinecap="round" />
    </svg>
  );
}

function PowerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M12 3.5V11" strokeLinecap="round" />
      <path d="M7.25 5.75C5.25 7.1 4 9.37 4 12C4 16.42 7.58 20 12 20C16.42 20 20 16.42 20 12C20 9.37 18.75 7.1 16.75 5.75" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M4.5 7H19.5" strokeLinecap="round" />
      <path d="M9 3.75H15" strokeLinecap="round" />
      <path d="M8 7L8.6 18.1C8.66 19.15 9.53 19.97 10.58 19.97H13.42C14.47 19.97 15.34 19.15 15.4 18.1L16 7" strokeLinejoin="round" />
      <path d="M10 10.25V16" strokeLinecap="round" />
      <path d="M14 10.25V16" strokeLinecap="round" />
    </svg>
  );
}

function DotsVerticalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="12" cy="5" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="12" cy="19" r="1.9" />
    </svg>
  );
}

function RequirementBadge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "warm" | "success" | "danger";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-[11px] xl:px-3 xl:tracking-[0.16em]",
        tone === "warm" && "border-[#ead4a9] bg-[#faeedb] text-[#b47923]",
        tone === "success" && "border-[#d3e6d6] bg-[#edf7ef] text-[#4a8057]",
        tone === "danger" && "border-[#ecd1cf] bg-[#fbefee] text-[#b25d54]",
        tone === "neutral" && "border-[#e5ddd4] bg-[#f7f3ee] text-[#6d717a]"
      )}
    >
      {children}
    </span>
  );
}

function RequirementStatPill({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#ead7b8] bg-[linear-gradient(180deg,#fcf2df_0%,#f3e2bd_100%)] px-3 py-1.5 text-xs font-semibold text-[#71511d] shadow-[0_8px_16px_rgba(193,145,63,0.14)] sm:gap-2 sm:text-[13px] xl:px-4 xl:py-2 xl:text-[14px]">
      <span className="text-[#c38b2f]">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

function RequirementMetadataItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#a79373]">{label}</p>
      <p className="mt-1 truncate text-[13px] font-medium text-[#464d5d] xl:text-[14px]">{value}</p>
    </div>
  );
}

function RequirementDetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return <RequirementModalField label={label} value={value} />;
}

function RequirementMenuAction({
  icon,
  label,
  danger = false,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[14px] px-3.5 py-3 text-left text-[14px] font-medium transition",
        disabled && "cursor-not-allowed text-[#9d9488] opacity-60",
        !disabled && !danger && "text-[#f7efe5] hover:bg-white/8",
        !disabled && danger && "text-[#ffd8d0] hover:bg-[#7c3c35]/22"
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function ToolbarFieldShell({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="h-full min-h-[54px] w-full rounded-[16px] bg-[rgba(255,255,255,0.12)] pl-2 text-[15px] font-medium text-[#fbf5eb] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] outline-none transition placeholder:text-[#cdbfa9] focus:border-[#d9bc8e] focus:bg-[rgba(255,255,255,0.16)] focus:shadow-[0_0_0_3px_rgba(217,188,142,0.16)]">
      <div className="flex h-full items-center gap-3">
        <span className="flex h-10 w-10 [border-style:none] shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.08] text-[#ead4af] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex h-full items-center">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ToolbarSelectMenu({
  menuId,
  label,
  icon,
  value,
  options,
  isOpen,
  onOpenChange,
  onRequestPriority,
  onChange,
}: {
  menuId: "filter" | "sort";
  label: string;
  icon: ReactNode;
  value: string;
  options: Array<{ value: string; label: string; description: string }>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestPriority: () => void;
  onChange: (nextValue: string) => void;
}) {
  const selectedOption = options.find((option) => option.value === value) || options[0];
  const { triggerRef, contentRef, position } = useAnchoredLayer<HTMLButtonElement>({
    open: isOpen,
    onClose: () => onOpenChange(false),
    width: "trigger",
  });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!isOpen) {
            onRequestPriority();
          }

          onOpenChange(!isOpen);
        }}
        className="block w-full text-left"
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={`${menuId}-requirements-menu`}
      >
        <ToolbarFieldShell icon={icon}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[#fbf5eb]">{selectedOption.label}</p>
            </div>
            <ChevronDownIcon className={cn("h-4 w-4 shrink-0 text-[#d7c39f] transition", isOpen && "rotate-180")} />
          </div>
        </ToolbarFieldShell>
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={contentRef}
              id={`${menuId}-requirements-menu`}
              className="overflow-y-auto rounded-[20px] border border-[#6d5847] bg-[linear-gradient(180deg,#2f2523_0%,#231c21_100%)] p-2 shadow-[0_28px_44px_rgba(0,0,0,0.34)]"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight,
                zIndex: LAYER_ORDER.toolbarMenu,
              }}
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "block w-full rounded-[14px] px-3.5 py-3 text-left transition",
                    option.value === value ? "bg-white/10 text-[#fff7ed]" : "text-[#e7d8c6] hover:bg-white/8"
                  )}
                >
                  <p className="text-[14px] font-semibold">{option.label}</p>
                  <p className={cn("mt-1 text-[12px]", option.value === value ? "text-[#dcc8ae]" : "text-[#b8ac9c]")}>{option.description}</p>
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function RequirementDetailsModal({
  requirement,
  onClose,
}: {
  requirement: Requirement;
  onClose: () => void;
}) {
  const requirementStatus = getResolvedRequirementStatus(requirement);
  const bedroomsLabel = formatRequirementBedrooms(requirement.bedrooms);
  const submittedMatchCount = countRequirementSubmittedMatches(requirement);
  const submittedMatchesLabel = `${submittedMatchCount} match${submittedMatchCount === 1 ? "" : "s"}`;
  const summaryLine = getRequirementSummaryLine(requirement);
  const overviewItems = [
    { label: "Status", value: getStatusBadgeLabel(requirementStatus) },
    { label: "Urgency", value: formatRequirementUrgency(requirement.urgency) },
    { label: "Submitted Matches", value: submittedMatchesLabel },
  ];
  const criteriaItems = [
    { label: "Property Type", value: formatPropertyType(requirement.property_type) },
    { label: "Bedrooms", value: bedroomsLabel || "Not specified" },
    { label: "Deal Type", value: formatDealType(requirement.deal_type) },
    { label: "Budget", value: getRequirementBudgetLine(requirement) },
    { label: "Area", value: requirement.area || "Flexible area" },
    { label: "Timeline", value: requirement.timeline || "Not specified" },
  ];
  const activityItems = [
    { label: "Created", value: formatDateTime(requirement.created_at) },
    { label: "Updated", value: formatDateTime(requirement.updated_at) },
    { label: "Latest Activity", value: requirement.latest_submission_at ? formatDateTime(requirement.latest_submission_at) : "No recent submission activity" },
  ];

  return (
    <RequirementModalShell onClose={onClose} maxWidthClassName="lg:max-w-[55rem]">
      <div className="border-b border-[#ece2d6] bg-[linear-gradient(180deg,#fbf7f2_0%,#f4ede5_100%)] px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#b48a40]">Requirement Details</p>
            <h3 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-[#202738]">{getRequirementLabel(requirement)}</h3>
            <p className="mt-2 text-[15px] text-[#6b7281]">{summaryLine}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <RequirementBadge tone={requirementStatus === "active" ? "success" : requirementStatus === "closed" ? "danger" : "neutral"}>
                {getStatusBadgeLabel(requirementStatus)}
              </RequirementBadge>
              <RequirementBadge tone={requirement.urgency === "high" || requirement.urgency === "hot" ? "warm" : "neutral"}>
                {formatRequirementUrgency(requirement.urgency)}
              </RequirementBadge>
              <RequirementBadge tone="warm">{submittedMatchesLabel}</RequirementBadge>
            </div>
          </div>

          <button type="button" onClick={onClose} className="modal-close-button" aria-label="Close requirement details">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      </div>

      <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(0,0.92fr)]">
        <section className="space-y-5">
          <RequirementModalPanel>
            <RequirementModalLabel>Requirement Brief</RequirementModalLabel>
            <p className="mt-4 text-[15px] leading-7 text-[#697080]">{requirement.description || "No description provided for this requirement."}</p>
          </RequirementModalPanel>

          <RequirementModalPanel>
            <RequirementModalLabel>Search Criteria</RequirementModalLabel>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {criteriaItems.map((item) => (
                <RequirementDetailItem key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </RequirementModalPanel>

          {requirement.notes ? (
            <RequirementModalPanel>
              <RequirementModalLabel>Internal Notes</RequirementModalLabel>
              <p className="mt-4 text-[15px] leading-7 text-[#697080]">{requirement.notes}</p>
            </RequirementModalPanel>
          ) : null}
        </section>

        <section className="space-y-5">
          <RequirementModalPanel>
            <RequirementModalLabel>Requirement Snapshot</RequirementModalLabel>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-1">
              {overviewItems.map((item) => (
                <RequirementDetailItem key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </RequirementModalPanel>

          <RequirementModalPanel>
            <RequirementModalLabel>Activity Metadata</RequirementModalLabel>
            <div className="mt-4 grid gap-3">
              {activityItems.map((item) => (
                <RequirementDetailItem key={item.label} label={item.label} value={item.value} />
              ))}
              {requirement.deleted_at ? <RequirementDetailItem label="Closed" value={formatDateTime(requirement.deleted_at)} /> : null}
            </div>
          </RequirementModalPanel>
        </section>
      </div>
    </RequirementModalShell>
  );
}

function RequirementActionsMenu({
  requirement,
  actionKey,
  isOpen,
  onOpenChange,
  onRequestPriority,
  onView,
  onToggleRequirement,
  onDeleteRequirement,
}: {
  requirement: Requirement;
  actionKey: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestPriority: () => void;
  onView: () => void;
  onToggleRequirement: (nextAction: "activate" | "deactivate") => void;
  onDeleteRequirement: () => void;
}) {
  const requirementStatus = getResolvedRequirementStatus(requirement);
  const brokerCanReactivate = requirement.is_active || requirement.deactivated_by === "broker";
  const isClosedRequirement = requirementStatus === "closed";
  const toggleAction = requirement.is_active ? "deactivate" : "activate";
  const toggleActionKey = `requirement:${requirement.id}:${toggleAction}`;
  const deleteActionKey = `requirement:${requirement.id}:delete`;
  const { triggerRef, contentRef, position } = useAnchoredLayer<HTMLButtonElement>({
    open: isOpen,
    onClose: () => onOpenChange(false),
    width: 220,
  });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!isOpen) {
            onRequestPriority();
          }

          onOpenChange(!isOpen);
        }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e8ddd0] bg-white text-[#565d6c] shadow-[0_12px_24px_rgba(33,39,56,0.08)] transition hover:-translate-y-0.5 hover:border-[#dbc8b0] hover:bg-[#fbf8f3] xl:h-[50px] xl:w-[50px]"
        aria-label="Open requirement actions"
        aria-expanded={isOpen}
        aria-controls={`requirement-actions-menu-${requirement.id}`}
      >
        <DotsVerticalIcon className="h-5 w-5" />
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={contentRef}
              id={`requirement-actions-menu-${requirement.id}`}
              className="overflow-y-auto rounded-[20px] border border-[#705744] bg-[linear-gradient(180deg,#312625_0%,#241d22_100%)] p-2 shadow-[0_30px_46px_rgba(0,0,0,0.34)]"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight,
                zIndex: LAYER_ORDER.actionMenu,
              }}
            >
              <RequirementMenuAction
                icon={<EyeIcon className="h-4 w-4" />}
                label="View"
                onClick={() => {
                  onOpenChange(false);
                  onView();
                }}
              />

              {!isClosedRequirement ? (
                <Link
                  href={`/post-requirement?id=${requirement.id}`}
                  onClick={() => onOpenChange(false)}
                  className="flex w-full items-center gap-3 rounded-[14px] px-3.5 py-3 text-left text-[14px] font-medium text-[#f7efe5] transition hover:bg-white/8"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6">
                    <EditIcon className="h-4 w-4" />
                  </span>
                  <span>Edit</span>
                </Link>
              ) : (
                <RequirementMenuAction icon={<EditIcon className="h-4 w-4" />} label="Edit" disabled />
              )}

              <RequirementMenuAction
                icon={<PowerIcon className="h-4 w-4" />}
                label={actionKey === toggleActionKey ? "Saving..." : requirement.is_active ? "Deactivate" : "Activate"}
                disabled={actionKey === toggleActionKey || isClosedRequirement || !brokerCanReactivate}
                onClick={() => {
                  onOpenChange(false);
                  onToggleRequirement(toggleAction);
                }}
              />

              <RequirementMenuAction
                icon={<TrashIcon className="h-4 w-4" />}
                label={actionKey === deleteActionKey ? "Deleting..." : "Delete"}
                danger
                disabled={actionKey === deleteActionKey || isClosedRequirement}
                onClick={() => {
                  onOpenChange(false);
                  onDeleteRequirement();
                }}
              />
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function RequirementBoardCard({
  requirement,
  actionKey,
  isActionMenuOpen,
  onActionMenuOpenChange,
  onActionMenuPriority,
  onOpenMatches,
  onViewRequirement,
  onToggleRequirement,
  onDeleteRequirement,
}: {
  requirement: Requirement;
  actionKey: string | null;
  isActionMenuOpen: boolean;
  onActionMenuOpenChange: (open: boolean) => void;
  onActionMenuPriority: () => void;
  onOpenMatches: () => void;
  onViewRequirement: () => void;
  onToggleRequirement: (nextAction: "activate" | "deactivate") => void;
  onDeleteRequirement: () => void;
}) {
  const requirementStatus = getResolvedRequirementStatus(requirement);
  const requirementTitle = getRequirementLabel(requirement);
  const summaryLine = getRequirementSummaryLine(requirement);
  const stateMessage = getRequirementStateMessage(requirement, requirementStatus);
  const activityTimestamp = getRequirementActivityTimestamp(requirement, requirementStatus);
  const submittedMatchCount = countRequirementSubmittedMatches(requirement);
  const submissionsLabel = `${submittedMatchCount} response${submittedMatchCount === 1 ? "" : "s"}`;
  const statusTone = requirementStatus === "active" ? "success" : requirementStatus === "closed" ? "danger" : "neutral";
  const urgencyTone = requirement.urgency === "high" || requirement.urgency === "hot" ? "warm" : "neutral";
  const footerMetadata = [
    { label: "Budget", value: getRequirementBudgetLine(requirement) },
    { label: "Deal", value: formatDealType(requirement.deal_type) },
    { label: "Posted", value: formatDate(requirement.created_at) },
  ];

  return (
    <article className="w-full min-w-0 rounded-[12px] border border-[#eadfd1] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,246,241,0.98)_100%)] px-3 py-3 text-[#1e2432] shadow-[0_18px_36px_rgba(25,29,42,0.1)] sm:px-4 sm:py-4 lg:px-6 lg:py-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] xl:items-center xl:gap-5">
        <div className="flex min-w-0 gap-3 xl:gap-4">
          <BrokerAvatar
            alt={`${requirementTitle} requirement`}
            className="h-12 w-12 shrink-0 rounded-[16px] border border-[#e8ddd0] bg-white shadow-[0_12px_24px_rgba(36,41,58,0.08)] sm:h-14 sm:w-14 xl:h-[68px] xl:w-[68px] xl:rounded-[22px]"
            imageClassName="rounded-[16px] xl:rounded-[22px]"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="line-clamp-2 min-w-0 basis-full break-words text-[18px] font-semibold tracking-[-0.03em] text-[#1f2635] sm:basis-auto sm:text-[20px] xl:block xl:truncate xl:text-[25px]">{requirementTitle}</h3>
              <RequirementBadge tone={urgencyTone}>{formatRequirementUrgency(requirement.urgency)}</RequirementBadge>
              <RequirementBadge tone={statusTone}>{getStatusBadgeLabel(requirementStatus)}</RequirementBadge>
              {!requirement.is_active && requirement.deactivated_by === "admin" ? <RequirementBadge tone="danger">Admin paused</RequirementBadge> : null}
            </div>

            <p className="mt-1 line-clamp-2 break-words text-[14px] font-medium leading-5 text-[#5d6473] xl:mt-2 xl:block xl:truncate xl:text-[16px]">{summaryLine}</p>
          </div>
        </div>
        <div className="col-span-2 min-w-0 xl:col-span-1 xl:pl-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <RequirementStatPill icon={<SparkIcon className="h-4 w-4" />}>{submittedMatchCount > 0 ? submissionsLabel : "No responses yet"}</RequirementStatPill>
            <div className="hidden h-8 w-px bg-[#e6ddd1] xl:block" aria-hidden="true" />
            <p className="min-w-0 break-words text-sm font-medium text-[#555c6a] sm:text-[15px]">{stateMessage}</p>
            <div className="hidden h-8 w-px bg-[#e6ddd1] xl:block" aria-hidden="true" />
            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-[#7e8695] sm:gap-2 sm:text-[14px]">
              <ClockIcon className="h-4 w-4 text-[#a38d69]" />
              <span className="min-w-0 truncate">{activityTimestamp}</span>
            </span>
          </div>
        </div>

        <div className="col-start-2 row-start-1 flex items-center justify-self-end xl:col-start-auto xl:row-start-auto xl:flex-wrap xl:gap-3 xl:justify-self-auto xl:justify-end">
          <RequirementActionsMenu
            requirement={requirement}
            actionKey={actionKey}
            isOpen={isActionMenuOpen}
            onOpenChange={onActionMenuOpenChange}
            onRequestPriority={onActionMenuPriority}
            onView={onViewRequirement}
            onToggleRequirement={onToggleRequirement}
            onDeleteRequirement={onDeleteRequirement}
          />
        </div>
      </div>

      <div className="mt-3 flex min-w-0 flex-col gap-2 border-t border-[#ece2d6] pt-3 lg:flex-row lg:items-center lg:justify-between xl:gap-4">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 xl:gap-x-4 xl:gap-y-3">
          {footerMetadata.map((item, index) => (
            <div key={item.label} className="flex min-w-0 flex-1 basis-[calc(50%-0.375rem)] items-center gap-3 sm:basis-auto xl:flex-none xl:gap-4">
              {index > 0 ? <span className="hidden h-10 w-px bg-[#e5ddd2] md:block" aria-hidden="true" /> : null}
              <RequirementMetadataItem label={item.label} value={item.value} />
            </div>
          ))}
        </div>

        <div className="flex w-full items-center justify-end gap-2 text-xs text-[#7b8291] sm:text-sm xl:w-auto xl:shrink-0 xl:gap-4 xl:text-[14px]">
          <button
            type="button"
            onClick={onOpenMatches}
            className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#ead5b4] bg-[linear-gradient(180deg,#fff8ef_0%,#f2dfbc_100%)] px-3 text-sm font-semibold text-[#57381a] shadow-[0_14px_24px_rgba(185,140,66,0.18)] hover:brightness-[1.02] sm:min-h-[44px] sm:px-4 sm:text-base xl:min-h-[48px] xl:whitespace-nowrap xl:text-[18px]"
          >
            View Matches
          </button>
        </div>
      </div>
    </article>
  );
}

export function BrokerRequirementsWorkspace({
  chatGroups,
  requirements,
  onRefresh,
}: {
  chatGroups: BrokerChatNavigationSummary[];
  requirements: Requirement[];
  onRefresh: () => Promise<unknown>;
}) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequirementStatusFilterId>("all");
  const [sortBy, setSortBy] = useState<RequirementSortId>("newest");
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [pendingStatusAction, setPendingStatusAction] = useState<PendingRequirementStatusAction | null>(null);
  const [pendingDeleteRequirement, setPendingDeleteRequirement] = useState<Requirement | null>(null);
  const [matchesRequirement, setMatchesRequirement] = useState<Requirement | null>(null);
  const [detailsRequirement, setDetailsRequirement] = useState<Requirement | null>(null);
  const [submittedMatches, setSubmittedMatches] = useState<RequirementMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<RequirementMatch | null>(null);
  const [openToolbarMenuId, setOpenToolbarMenuId] = useState<"filter" | "sort" | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const statusActionPendingRef = useRef(false);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredRequirements = useMemo(() => {
    return requirements
      .filter((requirement) => {
        const requirementStatus = getResolvedRequirementStatus(requirement);
        const matchesSearch = normalizedSearchQuery ? getRequirementSearchText(requirement).includes(normalizedSearchQuery) : true;
        const matchesStatus = statusFilter === "all" ? true : requirementStatus === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        if (sortBy === "oldest") {
          return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
        }

        if (sortBy === "budget_high") {
          const rightBudget = right.budget_max ?? right.budget_min ?? 0;
          const leftBudget = left.budget_max ?? left.budget_min ?? 0;
          if (rightBudget !== leftBudget) {
            return rightBudget - leftBudget;
          }
        }

        if (sortBy === "submissions_high") {
          const rightSubmissions = countRequirementSubmittedMatches(right);
          const leftSubmissions = countRequirementSubmittedMatches(left);
          if (rightSubmissions !== leftSubmissions) {
            return rightSubmissions - leftSubmissions;
          }
        }

        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      });
  }, [normalizedSearchQuery, requirements, sortBy, statusFilter]);

  const activeRequirementCount = useMemo(
    () => requirements.filter((requirement) => getResolvedRequirementStatus(requirement) === "active").length,
    [requirements]
  );

  const closedRequirementCount = useMemo(
    () => requirements.filter((requirement) => getResolvedRequirementStatus(requirement) === "closed").length,
    [requirements]
  );

  const resolvedMatchesRequirement = matchesRequirement ? requirements.find((requirement) => requirement.id === matchesRequirement.id) || matchesRequirement : null;
  const resolvedDetailsRequirement = detailsRequirement ? requirements.find((requirement) => requirement.id === detailsRequirement.id) || detailsRequirement : null;
  const resolvedPendingStatusAction = pendingStatusAction
    ? {
        action: pendingStatusAction.action,
        requirement: requirements.find((requirement) => requirement.id === pendingStatusAction.requirement.id) || pendingStatusAction.requirement,
      }
    : null;
  const {
    paginatedItems: paginatedRequirements,
    pagination,
    pageSizeOptions,
    setPage,
    setPageSize,
  } = useClientPagination(filteredRequirements, {
    resetKey: `${normalizedSearchQuery}|${statusFilter}|${sortBy}|${requirements.length}`,
  });

  const refreshWorkspace = async () => {
    invalidateRequirementCaches();
    await onRefresh();
  };

  const applyLocalSubmissionStatus = (matchId: string, status: RequirementMatch["status"]) => {
    setSubmittedMatches((current) => current.map((match) => (match.id === matchId ? { ...match, status } : match)));
    setSelectedSubmission((current) => (current?.id === matchId ? { ...current, status } : current));
  };

  const updateSubmissionStatus = async (
    submission: RequirementMatch,
    status: RequirementMatch["status"],
    options: {
      keepRefresh?: boolean;
    } = {}
  ) => {
    applyLocalSubmissionStatus(submission.id, status);
    await apiFetch(`/api/requirement-matches/${submission.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
      }),
    });

    if (options.keepRefresh !== false) {
      await refreshWorkspace();
    }
  };

  const toggleRequirement = async (requirement: Requirement, nextAction: RequirementStatusAction) => {
    if (statusActionPendingRef.current) {
      return;
    }

    statusActionPendingRef.current = true;
    const key = `requirement:${requirement.id}:${nextAction}`;
    setActionKey(key);

    try {
      await apiFetch(`/api/requirements/${requirement.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: nextAction }),
      });
      await refreshWorkspace();
      setPendingStatusAction(null);
      enqueueSnackbar(nextAction === "deactivate" ? "Requirement deactivated." : "Requirement activated.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to update requirement.", { variant: "error" });
    } finally {
      statusActionPendingRef.current = false;
      setActionKey(null);
    }
  };

  const deleteRequirement = async () => {
    if (!pendingDeleteRequirement) {
      return;
    }

    const key = `requirement:${pendingDeleteRequirement.id}:delete`;
    setActionKey(key);

    try {
      await apiFetch(`/api/requirements/${pendingDeleteRequirement.id}`, {
        method: "DELETE",
      });
      setPendingDeleteRequirement(null);
      setMatchesRequirement(null);
      setDetailsRequirement(null);
      setSubmittedMatches([]);
      await refreshWorkspace();
      enqueueSnackbar("Requirement deleted.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to delete requirement.", { variant: "error" });
    } finally {
      setActionKey(null);
    }
  };

  const openRequirementMatches = async (requirement: Requirement) => {
    setOpenActionMenuId(null);
    setMatchesRequirement(requirement);
    setSubmittedMatches([]);
    setMatchesLoading(true);

    try {
      const payload = await apiFetch<RequirementMatchesResponse>(`/api/requirements/${requirement.id}/matches`);
      setSubmittedMatches(payload.submittedMatches || payload.matches || []);
    } catch (error) {
      setMatchesRequirement(null);
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to load requirement matches.", { variant: "error" });
    } finally {
      setMatchesLoading(false);
    }
  };

  const openSubmission = async (submission: RequirementMatch) => {
    const nextSubmission = submission.status === "new" ? { ...submission, status: "read" as const } : submission;
    setSelectedSubmission(nextSubmission);

    if (submission.status === "new") {
      try {
        setActionKey(`submission:${submission.id}:read`);
        await updateSubmissionStatus(submission, "read");
      } catch (error) {
        enqueueSnackbar(error instanceof Error ? error.message : "Failed to update submission.", { variant: "error" });
      } finally {
        setActionKey(null);
      }
    }
  };

  const markSubmissionRead = async (submission: RequirementMatch) => {
    if (submission.status !== "new") {
      return;
    }

    const key = `submission:${submission.id}:read`;
    setActionKey(key);

    try {
      await updateSubmissionStatus(submission, "read");
      enqueueSnackbar("Submission marked as read.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to update submission.", { variant: "error" });
    } finally {
      setActionKey(null);
    }
  };

  const chatFromSubmission = (submission: RequirementMatch) => {
    if (!submission.listing_id) {
      enqueueSnackbar("Attached listing details are unavailable for this submission.", { variant: "error" });
      return;
    }

    const key = `submission:${submission.id}:chat`;
    const chatContext = {
      requirementId: submission.requirement_id,
      matchId: submission.id,
    };
    setActionKey(key);

    if (submission.status !== "contacted") {
      applyLocalSubmissionStatus(submission.id, "contacted");

      void apiFetch(`/api/requirement-matches/${submission.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "contacted",
        }),
      })
        .then(() => {
          invalidateRequirementCaches();
        })
        .catch((error) => {
          applyLocalSubmissionStatus(submission.id, submission.status);
          enqueueSnackbar(error instanceof Error ? error.message : "Failed to update submission status before chat.", { variant: "error" });
        });
    }

    const href = getImmediateBrokerChatHref(submission.listing_id, chatContext, chatGroups);

    void warmBrokerChatPayload(submission.listing_id, {
      chatGroups,
      context: chatContext,
      prefetchRoute: (nextHref) => router.prefetch(nextHref),
    });

    router.push(href, { scroll: false });
  };

  return (
    <section className="mt-6">
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-0 rounded-[12px] border border-[#5c4338] shadow-[0_32px_72px_rgba(17,14,15,0.3)]"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(28, 17, 15, 0.34) 0%, rgba(30, 22, 27, 0.56) 100%), url('/assets/kpi_cards.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top_left,rgba(255,210,153,0.12)_0%,transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_22%,rgba(255,255,255,0)_38%)]" aria-hidden="true" />

        <div className="relative px-4 py-5 sm:px-5 sm:py-6 lg:px-6 lg:py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-[460px]">
              <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#fff6ea] sm:text-[31px]">My Requirements</h2>
              
              <p className="mt-3 text-[13px] font-medium tracking-[0.01em] text-[#d9c8af]">
                {filteredRequirements.length} visible | {activeRequirementCount} active | {closedRequirementCount} closed
              </p>
            </div>

            <div className="w-full xl:max-w-[860px]">
              <div className="grid gap-2 rounded-[24px] bg-[linear-gradient(180deg,rgba(31,24,22,0.72)_0%,rgba(27,20,23,0.6)_100%)] p-2.5 shadow-[0_20px_36px_rgba(0,0,0,0.24)] backdrop-blur-[6px] md:grid-cols-[minmax(0,1.5fr)_225px_225px]">
                <ToolbarFieldShell icon={<SearchIcon className="h-4 w-4" />}>
                  <div className="w-full">
                    <div className="relative w-full">
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        onFocus={() => {
                          setOpenToolbarMenuId(null);
                          setOpenActionMenuId(null);
                        }}
                        placeholder="Search titles, descriptions, areas"
                        className="min-h-[54px] w-full rounded-[16px] bg-[rgba(255,255,255,0.06)] pl-2 text-[15px] font-medium text-[#fbf5eb] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] outline-none transition placeholder:text-[#cdbfa9] focus:bg-[rgba(255,255,255,0.1)] focus:shadow-[0_0_0_3px_rgba(217,188,142,0.16)]"
                        aria-label="Search requirements"
                      />
                    </div>
                  </div>
                </ToolbarFieldShell>

                <ToolbarSelectMenu
                  menuId="filter"
                  label="Filter"
                  icon={<FilterIcon className="h-4 w-4" />}
                  value={statusFilter}
                  options={STATUS_FILTER_OPTIONS}
                  isOpen={openToolbarMenuId === "filter"}
                  onOpenChange={(open) => setOpenToolbarMenuId(open ? "filter" : null)}
                  onRequestPriority={() => setOpenActionMenuId(null)}
                  onChange={(nextValue) => setStatusFilter(nextValue as RequirementStatusFilterId)}
                />

                <ToolbarSelectMenu
                  menuId="sort"
                  label="Sort"
                  icon={<SortIcon className="h-4 w-4" />}
                  value={sortBy}
                  options={SORT_OPTIONS}
                  isOpen={openToolbarMenuId === "sort"}
                  onOpenChange={(open) => setOpenToolbarMenuId(open ? "sort" : null)}
                  onRequestPriority={() => setOpenActionMenuId(null)}
                  onChange={(nextValue) => setSortBy(nextValue as RequirementSortId)}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {filteredRequirements.length ? (
              <>
                {paginatedRequirements.map((requirement) => (
                  <RequirementBoardCard
                    key={requirement.id}
                    requirement={requirement}
                    actionKey={actionKey}
                    isActionMenuOpen={openActionMenuId === requirement.id}
                    onActionMenuOpenChange={(open) => setOpenActionMenuId(open ? requirement.id : null)}
                    onActionMenuPriority={() => setOpenToolbarMenuId(null)}
                    onOpenMatches={() => void openRequirementMatches(requirement)}
                    onViewRequirement={() => {
                      setOpenActionMenuId(null);
                      setDetailsRequirement(requirement);
                    }}
                    onToggleRequirement={(nextAction) => setPendingStatusAction({ action: nextAction, requirement })}
                    onDeleteRequirement={() => {
                      setOpenActionMenuId(null);
                      setPendingDeleteRequirement(requirement);
                    }}
                  />
                ))}

                <ListPaginationControls
                  pagination={pagination}
                  pageSizeOptions={pageSizeOptions}
                  itemLabel="requirements"
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            ) : (
              <div className="bg-transparent text-[#f3e7d6]">
                <EmptyState
                  title={requirements.length ? "No requirements match this view" : "No requirements posted yet"}
                  description={
                    requirements.length
                      ? "Try adjusting the search, filter, or sort controls to bring more requirements into view."
                      : "Create your first buyer requirement to start receiving broker submissions."
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {pendingDeleteRequirement ? (
        <RequirementDeleteDialog
          requirementTitle={getRequirementLabel(pendingDeleteRequirement)}
          loading={actionKey === `requirement:${pendingDeleteRequirement.id}:delete`}
          onClose={() => setPendingDeleteRequirement(null)}
          onConfirm={() => void deleteRequirement()}
        />
      ) : null}

      {resolvedPendingStatusAction ? (
        <RequirementStatusConfirmationDialog
          action={resolvedPendingStatusAction.action}
          loading={actionKey === `requirement:${resolvedPendingStatusAction.requirement.id}:${resolvedPendingStatusAction.action}`}
          onClose={() => setPendingStatusAction(null)}
          onConfirm={() => void toggleRequirement(resolvedPendingStatusAction.requirement, resolvedPendingStatusAction.action)}
        />
      ) : null}

      {resolvedDetailsRequirement ? <RequirementDetailsModal requirement={resolvedDetailsRequirement} onClose={() => setDetailsRequirement(null)} /> : null}

      {resolvedMatchesRequirement ? (
        <RequirementMatchesBrokerModal
          requirement={resolvedMatchesRequirement}
          submittedMatches={submittedMatches}
          loading={matchesLoading}
          actionMatchId={actionKey?.startsWith("submission:") ? actionKey.split(":")[1] : null}
          onClose={() => {
            setMatchesRequirement(null);
            setSubmittedMatches([]);
          }}
          onViewSubmission={(submission) => void openSubmission(submission)}
          onChatSubmission={(submission) => void chatFromSubmission(submission)}
          onMarkSubmissionRead={(submission) => void markSubmissionRead(submission)}
        />
      ) : null}

      {selectedSubmission ? (
        <MatchSubmissionDetailModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onChat={(submission) => void chatFromSubmission(submission)}
        />
      ) : null}
    </section>
  );
}
