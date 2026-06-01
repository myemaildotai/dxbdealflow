"use client";

import type { ReactNode } from "react";
import { getFullName, formatDealType, formatPropertyType, formatRequirementUrgency } from "@/lib/deal-utils";
import { formatRequirementBedrooms } from "@/lib/requirements";
import type { Requirement } from "@/lib/deal-types";
import { BedIcon, ClockIcon, CurrencyIcon, EyeIcon, HomeIcon, MapPinIcon, SparklesIcon } from "./BuyerBoardIcons";
import {
  getBuyerBoardRequirementTitle,
  getRequirementBudgetLine,
  getRequirementMatchCount,
  getRequirementMatchLabel,
  formatRelativeTime,
} from "./buyer-board-utils";

function DetailTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[16px] border border-[#dce5ef] bg-white px-3 py-3 shadow-[0_14px_30px_rgba(15,42,95,0.05)] lg:rounded-[22px] lg:px-4 lg:py-4">
      <div className="flex items-center gap-2 text-brand-navy">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef4ff] text-brand-navy">{icon}</span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-slate">{label}</p>
      </div>
      <p className="mt-3 text-[15px] font-medium leading-6 text-brand-ink">{value}</p>
    </div>
  );
}

export function BuyerRequirementCard({
  requirement,
  canMatch,
  showOwnerMeta,
  onView,
  onMatch,
}: {
  requirement: Requirement;
  canMatch: boolean;
  showOwnerMeta: boolean;
  onView: () => void;
  onMatch: () => void;
}) {
  const title = getBuyerBoardRequirementTitle(requirement);
  const bedroomsLabel = formatRequirementBedrooms(requirement.bedrooms) || "Open";
  const totalMatches = getRequirementMatchCount(requirement);
  const ownerName = requirement.owner ? getFullName(requirement.owner.first_name, requirement.owner.last_name) : "Broker unavailable";

  return (
    <article className="relative overflow-hidden rounded-[18px] border border-[#dbe4ef] bg-white p-3 shadow-[0_24px_54px_rgba(15,42,95,0.08)] sm:p-4 lg:rounded-[30px] lg:p-6">
      <div className="relative z-10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between xl:gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="line-clamp-2 break-words text-[21px] font-semibold tracking-[-0.04em] text-brand-ink sm:text-[24px] xl:block xl:text-[32px]">{title}</h2>
              <span className="inline-flex items-center rounded-full border border-[#f0d5cc] bg-[#fff4ef] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#b25647]">
                {formatRequirementUrgency(requirement.urgency)} urgency
              </span>
              <span className="inline-flex items-center rounded-full border border-[#dbe3ec] bg-[#f5f7fa] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-slate">
                {getRequirementMatchLabel(totalMatches)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-[14px] text-brand-slate">
              <span className="inline-flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-brand-slate" />
                Posted {formatRelativeTime(requirement.created_at)}
              </span>
              <span className="h-1 w-1 rounded-full bg-[#dbe4ef]" aria-hidden="true" />
              <span>{formatPropertyType(requirement.property_type)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:items-start xl:justify-end">
            

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onView}
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-brand-line bg-white px-5 text-[15px] font-semibold text-brand-navy shadow-[0_10px_24px_rgba(15,42,95,0.06)] transition hover:-translate-y-0.5 hover:border-brand-blue/30 hover:bg-brand-panel-soft"
              >
                <EyeIcon className="h-4 w-4" />
                View
              </button>

              {canMatch ? (
                <button
                  type="button"
                  onClick={onMatch}
                  className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-[#d4af37] bg-[#d4af37] px-5 text-[15px] font-semibold text-brand-navy shadow-[0_14px_24px_rgba(212,175,55,0.18)] transition hover:-translate-y-0.5 hover:bg-[#c8a42f]"
                >
                  I Have a Match
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:gap-3 xl:mt-6 xl:grid-cols-5">
          <DetailTile icon={<CurrencyIcon className="h-4 w-4" />} label="Budget" value={getRequirementBudgetLine(requirement)} />
          <DetailTile icon={<MapPinIcon className="h-4 w-4" />} label="Area" value={requirement.area || "Flexible area"} />
          <DetailTile icon={<HomeIcon className="h-4 w-4" />} label="Property Type" value={formatPropertyType(requirement.property_type)} />
          <DetailTile icon={<BedIcon className="h-4 w-4" />} label="Bedrooms" value={bedroomsLabel} />
          <DetailTile icon={<SparklesIcon className="h-4 w-4" />} label="Deal Type" value={formatDealType(requirement.deal_type)} />
        </div>

        {showOwnerMeta ? (
          <div className="mt-4 rounded-[16px] border border-[#dee6ef] bg-white px-3 py-3 shadow-[0_18px_34px_rgba(15,42,95,0.06)] lg:mt-6 lg:rounded-[24px] lg:px-4 lg:py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-slate">Posted By</p>
                <p className="mt-2 text-[15px] font-semibold text-brand-ink">{ownerName}</p>
              </div>
              <p className="text-[14px] text-brand-slate">{requirement.owner?.email || "Email unavailable"}</p>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
