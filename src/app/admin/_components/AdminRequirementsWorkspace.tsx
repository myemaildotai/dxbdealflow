"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSnackbar } from "notistack";
import { type AdminDashboardDateFilterValue, matchesAdminDashboardDateRange } from "@/app/admin/_components/AdminDashboardDateFilter";
import {
  ADMIN_TABLE_ACTION_BUTTON_BASE,
  ADMIN_TABLE_ACTION_BUTTON_PRIMARY,
  ADMIN_TABLE_BODY_TEXT_CLASS,
  ADMIN_TABLE_HEADER_CELL_CLASS,
  ADMIN_TABLE_HEADER_CLASS,
  ADMIN_TABLE_ICON_BUTTON,
  ADMIN_TABLE_META_TEXT_CLASS,
  ADMIN_TABLE_MOBILE_LABEL_CLASS,
  ADMIN_TABLE_ROW_ALERT_CLASS,
  ADMIN_TABLE_ROW_CLASS,
  ADMIN_TABLE_ROW_GROUP_CLASS,
  ADMIN_TABLE_SURFACE_CLASS,
  ADMIN_TABLE_TITLE_CLASS,
  ADMIN_TABLE_VALUE_CLASS,
  AdminStatusBadge,
  AdminSubTabPill,
} from "@/app/admin/_components/AdminPanelUi";
import { ListPaginationControls } from "@/components/ListPaginationControls";
import { RequirementDeleteDialog } from "@/components/RequirementDeleteDialog";
import { RequirementMatchesAdminModal } from "@/components/RequirementMatchesAdminModal";
import { SearchField } from "@/components/SearchField";
import { SkeletonBlock } from "@/components/SkeletonBlock";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useClientPagination } from "@/hooks/useClientPagination";
import { invalidateRequirementCaches } from "@/lib/client-cache";
import { apiFetch } from "@/lib/deal-api";
import type { AdminRequirementListCounts, Requirement, RequirementMatch } from "@/lib/deal-types";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDealType,
  formatPropertyType,
  formatRequirementUrgency,
  getFullName,
  statusClasses,
} from "@/lib/deal-utils";
import { formatRequirementBedrooms, getRequirementStatus } from "@/lib/requirements";
import { PAGE_SIZE_OPTIONS, type PaginationMeta } from "@/lib/pagination";
import { buildSearchText, normalizeSearchQuery } from "@/lib/search";

type RequirementMatchesResponse = {
  matches: RequirementMatch[];
};

type RequirementFilterId = "all" | "active" | "inactive" | "deleted";
type RequirementStatusAction = "activate" | "deactivate";
type PendingRequirementStatusAction = {
  action: RequirementStatusAction;
  requirement: Requirement;
};
type RequirementQueryState = {
  filter: RequirementFilterId;
  search: string;
};

const ACTION_MENU_Z_INDEX = 120;
const REQUIREMENT_TABLE_GRID_CLASS_NAME = "xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1.05fr)_minmax(0,0.95fr)_minmax(0,1fr)_minmax(0,14rem)]";

function AdminRequirementsSkeletonRows({ rows }: { rows: number }) {
  return (
    <div className={ADMIN_TABLE_ROW_GROUP_CLASS} aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className={ADMIN_TABLE_ROW_CLASS}>
          <div className={cn("grid grid-cols-1 items-start gap-2 sm:gap-3 xl:grid xl:items-center xl:gap-4", REQUIREMENT_TABLE_GRID_CLASS_NAME)}>
            {Array.from({ length: 5 }).map((__, columnIndex) => (
              <div key={columnIndex} className={cn("min-w-0", columnIndex > 0 && "hidden xl:block")}>
                <SkeletonBlock className="h-4 w-3/4 rounded-xl bg-[#e2e8f0]" />
                <SkeletonBlock className="mt-2 h-3 w-1/2 rounded-xl bg-[#e2e8f0]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function getRequirementLabel(requirement: Pick<Requirement, "title" | "area">) {
  return requirement.title || `Buyer brief in ${requirement.area || "preferred areas"}`;
}

function getRequirementResolvedStatus(requirement: Requirement) {
  return requirement.status || getRequirementStatus(requirement);
}

function getRequirementStatusLabel(requirement: Requirement) {
  if (requirement.deleted_at) {
    return "Deleted";
  }

  return requirement.is_active ? "Active" : "Inactive";
}

function getRequirementBudgetLine(requirement: Requirement) {
  if (requirement.budget_min !== null && requirement.budget_max !== null) {
    return `${formatCurrency(requirement.budget_min)} - ${formatCurrency(requirement.budget_max)}`;
  }

  if (requirement.budget_max !== null) {
    return `Up to ${formatCurrency(requirement.budget_max)}`;
  }

  if (requirement.budget_min !== null) {
    return `From ${formatCurrency(requirement.budget_min)}`;
  }

  return "Budget flexible";
}

function getRequirementSearchText(requirement: Requirement) {
  const brokerName = requirement.owner ? getFullName(requirement.owner.first_name, requirement.owner.last_name) : null;
  const bedroomsLabel = formatRequirementBedrooms(requirement.bedrooms);

  return buildSearchText([
    requirement.title,
    requirement.description,
    requirement.area,
    formatPropertyType(requirement.property_type),
    formatDealType(requirement.deal_type),
    bedroomsLabel,
    formatRequirementUrgency(requirement.urgency),
    getRequirementBudgetLine(requirement),
    getRequirementStatusLabel(requirement),
    requirement.status,
    brokerName,
    requirement.owner?.email,
  ]);
}

function AdminRequirementsBlankState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[12px] border border-[#e5e9f2] bg-[linear-gradient(180deg,#fcfcff_0%,#f7f9fd_100%)] px-5 py-10 text-center shadow-[0_10px_22px_rgba(34,40,66,0.04)]">
      <p className="text-[20px] font-semibold tracking-[-0.03em] text-[#1f2940]">{title}</p>
      <p className="mx-auto mt-2 max-w-[34rem] text-[15px] leading-7 text-[#657186]">{description}</p>
    </div>
  );
}

function useModalBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [active]);
}

function AdminWorkspaceModalShell({
  children,
  onClose,
  maxWidthClassName = "max-w-[64rem]",
}: {
  children: ReactNode;
  onClose: () => void;
  maxWidthClassName?: string;
}) {
  useModalBodyScrollLock(true);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-[rgba(15,23,42,0.54)] p-2 backdrop-blur-[7px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          "w-full max-w-full overflow-hidden rounded-[14px] border border-[#dfe6f2] bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fc_100%)] shadow-[0_32px_72px_rgba(18,29,53,0.22)] sm:rounded-[16px]",
          maxWidthClassName
        )}
      >
        <div className="max-h-[calc(100dvh-1rem)] overflow-x-hidden overflow-y-auto sm:max-h-[calc(100vh-2rem)]">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function RequirementDetailField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[12px] border border-[#e4e9f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] px-3 py-2.5 shadow-[0_10px_24px_rgba(35,41,70,0.04)] sm:px-4 sm:py-3">
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8d96a9]">{label}</p>
      <div className="mt-2 break-words text-sm font-semibold text-[#26324c] sm:text-[15px]">{value}</div>
    </div>
  );
}

function AdminRequirementStatusConfirmationDialog({
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
    <AdminWorkspaceModalShell onClose={closeIfIdle} maxWidthClassName="max-w-lg">
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
    </AdminWorkspaceModalShell>
  );
}

function AdminRequirementDetailsModal({
  requirement,
  onClose,
}: {
  requirement: Requirement;
  onClose: () => void;
}) {
  const requirementStatus = getRequirementResolvedStatus(requirement);
  const bedroomsLabel = formatRequirementBedrooms(requirement.bedrooms);
  const brokerName = requirement.owner ? getFullName(requirement.owner.first_name, requirement.owner.last_name) : "Broker unavailable";
  const submittedMatchCount = requirement.submitted_match_count || 0;

  return (
    <AdminWorkspaceModalShell onClose={onClose} maxWidthClassName="lg:max-w-[64rem]">
      <div className="border-b border-[#e5ebf4] bg-[linear-gradient(180deg,#f9fbff_0%,#edf3fb_100%)] px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7d8dab]">
              Requirement Details
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold tracking-[-0.05em] text-[#1f2940] sm:text-2xl xl:text-[30px]">
                {getRequirementLabel(requirement)}
              </h3>
              <AdminStatusBadge
                status={requirement.deleted_at ? "deleted" : requirementStatus}
                label={getRequirementStatusLabel(requirement)}
              />
              {requirement.deactivated_by === "admin" && !requirement.deleted_at ? (
                <AdminStatusBadge status="inactive" label="Admin Paused" />
              ) : null}
            </div>

            <p className="mt-2 max-w-[44rem] text-[14px] leading-6 text-[#657186] sm:text-[15px] sm:leading-7">
              {formatPropertyType(requirement.property_type)} in{" "}
              {requirement.area || "flexible areas"} for{" "}
              {getRequirementBudgetLine(requirement)}{" "}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#dbe2ee] bg-white text-[24px] text-[#4e5d78] shadow-[0_10px_24px_rgba(35,41,70,0.08)] transition hover:border-[#cad3e4] hover:bg-[#f8faff]"
            aria-label="Close requirement details"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      </div>

     <div className="space-y-3 px-3 py-3 sm:px-6 sm:py-5 xl:space-y-5">

        {/* 1. Owner (2 col) */}
        <div className="rounded-[12px] border border-[#e1e7f0] bg-white px-3 py-3 shadow-[0_14px_30px_rgba(30,35,49,0.06)] sm:px-5 sm:py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d96a9]">Owner</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-3 xl:mt-4">
            <RequirementDetailField label="Broker" value={brokerName} />
            <RequirementDetailField label="Email" value={requirement.owner?.email || "Email unavailable"} />
          </div>
        </div>

        {/* 2. Search Criteria (2 col) */}
        <div className="rounded-[12px] border border-[#e1e7f0] bg-white px-3 py-3 shadow-[0_14px_30px_rgba(30,35,49,0.06)] sm:px-5 sm:py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d96a9]">Search Criteria</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-3 xl:mt-4">
            <RequirementDetailField label="Property Type" value={formatPropertyType(requirement.property_type)} />
            <RequirementDetailField label="Deal Type" value={formatDealType(requirement.deal_type)} />
            <RequirementDetailField label="Bedrooms" value={bedroomsLabel || "Open"} />
            <RequirementDetailField label="Budget" value={getRequirementBudgetLine(requirement)} />
            <RequirementDetailField label="Area" value={requirement.area || "Flexible area"} />
            <RequirementDetailField label="Timeline" value={requirement.timeline || "Not specified"} />
          </div>
        </div>

        {/* 3. Requirement Brief (1 col) */}
        <div className="rounded-[12px] border border-[#e1e7f0] bg-white px-3 py-3 shadow-[0_14px_30px_rgba(30,35,49,0.06)] sm:px-5 sm:py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d96a9]">Requirement Brief</p>
          <p className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-6 text-[#5f6b80] sm:text-[15px] sm:leading-7 xl:mt-4">
            {requirement.description || "No description provided for this requirement."}
          </p>
        </div>

        {/* Optional Notes (still 1 col) */}
        {requirement.notes && (
          <div className="rounded-[12px] border border-[#e1e7f0] bg-white px-3 py-3 shadow-[0_14px_30px_rgba(30,35,49,0.06)] sm:px-5 sm:py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d96a9]">Internal Notes</p>
            <p className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-6 text-[#5f6b80] sm:text-[15px] sm:leading-7 xl:mt-4">{requirement.notes}</p>
          </div>
        )}

        {/* 4. Status & Matches (2 col) */}
        <div className="rounded-[12px] border border-[#e1e7f0] bg-white px-3 py-3 shadow-[0_14px_30px_rgba(30,35,49,0.06)] sm:px-5 sm:py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d96a9]">Status & Matches</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-3 xl:mt-4">
            <RequirementDetailField label="Current State" value={getRequirementStatusLabel(requirement)} />
            <RequirementDetailField label="Urgency" value={formatRequirementUrgency(requirement.urgency)} />
            <RequirementDetailField
              label="Submitted Matches"
              value={`${submittedMatchCount} match${submittedMatchCount === 1 ? "" : "es"}`}
            />
            <RequirementDetailField
              label="Latest Match Activity"
              value={
                requirement.latest_submission_at
                  ? formatDateTime(requirement.latest_submission_at)
                  : "No submitted matches yet"
              }
            />
          </div>
        </div>

        {/* 5. Activity Metadata (2 col) */}
        <div className="rounded-[12px] border border-[#e1e7f0] bg-white px-3 py-3 shadow-[0_14px_30px_rgba(30,35,49,0.06)] sm:px-5 sm:py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d96a9]">Activity Metadata</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-3 xl:mt-4">
            <RequirementDetailField label="Created" value={formatDateTime(requirement.created_at)} />
            <RequirementDetailField label="Updated" value={formatDateTime(requirement.updated_at)} />
            {requirement.deleted_at && (
              <RequirementDetailField label="Deleted" value={formatDateTime(requirement.deleted_at)} />
            )}
          </div>
        </div>

      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[#e5ebf4] px-4 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5">
        <button
          type="button"
          className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#d9dfeb] bg-white px-5 text-[15px] font-semibold text-[#33415f] shadow-[0_10px_20px_rgba(35,41,70,0.08)] transition hover:border-[#cad3e4] hover:bg-[#f8faff]"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </AdminWorkspaceModalShell>
  );
}

function useAnchoredLayer<TTrigger extends HTMLElement>({
  open,
  onClose,
  width,
  offset = 10,
}: {
  open: boolean;
  onClose: () => void;
  width: number | "trigger";
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
    let nextLeft = rect.right - nextWidth;
    const layerHeight = contentRef.current?.offsetHeight ?? 220;
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
      maxHeight: Math.max(150, shouldOpenAbove ? availableAbove : availableBelow),
    });
  }, [offset, width]);

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

function DotsVerticalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="5" r="1.75" fill="currentColor" />
      <circle cx="12" cy="12" r="1.75" fill="currentColor" />
      <circle cx="12" cy="19" r="1.75" fill="currentColor" />
    </svg>
  );
}

function PowerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 4v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.2 6.8a7 7 0 1 0 9.6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2.5 12c2.3-4.3 5.6-6.5 9.5-6.5s7.2 2.2 9.5 6.5c-2.3 4.3-5.6 6.5-9.5 6.5S4.8 16.3 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4.5 7h15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.5 11.5v5M14.5 11.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6.5 7 7.4 18a2 2 0 0 0 2 1.8h5.2a2 2 0 0 0 2-1.8L17.5 7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 7V5.7A1.7 1.7 0 0 1 10.7 4h2.6A1.7 1.7 0 0 1 15 5.7V7" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function RequirementActionMenuItem({
  icon,
  label,
  className,
  danger = false,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  className?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[16px] px-3.5 py-3 text-left text-[14px] font-medium transition",
        disabled
          ? "cursor-not-allowed opacity-45"
          : danger
            ? "text-[#b64f47] hover:bg-[#fff1ee]"
            : "text-[#33415f] hover:bg-[#f5f8fd]",
        className
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
          danger ? "border-[#f1d3cf] bg-[#fff5f3]" : "border-[#e0e6f0] bg-[#f8fbff]"
        )}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function RequirementActionsMenu({
  requirement,
  actionKey,
  isOpen,
  onOpenChange,
  onViewMatches,
  onView,
  onToggleRequirement,
  onDeleteRequirement,
}: {
  requirement: Requirement;
  actionKey: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onViewMatches: () => void;
  onView: () => void;
  onToggleRequirement: (nextAction: RequirementStatusAction) => void;
  onDeleteRequirement: () => void;
}) {
  const toggleAction = requirement.is_active ? "deactivate" : "activate";
  const toggleActionKey = `${requirement.id}:${toggleAction}`;
  const deleteActionKey = `${requirement.id}:delete`;
  const isDeleted = !!requirement.deleted_at;
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
        onClick={() => onOpenChange(!isOpen)}
        className={ADMIN_TABLE_ICON_BUTTON}
        aria-label={`Open requirement actions for ${getRequirementLabel(requirement)}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={`admin-requirement-actions-${requirement.id}`}
      >
        <DotsVerticalIcon className="h-5 w-5" />
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={contentRef}
              id={`admin-requirement-actions-${requirement.id}`}
              role="menu"
              aria-label={`Actions for ${getRequirementLabel(requirement)}`}
              className="overflow-y-auto rounded-[22px] border border-[#e0e6f0] bg-white p-2 shadow-[0_24px_48px_rgba(18,29,53,0.16)]"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight,
                zIndex: ACTION_MENU_Z_INDEX,
              }}
            >
              <RequirementActionMenuItem
                icon={<EyeIcon className="h-4 w-4" />}
                label="View Matches"
                className="xl:hidden"
                onClick={() => {
                  onOpenChange(false);
                  onViewMatches();
                }}
              />
              <RequirementActionMenuItem
                icon={<EyeIcon className="h-4 w-4" />}
                label="View"
                onClick={() => {
                  onOpenChange(false);
                  onView();
                }}
              />
              <RequirementActionMenuItem
                icon={<PowerIcon className="h-4 w-4" />}
                label={actionKey === toggleActionKey ? "Saving..." : requirement.is_active ? "Deactivate" : "Activate"}
                disabled={actionKey !== null || isDeleted}
                onClick={() => {
                  onOpenChange(false);
                  onToggleRequirement(toggleAction);
                }}
              />
              <RequirementActionMenuItem
                icon={<TrashIcon className="h-4 w-4" />}
                label={actionKey === deleteActionKey ? "Deleting..." : "Delete"}
                danger
                disabled={actionKey !== null || isDeleted}
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

export function AdminRequirementsWorkspace({
  requirements,
  counts,
  dateFilter,
  isLoading = false,
  listingReturnHref = "/admin/requirements",
  pagination: serverPagination,
  stateResetKey,
  onPageChange,
  onPageSizeChange,
  onQueryChange,
  onRefresh,
}: {
  requirements: Requirement[];
  counts?: AdminRequirementListCounts;
  dateFilter: AdminDashboardDateFilterValue;
  isLoading?: boolean;
  listingReturnHref?: string;
  pagination?: PaginationMeta;
  stateResetKey?: string | number | null;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onQueryChange?: (query: RequirementQueryState) => void;
  onRefresh: () => Promise<unknown>;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [filter, setFilter] = useState<RequirementFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [pendingStatusAction, setPendingStatusAction] = useState<PendingRequirementStatusAction | null>(null);
  const [pendingDeleteRequirement, setPendingDeleteRequirement] = useState<Requirement | null>(null);
  const [detailsRequirement, setDetailsRequirement] = useState<Requirement | null>(null);
  const [matchesRequirement, setMatchesRequirement] = useState<Requirement | null>(null);
  const [selectedRequirementMatches, setSelectedRequirementMatches] = useState<RequirementMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const statusActionPendingRef = useRef(false);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);
  const normalizedSearchQuery = normalizeSearchQuery(debouncedSearchQuery);
  const normalizedCountSearchQuery = normalizeSearchQuery(searchQuery);
  const dateScopedRequirements = useMemo(
    () => requirements.filter((requirement) => matchesAdminDashboardDateRange(requirement.created_at, dateFilter)),
    [dateFilter, requirements]
  );
  const requirementCountSourceRequirements = useMemo(
    () =>
      normalizedCountSearchQuery
        ? dateScopedRequirements.filter((requirement) => getRequirementSearchText(requirement).includes(normalizedCountSearchQuery))
        : dateScopedRequirements,
    [dateScopedRequirements, normalizedCountSearchQuery]
  );

  const requirementFilters = useMemo(
    () => [
      { id: "all" as const, label: "All", count: requirementCountSourceRequirements.filter((requirement) => !requirement.deleted_at).length },
      {
        id: "active" as const,
        label: "Active",
        count: requirementCountSourceRequirements.filter((requirement) => !requirement.deleted_at && requirement.is_active).length,
      },
      {
        id: "inactive" as const,
        label: "Inactive",
        count: requirementCountSourceRequirements.filter((requirement) => !requirement.deleted_at && !requirement.is_active).length,
      },
      { id: "deleted" as const, label: "Deleted", count: requirementCountSourceRequirements.filter((requirement) => !!requirement.deleted_at).length },
    ],
    [requirementCountSourceRequirements]
  );

  const filteredRequirements = useMemo(() => {
    const statusFilteredRequirements =
      filter === "deleted"
        ? dateScopedRequirements.filter((requirement) => !!requirement.deleted_at)
        : dateScopedRequirements.filter((requirement) => {
            if (requirement.deleted_at) {
              return false;
            }

            if (filter === "all") {
              return true;
            }

            return filter === "active" ? requirement.is_active : !requirement.is_active;
          });

    if (!normalizedSearchQuery) {
      return statusFilteredRequirements;
    }

    return statusFilteredRequirements.filter((requirement) => getRequirementSearchText(requirement).includes(normalizedSearchQuery));
  }, [dateScopedRequirements, filter, normalizedSearchQuery]);
  const {
    paginatedItems: paginatedRequirements,
    pagination,
    pageSizeOptions,
    setPage,
    setPageSize,
  } = useClientPagination(filteredRequirements, {
      resetKey: `${filter}|${normalizedSearchQuery}|${dateFilter.id}|${dateFilter.range?.startDate || ""}|${dateFilter.range?.endDate || ""}|${requirements.length}`,
    });
  const isServerPaginated = !!serverPagination && !!onPageChange && !!onPageSizeChange;
  const visibleRequirements = isServerPaginated ? requirements : filteredRequirements;
  const renderedRequirements = isServerPaginated ? requirements : paginatedRequirements;
  const resolvedPagination = isServerPaginated ? serverPagination : pagination;
  const resolvedPageSizeOptions = isServerPaginated ? PAGE_SIZE_OPTIONS : pageSizeOptions;
  const resolvedSetPage = isServerPaginated ? onPageChange : setPage;
  const resolvedSetPageSize = isServerPaginated ? onPageSizeChange : setPageSize;

  const resolvedDetailsRequirement = detailsRequirement ? requirements.find((requirement) => requirement.id === detailsRequirement.id) || detailsRequirement : null;
  const resolvedMatchesRequirement = matchesRequirement ? requirements.find((requirement) => requirement.id === matchesRequirement.id) || matchesRequirement : null;
  const resolvedPendingStatusAction = pendingStatusAction
    ? {
        action: pendingStatusAction.action,
        requirement: requirements.find((requirement) => requirement.id === pendingStatusAction.requirement.id) || pendingStatusAction.requirement,
      }
    : null;
  const resolvedPendingDeleteRequirement = pendingDeleteRequirement
    ? requirements.find((requirement) => requirement.id === pendingDeleteRequirement.id) || pendingDeleteRequirement
    : null;

  useEffect(() => {
    setOpenActionMenuId(null);
  }, [filter]);

  useEffect(() => {
    onQueryChange?.({
      filter,
      search: normalizedSearchQuery,
    });
  }, [filter, normalizedSearchQuery, onQueryChange]);

  useEffect(() => {
    setFilter("all");
    setSearchQuery("");
    setActionKey(null);
    setOpenActionMenuId(null);
    setPendingStatusAction(null);
    setPendingDeleteRequirement(null);
    setDetailsRequirement(null);
    setMatchesRequirement(null);
    setSelectedRequirementMatches([]);
    setMatchesLoading(false);
  }, [stateResetKey]);

  const refreshRequirements = useCallback(async () => {
    await onRefresh();
  }, [onRefresh]);

  const toggleRequirement = useCallback(
    async (requirement: Requirement, nextAction: RequirementStatusAction) => {
      if (statusActionPendingRef.current) {
        return;
      }

      statusActionPendingRef.current = true;
      setActionKey(`${requirement.id}:${nextAction}`);

      try {
        await apiFetch(`/api/requirements/${requirement.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: nextAction }),
        });
        invalidateRequirementCaches(requirement.id);
        await refreshRequirements();
        setPendingStatusAction(null);
        enqueueSnackbar(nextAction === "deactivate" ? "Requirement deactivated." : "Requirement reactivated.", { variant: "success" });
      } catch (error) {
        enqueueSnackbar(error instanceof Error ? error.message : "Failed to update requirement.", { variant: "error" });
      } finally {
        statusActionPendingRef.current = false;
        setActionKey(null);
      }
    },
    [enqueueSnackbar, refreshRequirements]
  );

  const deleteRequirement = useCallback(async () => {
    if (!resolvedPendingDeleteRequirement) {
      return;
    }

    setActionKey(`${resolvedPendingDeleteRequirement.id}:delete`);

    try {
      await apiFetch(`/api/requirements/${resolvedPendingDeleteRequirement.id}`, {
        method: "DELETE",
      });
      invalidateRequirementCaches(resolvedPendingDeleteRequirement.id);
      await refreshRequirements();
      setPendingDeleteRequirement(null);
      enqueueSnackbar("Requirement deleted.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to delete requirement.", { variant: "error" });
    } finally {
      setActionKey(null);
    }
  }, [enqueueSnackbar, refreshRequirements, resolvedPendingDeleteRequirement]);

  const viewMatches = useCallback(
    async (requirement: Requirement) => {
      setMatchesRequirement(requirement);
      setSelectedRequirementMatches([]);
      setMatchesLoading(true);

      try {
        const payload = await apiFetch<RequirementMatchesResponse>(`/api/requirements/${requirement.id}/matches`);
        setSelectedRequirementMatches(payload.matches || []);
      } catch (error) {
        setMatchesRequirement(null);
        enqueueSnackbar(error instanceof Error ? error.message : "Failed to load requirement matches.", { variant: "error" });
      } finally {
        setMatchesLoading(false);
      }
    },
    [enqueueSnackbar]
  );

  return (
    <>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 xl:mx-0 xl:px-0">
          <div className="flex min-w-max gap-2 xl:min-w-0 xl:flex-wrap">
            {(counts && isServerPaginated
              ? [
                  { id: "all" as const, label: "All", count: counts.all },
                  { id: "active" as const, label: "Active", count: counts.active },
                  { id: "inactive" as const, label: "Inactive", count: counts.inactive },
                  { id: "deleted" as const, label: "Deleted", count: counts.deleted },
                ]
              : requirementFilters
            ).map((item) => (
              <AdminSubTabPill
                key={item.id}
                active={filter === item.id}
                label={item.label}
                count={item.count}
                variant={item.id}
                onClick={() => setFilter(item.id)}
              />
            ))}
          </div>
        </div>

        <SearchField
          ariaLabel="Search requirements"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search title, broker, area, budget"
          className="w-full xl:max-w-[26rem]"
        />
      </div>

      <div className={cn("mt-6", ADMIN_TABLE_SURFACE_CLASS)}>
        <div className={cn(ADMIN_TABLE_HEADER_CLASS, "border-b border-[#edf1f6] xl:gap-4", REQUIREMENT_TABLE_GRID_CLASS_NAME)}>
          {[
            { label: "Requirement", className: "text-left" },
            { label: "Broker", className: "text-left" },
            { label: "Status", className: "text-left" },
            { label: "Matches", className: "text-left" },
            { label: "Action", className: "text-right" },
          ].map((item) => (
            <p key={item.label} className={cn(ADMIN_TABLE_HEADER_CELL_CLASS, item.className)}>
              {item.label}
            </p>
          ))}
        </div>

        {isLoading ? (
          <AdminRequirementsSkeletonRows rows={resolvedPagination.pageSize} />
        ) : visibleRequirements.length ? (
          <div className={ADMIN_TABLE_ROW_GROUP_CLASS}>
            {renderedRequirements.map((requirement) => {
              const brokerName = requirement.owner ? getFullName(requirement.owner.first_name, requirement.owner.last_name) : "Broker unavailable";
              const requirementTitle = getRequirementLabel(requirement);
              const resolvedStatus = getRequirementResolvedStatus(requirement);
              const statusLabel = getRequirementStatusLabel(requirement);
              const matchesCount = requirement.submitted_match_count || 0;

              return (
                <div key={requirement.id} className={cn(ADMIN_TABLE_ROW_CLASS, "relative w-full overflow-hidden xl:overflow-visible", requirement.deleted_at && ADMIN_TABLE_ROW_ALERT_CLASS)}>
                  <div className={cn("grid grid-cols-1 items-start gap-2 sm:gap-3 xl:grid xl:items-center xl:gap-4", REQUIREMENT_TABLE_GRID_CLASS_NAME)}>
                    <div className="min-w-0">
                      <div className="min-w-0 pr-12 xl:pr-0">
                        <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Requirement</p>
                        <div className="mt-1 flex min-w-0 items-center gap-2 xl:mt-0 xl:flex-wrap">
                          <p className={cn(ADMIN_TABLE_TITLE_CLASS, "truncate")}>{requirementTitle}</p>
                          <span
                            className={cn(
                              statusClasses(requirement.urgency),
                              "min-h-[26px] shrink-0 px-2 py-0.5 text-[10px] leading-none sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-[11px] sm:leading-normal"
                            )}
                          >
                            {formatRequirementUrgency(requirement.urgency)}
                          </span>
                        </div>
                        <p className={cn(ADMIN_TABLE_BODY_TEXT_CLASS, "hidden xl:block xl:line-clamp-none")}>
                          {formatPropertyType(requirement.property_type)} | {requirement.area || "Flexible area"}
                        </p>
                        <p className={cn(ADMIN_TABLE_META_TEXT_CLASS, "hidden xl:block xl:line-clamp-none")}>
                          {formatDealType(requirement.deal_type)} | {getRequirementBudgetLine(requirement)} | Added {formatDate(requirement.created_at)}
                        </p>
                      </div>
                      <div className="mt-2 grid min-w-0 gap-1 xl:hidden">
                        <p className={cn(ADMIN_TABLE_BODY_TEXT_CLASS, "mt-0 line-clamp-2")}>
                          {formatPropertyType(requirement.property_type)} | {requirement.area || "Flexible area"}
                        </p>
                        <p className={cn(ADMIN_TABLE_BODY_TEXT_CLASS, "mt-0")}>
                          {formatDealType(requirement.deal_type)} | {getRequirementBudgetLine(requirement)}
                        </p>
                        <p className={cn(ADMIN_TABLE_META_TEXT_CLASS, "mt-0")}>Added {formatDate(requirement.created_at)}</p>
                      </div>
                      <div className="admin-tablet-badge-strip mt-2 flex w-full min-w-0 items-center justify-between gap-2 xl:hidden">
                        <span className="admin-tablet-badge-primary inline-flex min-h-[26px] min-w-0 flex-1 items-center rounded-full border border-[#e2e7f0] bg-[#f8faff] px-2 py-0.5 text-xs font-semibold text-[#4f5c73]">
                          <span className="min-w-0 truncate">{brokerName}</span>
                        </span>
                        <span className="admin-tablet-badge-group flex shrink-0 items-center gap-2">
                          <AdminStatusBadge status={requirement.deleted_at ? "deleted" : resolvedStatus} label={statusLabel} className="admin-tablet-badge min-h-[26px] px-2 py-0.5 text-xs" />
                          {requirement.deactivated_by === "admin" && !requirement.deleted_at ? (
                            <AdminStatusBadge status="inactive" label="Admin Paused" className="admin-tablet-badge hidden min-h-[26px] px-2 py-0.5 text-xs sm:inline-flex" />
                          ) : null}
                          <span className="admin-tablet-badge inline-flex min-h-[26px] shrink-0 items-center whitespace-nowrap rounded-full border border-[#e2e7f0] bg-white px-2 py-0.5 text-xs font-semibold text-[#4f5c73]">
                            {matchesCount} match{matchesCount === 1 ? "" : "es"}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="hidden xl:block xl:min-w-0">
                      <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Broker</p>
                      <p className="mt-1 text-[15px] font-semibold text-[#28324a]">{brokerName}</p>
                      <p className={cn(ADMIN_TABLE_BODY_TEXT_CLASS, "break-all")}>{requirement.owner?.email || "Email unavailable"}</p>
                    </div>

                    <div className="hidden xl:block xl:min-w-0">
                      <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Status</p>
                      <div className="mt-1 flex flex-wrap gap-2 xl:mt-0">
                        <AdminStatusBadge status={requirement.deleted_at ? "deleted" : resolvedStatus} label={statusLabel} />
                        {requirement.deactivated_by === "admin" && !requirement.deleted_at ? (
                          <AdminStatusBadge status="inactive" label="Admin Paused" />
                        ) : null}
                      </div>
                    </div>

                    <div className="hidden xl:block xl:min-w-0">
                      <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Matches</p>
                      <p className={cn("mt-1 xl:mt-0", ADMIN_TABLE_VALUE_CLASS)}>
                        {matchesCount} match{matchesCount === 1 ? "" : "es"}
                      </p>
                      <p className={ADMIN_TABLE_META_TEXT_CLASS}>
                        {requirement.latest_submission_at ? `Latest ${formatDateTime(requirement.latest_submission_at)}` : "No submission activity"}
                      </p>
                    </div>

                    <div className="absolute right-2 top-2 mb-0 h-fit w-auto shrink-0 justify-self-end whitespace-nowrap pb-0 xl:static xl:col-start-auto xl:row-start-auto xl:min-w-0 xl:self-auto xl:justify-self-end">
                      <div className="flex w-auto flex-nowrap justify-end gap-0 xl:gap-2">
                        <button
                          type="button"
                          className={cn(ADMIN_TABLE_ACTION_BUTTON_BASE, ADMIN_TABLE_ACTION_BUTTON_PRIMARY, "hidden xl:inline-flex")}
                          onClick={() => {
                            setOpenActionMenuId(null);
                            void viewMatches(requirement);
                          }}
                        >
                          View Matches
                        </button>

                        <RequirementActionsMenu
                          requirement={requirement}
                          actionKey={actionKey}
                          isOpen={openActionMenuId === requirement.id}
                          onOpenChange={(open) => setOpenActionMenuId(open ? requirement.id : null)}
                          onViewMatches={() => {
                            setOpenActionMenuId(null);
                            void viewMatches(requirement);
                          }}
                          onView={() => {
                            setOpenActionMenuId(null);
                            setDetailsRequirement(requirement);
                          }}
                          onToggleRequirement={(nextAction) => setPendingStatusAction({ action: nextAction, requirement })}
                          onDeleteRequirement={() => setPendingDeleteRequirement(requirement)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5">
            <AdminRequirementsBlankState
              title={normalizedSearchQuery ? "No results found" : filter === "deleted" ? "No deleted requirements" : "No requirements found"}
              description={
                normalizedSearchQuery
                  ? "No buyer requirements match your search with the current filters."
                  : filter === "deleted"
                    ? "No deleted requirements match the selected status and date filters."
                    : "No buyer requirements match the selected status and date filters."
              }
            />
          </div>
        )}
      </div>

      {visibleRequirements.length ? (
        <ListPaginationControls
          pagination={resolvedPagination}
          pageSizeOptions={resolvedPageSizeOptions}
          itemLabel="requirements"
          onPageChange={resolvedSetPage}
          onPageSizeChange={resolvedSetPageSize}
        />
      ) : null}

      {resolvedPendingDeleteRequirement ? (
        <RequirementDeleteDialog
          requirementTitle={getRequirementLabel(resolvedPendingDeleteRequirement)}
          loading={actionKey === `${resolvedPendingDeleteRequirement.id}:delete`}
          onClose={() => setPendingDeleteRequirement(null)}
          onConfirm={() => void deleteRequirement()}
        />
      ) : null}

      {resolvedPendingStatusAction ? (
        <AdminRequirementStatusConfirmationDialog
          action={resolvedPendingStatusAction.action}
          loading={actionKey === `${resolvedPendingStatusAction.requirement.id}:${resolvedPendingStatusAction.action}`}
          onClose={() => setPendingStatusAction(null)}
          onConfirm={() => void toggleRequirement(resolvedPendingStatusAction.requirement, resolvedPendingStatusAction.action)}
        />
      ) : null}

      {resolvedDetailsRequirement ? (
        <AdminRequirementDetailsModal
          requirement={resolvedDetailsRequirement}
          onClose={() => setDetailsRequirement(null)}
        />
      ) : null}

      {resolvedMatchesRequirement ? (
        <RequirementMatchesAdminModal
          requirement={resolvedMatchesRequirement}
          matches={selectedRequirementMatches}
          loading={matchesLoading}
          listingReturnHref={listingReturnHref}
          onClose={() => {
            setMatchesRequirement(null);
            setSelectedRequirementMatches([]);
          }}
        />
      ) : null}
    </>
  );
}
