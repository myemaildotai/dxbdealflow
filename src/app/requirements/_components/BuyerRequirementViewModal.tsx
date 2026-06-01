"use client";

import { type ReactNode, useState } from "react";
import { getFullName, formatDateTime, formatDealType, formatPropertyType, formatRequirementUrgency } from "@/lib/deal-utils";
import { formatRequirementBedrooms } from "@/lib/requirements";
import type { Requirement } from "@/lib/deal-types";
import { BuyerBoardModalShell } from "./BuyerBoardModalShell";
import { BedIcon, ClockIcon, CloseIcon, CurrencyIcon, HomeIcon, MapPinIcon, SparklesIcon } from "./BuyerBoardIcons";
import {
  getBuyerBoardRequirementTitle,
  getRequirementBudgetLine,
  getRequirementMatchCount,
  getRequirementMatchLabel,
  getRequirementPostedMeta,
} from "./buyer-board-utils";

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-[#dce5ef] bg-white px-3 py-3 shadow-[0_14px_30px_rgba(15,42,95,0.05)] sm:rounded-[22px] sm:px-4 sm:py-4">
      <div className="flex items-center gap-2">
        {icon ? <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef4ff] text-brand-navy">{icon}</span> : null}
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-slate">{label}</p>
      </div>
      <p className="mt-3 text-[15px] font-medium leading-6 text-brand-ink">{value}</p>
    </div>
  );
}

function ModalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-[#dee6ef] bg-white p-3 shadow-[0_18px_34px_rgba(15,42,95,0.06)] sm:rounded-[24px] sm:p-5">
      <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-brand-ink">{title}</h3>
      <div className="mt-3 sm:mt-4">{children}</div>
    </section>
  );
}

function ExpandableText({
  text,
  emptyText,
}: {
  text: string | null | undefined;
  emptyText: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const resolvedText = text?.trim() || emptyText;
  const isExpandable = resolvedText.length > 240;

  return (
    <div>
      <p className={`${isExpandable && !expanded ? "line-clamp-2 sm:line-clamp-5 " : ""}whitespace-pre-wrap text-[14px] leading-6 text-brand-slate sm:text-[15px] sm:leading-7`}>{resolvedText}</p>
      {isExpandable ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-4 inline-flex items-center text-[13px] font-semibold text-brand-navy transition hover:text-brand-blue"
        >
          {expanded ? "See Less" : "See More"}
        </button>
      ) : null}
    </div>
  );
}

export function BuyerRequirementViewModal({
  requirement,
  showOwnerMeta,
  onClose,
}: {
  requirement: Requirement;
  showOwnerMeta: boolean;
  onClose: () => void;
}) {
  const title = getBuyerBoardRequirementTitle(requirement);
  const bedroomsLabel = formatRequirementBedrooms(requirement.bedrooms) || "Not specified";
  const totalMatches = getRequirementMatchCount(requirement);
  const postedMeta = getRequirementPostedMeta(requirement);

  return (
    <BuyerBoardModalShell onClose={onClose} surfaceClassName="max-w-6xl">
      <div className="border-b border-[#e8edf4] bg-[#f5f7fa] px-4 py-4 sm:px-7 sm:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-brand-ink sm:mt-4 sm:text-2xl md:text-3xl lg:text-[34px]">{title}</h2>
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
              <span className="inline-flex items-center rounded-full border border-[#d7e3f7] bg-[#eef4ff] px-3 py-1.5 text-[12px] font-semibold text-brand-navy">
                {getRequirementMatchLabel(totalMatches)}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#f0d5cc] bg-[#fff4ef] px-3 py-1.5 text-[12px] font-semibold text-[#b25647]">
                {formatRequirementUrgency(requirement.urgency)} urgency
              </span>
              <span className="inline-flex items-center rounded-full border border-[#dbe3ec] bg-white px-3 py-1.5 text-[12px] font-semibold text-brand-slate">
                Posted {postedMeta.relative}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-line bg-white text-brand-navy shadow-[0_10px_24px_rgba(15,42,95,0.08)] transition hover:border-brand-blue/30 hover:bg-brand-panel-soft"
            aria-label="Close requirement view"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-x-hidden overflow-y-auto px-3 py-3 sm:px-7 sm:py-5 lg:grid-cols-[minmax(0,1.24fr)_minmax(0,0.88fr)] lg:gap-5">
        <div className="space-y-3 lg:space-y-5">
          <ModalSection title="Requirement Brief">
            <ExpandableText text={requirement.description} emptyText="No brief was provided for this requirement." />
          </ModalSection>

          <ModalSection title="Search Criteria">
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <InfoCard label="Budget" value={getRequirementBudgetLine(requirement)} icon={<CurrencyIcon className="h-4 w-4" />} />
              <InfoCard label="Area" value={requirement.area || "Flexible area"} icon={<MapPinIcon className="h-4 w-4" />} />
              <InfoCard label="Property Type" value={formatPropertyType(requirement.property_type)} icon={<HomeIcon className="h-4 w-4" />} />
              <InfoCard label="Bedrooms" value={bedroomsLabel} icon={<BedIcon className="h-4 w-4" />} />
              <InfoCard label="Deal Type" value={formatDealType(requirement.deal_type)} icon={<SparklesIcon className="h-4 w-4" />} />
              <InfoCard label="Matches" value={getRequirementMatchLabel(totalMatches)} icon={<SparklesIcon className="h-4 w-4" />} />
            </div>
          </ModalSection>
        </div>

        <div className="space-y-3 lg:space-y-5">
          {requirement.timeline ? (
            <ModalSection title="Timeline">
              <ExpandableText text={requirement.timeline} emptyText="No timeline was provided for this requirement." />
            </ModalSection>
          ) : null}

          <ModalSection title="Activity">
            <div className="grid gap-3">
              <InfoCard label="Created" value={formatDateTime(requirement.created_at)} icon={<ClockIcon className="h-4 w-4" />} />
              <InfoCard label="Updated" value={formatDateTime(requirement.updated_at)} icon={<ClockIcon className="h-4 w-4" />} />
              <InfoCard
                label="Latest Match Activity"
                value={requirement.latest_submission_at ? formatDateTime(requirement.latest_submission_at) : "No submitted matches yet"}
                icon={<SparklesIcon className="h-4 w-4" />}
              />
            </div>
          </ModalSection>

          {showOwnerMeta ? (
            <ModalSection title="Broker Details">
              <div className="grid gap-3">
                <InfoCard
                  label="Posted By"
                  value={requirement.owner ? getFullName(requirement.owner.first_name, requirement.owner.last_name) : "Broker unavailable"}
                />
                <InfoCard label="Email" value={requirement.owner?.email || "Email unavailable"} />
              </div>
            </ModalSection>
          ) : null}
        </div>
      </div>
    </BuyerBoardModalShell>
  );
}
