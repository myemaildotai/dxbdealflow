import type { ReactNode } from "react";
import { Requirement } from "@/lib/deal-types";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDealType,
  formatPropertyType,
  formatRequirementUrgency,
  statusClasses,
} from "@/lib/deal-utils";
import { formatRequirementBedrooms } from "@/lib/requirements";

export function RequirementCard({
  requirement,
  action,
  footer,
}: {
  requirement: Requirement;
  action?: ReactNode;
  footer?: ReactNode;
}) {
  const areaLabel = requirement.area;
  const bedroomsLabel = formatRequirementBedrooms(requirement.bedrooms);
  const isDeleted = !!requirement.deleted_at;
  const requirementStatus = requirement.status || (isDeleted ? "closed" : requirement.is_active ? "active" : "inactive");
  const showAdminDeactivatedLabel = !requirement.is_active && requirement.deactivated_by === "admin";

  return (
    <article className="panel p-3 sm:p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 lg:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={statusClasses(requirement.urgency)}>{formatRequirementUrgency(requirement.urgency)}</span>
            <span className={statusClasses(requirementStatus)}>
              {requirementStatus === "closed" ? "Closed" : requirementStatus === "active" ? "Active" : "Inactive"}
            </span>
            {showAdminDeactivatedLabel ? <span className={statusClasses("inactive")}>Deactivated by Admin</span> : null}
          </div>
          <h3 className="mt-3 line-clamp-2 break-words font-heading text-lg font-semibold text-brand-ink lg:mt-4 lg:text-xl">
            {requirement.title || `Buyer brief in ${areaLabel || "preferred areas"}`}
          </h3>
        </div>
        <div className="text-left sm:text-right">
          <p className="micro-copy">Deal</p>
          <p className="mt-2 text-sm font-semibold text-brand-navy">{formatDealType(requirement.deal_type)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:gap-3 xl:mt-5 xl:grid-cols-4">
        <div className="subtle-panel min-w-0 p-2.5 lg:p-3">
          <p className="micro-copy">Budget</p>
          <p className="mt-2 break-words text-sm font-semibold text-brand-ink sm:text-base">
            {formatCurrency(requirement.budget_min)} - {formatCurrency(requirement.budget_max)}
          </p>
        </div>
        <div className="subtle-panel min-w-0 p-2.5 lg:p-3">
          <p className="micro-copy">Area</p>
          <p className="mt-2 break-words text-sm font-semibold text-brand-ink sm:text-base">{areaLabel || "Flexible"}</p>
        </div>
        <div className="subtle-panel min-w-0 p-2.5 lg:p-3">
          <p className="micro-copy">Bedrooms</p>
          <p className="mt-2 break-words text-sm font-semibold text-brand-ink sm:text-base">{bedroomsLabel || "Open"}</p>
        </div>
        <div className="subtle-panel min-w-0 p-2.5 lg:p-3">
          <p className="micro-copy">Property</p>
          <p className="mt-2 break-words text-sm font-semibold text-brand-ink sm:text-base">{formatPropertyType(requirement.property_type)}</p>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-brand-slate lg:mt-5 lg:line-clamp-4">{requirement.description}</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 lg:mt-5 lg:gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-brand-ink">
            Timeline: <span className="font-normal text-brand-slate">{requirement.timeline || "Not specified"}</span>
          </p>
          <p className="text-sm text-brand-slate">
            Posted {formatDate(requirement.created_at)}
            {typeof requirement.submitted_match_count === "number"
              ? ` | ${requirement.submitted_match_count} submitted match${requirement.submitted_match_count === 1 ? "" : "es"}`
              : ""}
          </p>
          {requirement.deleted_at ? <p className="text-sm text-brand-slate">Closed {formatDateTime(requirement.deleted_at)}</p> : null}
        </div>
        {action}
      </div>

      {footer ? <div className="mt-3 border-t border-brand-line/80 pt-3 lg:mt-4 lg:pt-4">{footer}</div> : null}
    </article>
  );
}
