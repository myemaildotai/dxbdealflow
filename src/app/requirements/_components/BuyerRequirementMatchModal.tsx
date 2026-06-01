"use client";

import { useMemo, useState } from "react";
import { useSnackbar } from "notistack";
import type { Requirement } from "@/lib/deal-types";
import { apiFetch } from "@/lib/deal-api";
import { formatCurrency, formatListingStatus, formatPropertyType, formatRequirementUrgency } from "@/lib/deal-utils";
import { getRequirementMatchedListings } from "@/lib/requirement-matching";
import { BuyerBoardModalShell } from "./BuyerBoardModalShell";
import { BedIcon, ChatBubbleIcon, CheckIcon, CloseIcon, HomeIcon, MapPinIcon } from "./BuyerBoardIcons";
import { getBuyerBoardRequirementTitle, getRequirementBudgetLine, type MatchListingOption } from "./buyer-board-utils";

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[16px] border border-[#dce5ef] bg-white px-3 py-3 shadow-[0_14px_30px_rgba(15,42,95,0.05)] sm:rounded-[22px] sm:px-4 sm:py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-slate">{label}</p>
      <p className="mt-2 text-[15px] font-medium leading-6 text-brand-ink">{value}</p>
    </div>
  );
}

export function BuyerRequirementMatchModal({
  requirement,
  listings,
  onClose,
  onSubmitted,
}: {
  requirement: Requirement;
  listings: MatchListingOption[];
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [message, setMessage] = useState("");
  const [listingId, setListingId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const matchingListingResults = useMemo(
    () => getRequirementMatchedListings(requirement, listings),
    [listings, requirement]
  );

  const handleSubmit = async () => {
    if (!listingId) {
      enqueueSnackbar("Please select a listing.", { variant: "error" });
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/api/requirements/${requirement.id}/matches`, {
        method: "POST",
        body: JSON.stringify({
          message,
          listingId,
        }),
      });
      enqueueSnackbar("Match shared with the requirement owner.", { variant: "success" });
      onSubmitted();
      onClose();
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : "Failed to submit match.", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BuyerBoardModalShell onClose={onClose} disableClose={submitting} surfaceClassName="max-w-6xl">
      <div className="border-b border-[#e8edf4] bg-[#f5f7fa] px-4 py-4 sm:px-7 sm:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-brand-ink sm:mt-4 sm:text-2xl md:text-3xl lg:text-[34px]">{getBuyerBoardRequirementTitle(requirement)}</h2>
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
              <span className="inline-flex items-center rounded-full border border-[#f0d5cc] bg-[#fff4ef] px-3 py-1.5 text-[12px] font-semibold text-[#b25647]">
                {formatRequirementUrgency(requirement.urgency)} urgency
              </span>
              <span className="inline-flex items-center rounded-full border border-[#dbe3ec] bg-white px-3 py-1.5 text-[12px] font-semibold text-brand-slate">
                {matchingListingResults.length} matching listing{matchingListingResults.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => (!submitting ? onClose() : null)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-line bg-white text-brand-navy shadow-[0_10px_24px_rgba(15,42,95,0.08)] transition hover:border-brand-blue/30 hover:bg-brand-panel-soft disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close match modal"
            disabled={submitting}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-x-hidden overflow-y-auto px-3 py-3 sm:px-7 sm:py-5 lg:grid-cols-[minmax(0,1.28fr)_minmax(0,0.92fr)] lg:gap-5">
        <section className="rounded-[16px] border border-[#dee6ef] bg-white p-3 shadow-[0_18px_34px_rgba(15,42,95,0.06)] sm:rounded-[24px] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-brand-ink">Select One Listing</h3>
              <p className="mt-1 text-[14px] leading-6 text-brand-slate">Choose one listing that already matches this buyer requirement.</p>
            </div>
            <span className="inline-flex w-full items-center justify-center rounded-full border border-[#dbe3ec] bg-white px-3 py-1 text-center text-[12px] font-semibold text-brand-slate sm:w-auto">
              {matchingListingResults.length} available
            </span>
          </div>

          {matchingListingResults.length ? (
            <div className="mt-3 space-y-2 sm:mt-5 sm:space-y-3">
              {matchingListingResults.map(({ listing }) => {
                const isSelected = listing.id === listingId;
                const listingBedrooms = listing.bedrooms === null ? "Open" : `${listing.bedrooms} BR`;

                return (
                  <button
                    key={listing.id}
                    type="button"
                    onClick={() => setListingId(listing.id)}
                    className={`w-full rounded-[16px] border px-3 py-3 text-left transition sm:rounded-[24px] sm:px-4 sm:py-4 ${
                      isSelected
                        ? "border-brand-blue/35 bg-[#eef4ff] shadow-[0_14px_28px_rgba(46,79,140,0.12)]"
                        : "border-brand-line bg-white shadow-[0_10px_24px_rgba(15,42,95,0.05)] hover:border-brand-blue/25 hover:bg-brand-panel-soft"
                    }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${
                              isSelected ? "border-brand-blue bg-brand-blue text-white" : "border-[#dbe3ec] bg-white text-brand-slate"
                            }`}
                          >
                            {isSelected ? <CheckIcon className="h-4 w-4" /> : <span className="h-2.5 w-2.5 rounded-full bg-current" />}
                          </span>
                          <h4 className="line-clamp-2 min-w-0 text-[16px] font-semibold tracking-[-0.02em] text-brand-ink sm:text-[18px] lg:truncate">{listing.title}</h4>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
                          <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe3ec] bg-[#f5f7fa] px-3 py-1.5 text-[12px] font-semibold text-brand-slate">
                            <MapPinIcon className="h-3.5 w-3.5" />
                            {listing.area?.name || "Area pending"}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe3ec] bg-[#f5f7fa] px-3 py-1.5 text-[12px] font-semibold text-brand-slate">
                            <HomeIcon className="h-3.5 w-3.5" />
                            {formatPropertyType(listing.property_type)}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe3ec] bg-[#f5f7fa] px-3 py-1.5 text-[12px] font-semibold text-brand-slate">
                            <BedIcon className="h-3.5 w-3.5" />
                            {listingBedrooms}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe3ec] bg-[#f5f7fa] px-3 py-1.5 text-[12px] font-semibold text-brand-slate">
                            {formatListingStatus(listing.status)}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0 shrink-0">
                        <p className="break-words text-[18px] font-semibold tracking-[-0.03em] text-brand-ink sm:text-[20px]">{formatCurrency(listing.price)}</p>
                        <p className="mt-1 text-[13px] text-brand-slate">{listing.area?.city || "Dubai"}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
          <div className="mt-3 rounded-[16px] border border-dashed border-[#d7e0eb] bg-[#f8fafc] px-4 py-6 text-center sm:mt-5 sm:rounded-[24px] sm:px-5 sm:py-8">
              <p className="text-[18px] font-semibold tracking-[-0.02em] text-brand-ink">No eligible listings right now</p>
              <p className="mt-2 text-[14px] leading-6 text-brand-slate">
                You do not have a listing available to submit for this requirement right now.
              </p>
            </div>
          )}
        </section>

        <section className="space-y-3 lg:space-y-5">
          <div className="rounded-[16px] border border-[#dee6ef] bg-white p-3 shadow-[0_18px_34px_rgba(15,42,95,0.06)] sm:rounded-[24px] sm:p-5">
            <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-brand-ink">Requirement Summary</h3>
            <div className="mt-4 grid gap-3">
              <SummaryItem label="Budget" value={getRequirementBudgetLine(requirement)} />
              <SummaryItem label="Area" value={requirement.area || "Flexible area"} />
              <SummaryItem label="Property Type" value={formatPropertyType(requirement.property_type)} />
            </div>
          </div>

          <div className="rounded-[16px] border border-[#dee6ef] bg-white p-3 shadow-[0_18px_34px_rgba(15,42,95,0.06)] sm:rounded-[24px] sm:p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef4ff] text-brand-navy">
                <ChatBubbleIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-brand-ink">Optional Message</h3>
              </div>
            </div>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Optional note to the receiving broker about why this listing fits."
              className="mt-3 min-h-[110px] w-full rounded-[16px] border border-brand-line bg-white px-3 py-3 text-[14px] leading-6 text-brand-ink outline-none transition duration-200 placeholder:text-brand-slate focus:border-brand-gold focus:shadow-[0_0_0_4px_rgba(212,175,55,0.18)] disabled:cursor-not-allowed disabled:bg-brand-panel-soft sm:mt-4 sm:min-h-[125px] sm:rounded-[22px] sm:px-4 sm:py-4 sm:text-[15px] sm:leading-7"
              disabled={submitting}
            />
          </div>
        </section>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[#e8edf4] bg-[#f5f7fa] px-4 py-3 sm:flex-row sm:justify-end sm:px-7 sm:py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="inline-flex min-h-[46px] w-full items-center justify-center rounded-full border border-brand-line bg-white px-5 text-[15px] font-semibold text-brand-navy shadow-[0_10px_24px_rgba(15,42,95,0.06)] transition hover:-translate-y-0.5 hover:border-brand-blue/30 hover:bg-brand-panel-soft disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[50px] sm:w-auto"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !matchingListingResults.length}
          className="inline-flex min-h-[46px] w-full items-center justify-center rounded-full border border-[#d4af37] bg-[#d4af37] px-5 text-[15px] font-semibold text-brand-navy shadow-[0_14px_24px_rgba(212,175,55,0.18)] transition hover:-translate-y-0.5 hover:bg-[#c8a42f] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[50px] sm:w-auto"
        >
          {submitting ? "Sending..." : "Submit Match"}
        </button>
      </div>
    </BuyerBoardModalShell>
  );
}
