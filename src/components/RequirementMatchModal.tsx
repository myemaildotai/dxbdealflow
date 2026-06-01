"use client";

import { useMemo, useState } from "react";
import { useSnackbar } from "notistack";
import { apiFetch } from "@/lib/deal-api";
import { formatCurrency, formatPropertyType } from "@/lib/deal-utils";
import { isListingMatchingRequirement } from "@/lib/requirement-matching";
import type { ListingStatus, Requirement } from "@/lib/deal-types";

type MatchListingOption = {
  id: string;
  title: string;
  property_type: string;
  price: number;
  bedrooms: number | null;
  status: ListingStatus;
  area_id: string | null;
  area?: { name: string; city: string } | null;
};

export function RequirementMatchModal({
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
  const areaLabel = requirement.area;
  const matchingListings = useMemo(
    () => listings.filter((listing) => isListingMatchingRequirement(requirement, listing)),
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
    <div className="modal-backdrop">
      <div className="modal-surface max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">I Have a Match</p>
            <h3 className="mt-2 text-xl font-semibold text-brand-navy sm:text-2xl">
              {requirement.title || `Buyer brief in ${areaLabel || "preferred areas"}`}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-brand-slate sm:line-clamp-none">{requirement.description}</p>
          </div>
          <button
            type="button"
            onClick={() => (!submitting ? onClose() : null)}
            className="modal-close-button"
            disabled={submitting}
            aria-label="Close match modal"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-5">
          <div>
            <label className="label">Message</label>
            <textarea
              className="input min-h-[120px] sm:min-h-[160px]"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Optional note to the receiving broker about why this listing fits."
            />
          </div>

          <div>
            <label className="label">Select one listing</label>
            <select className="input" value={listingId} onChange={(event) => setListingId(event.target.value)}>
              <option value="">Please select a listing</option>
              {matchingListings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.title} | {listing.area?.name || "Area pending"} | {formatPropertyType(listing.property_type)} |{" "}
                  {formatCurrency(listing.price)}
                </option>
              ))}
            </select>
            {!matchingListings.length ? (
              <p className="mt-2 text-sm text-rose-300">You do not have a listing available to submit for this requirement right now.</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting || !matchingListings.length}>
            {submitting ? "Sending..." : "Submit Match"}
          </button>
        </div>
      </div>
    </div>
  );
}
