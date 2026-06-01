"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AdminDashboardDateFilterValue, matchesAdminDashboardDateRange } from "@/app/admin/_components/AdminDashboardDateFilter";
import {
  ADMIN_TABLE_BODY_TEXT_CLASS,
  ADMIN_TABLE_HEADER_CELL_CLASS,
  ADMIN_TABLE_HEADER_CLASS,
  ADMIN_TABLE_META_TEXT_CLASS,
  ADMIN_TABLE_MOBILE_LABEL_CLASS,
  ADMIN_TABLE_ROW_CLASS,
  ADMIN_TABLE_ROW_GROUP_CLASS,
  ADMIN_TABLE_SURFACE_CLASS,
  ADMIN_TABLE_TITLE_CLASS,
  AdminBlankState,
  AdminStatusBadge,
  AdminSubTabPill,
} from "@/app/admin/_components/AdminPanelUi";
import { ListPaginationControls } from "@/components/ListPaginationControls";
import { ResponsiveRowActionsMenu, type ResponsiveRowAction } from "@/components/ResponsiveRowActionsMenu";
import { SearchField } from "@/components/SearchField";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { AdminEnquiry, EnquiryReply } from "@/lib/deal-types";
import { cn, formatCurrency, formatDateTime, formatPropertyType, getFullName } from "@/lib/deal-utils";
import { buildSearchText, normalizeSearchQuery } from "@/lib/search";

type EnquiryFilterId = "all" | "unreplied" | "replied" | "failed";
type AdminEnquiryModalState = { kind: "enquiry" | "replies"; enquiry: AdminEnquiry } | null;

const ENQUIRY_TABLE_DESKTOP_LAYOUT =
  "xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.05fr)_minmax(0,1.05fr)_minmax(0,1.2fr)_minmax(0,0.88fr)_auto] xl:gap-4";

function getBrokerName(enquiry: AdminEnquiry) {
  return enquiry.broker ? getFullName(enquiry.broker.first_name, enquiry.broker.last_name) || enquiry.broker.email : "Broker unavailable";
}

function getReplyBrokerName(reply: EnquiryReply) {
  return reply.broker ? getFullName(reply.broker.first_name, reply.broker.last_name) || reply.broker.email : "Broker unavailable";
}

function getReplyActivityDate(reply: EnquiryReply) {
  return reply.sent_at || reply.created_at;
}

function formatReplyStatus(status: EnquiryReply["status"] | null | undefined) {
  switch (status) {
    case "pending":
      return "Pending";
    case "sent":
      return "Sent";
    case "failed":
      return "Failed";
    default:
      return "No replies";
  }
}

function getEnquirySearchText(enquiry: AdminEnquiry) {
  return buildSearchText([
    enquiry.contact_name,
    enquiry.contact_email,
    enquiry.contact_phone,
    enquiry.message,
    enquiry.lead_status,
    enquiry.listing?.title,
    enquiry.listing?.property_type ? formatPropertyType(enquiry.listing.property_type) : null,
    enquiry.listing?.status,
    getBrokerName(enquiry),
    enquiry.broker?.email,
    enquiry.replies.map((reply) => [
      reply.subject,
      reply.message,
      reply.enquirer_email,
      reply.status,
      reply.failure_reason,
      getReplyBrokerName(reply),
      reply.broker?.email,
    ]),
  ]);
}

function hasFailedReply(enquiry: AdminEnquiry) {
  return enquiry.latest_reply_status === "failed" || enquiry.replies.some((reply) => reply.status === "failed");
}

function isRepliedEnquiry(enquiry: AdminEnquiry) {
  return enquiry.reply_count > 0 && !hasFailedReply(enquiry);
}

function matchesEnquiryFilter(enquiry: AdminEnquiry, filter: EnquiryFilterId) {
  switch (filter) {
    case "replied":
      return isRepliedEnquiry(enquiry);
    case "unreplied":
      return enquiry.reply_count === 0;
    case "failed":
      return hasFailedReply(enquiry);
    case "all":
    default:
      return true;
  }
}

function getListingSummary(enquiry: AdminEnquiry) {
  if (!enquiry.listing) {
    return {
      title: "Listing not attached",
      detail: "No related listing",
    };
  }

  return {
    title: enquiry.listing.title,
    detail: `${formatPropertyType(enquiry.listing.property_type)} | ${
      typeof enquiry.listing.price === "number" ? formatCurrency(enquiry.listing.price) : "No asking price shared"
    }`,
  };
}

function getAdminListingHref(enquiry: AdminEnquiry, getListingDetailHref?: (listingId: string) => string) {
  const listingId = enquiry.listing?.id || enquiry.listing_id;

  if (!listingId) {
    return null;
  }

  return getListingDetailHref ? getListingDetailHref(listingId) : `/admin/listings/${listingId}`;
}

function getAdminBrokerHref(enquiry: AdminEnquiry) {
  const brokerId = enquiry.broker?.id || enquiry.to_user_id;
  return brokerId ? `/admin/brokers/${brokerId}` : null;
}

function AdminEnquiryDetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[12px] border border-[#e7ebf3] bg-[#fbfcff] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8c95a9]">{label}</p>
      <div className="mt-2 min-w-0 break-words text-sm font-semibold leading-6 text-[#28324a]">{value}</div>
    </div>
  );
}

function AdminEnquiryDetailModal({
  enquiry,
  getListingDetailHref,
  onClose,
}: {
  enquiry: AdminEnquiry;
  getListingDetailHref?: (listingId: string) => string;
  onClose: () => void;
}) {
  const listing = getListingSummary(enquiry);
  const listingHref = getAdminListingHref(enquiry, getListingDetailHref);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-slate-950/60 p-2 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="panel max-h-[calc(100dvh-1rem)] w-full max-w-4xl overflow-x-hidden overflow-y-auto p-3 sm:max-h-[calc(100vh-2rem)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Enquiry Details</p>
            <h3 className="mt-2 break-words text-2xl font-semibold text-brand-navy">{enquiry.contact_name}</h3>
            <p className="mt-2 break-all text-sm leading-6 text-brand-slate">{enquiry.contact_email}</p>
          </div>
          <button type="button" onClick={onClose} className="modal-close-button" aria-label="Close enquiry details">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <AdminEnquiryDetailField label="Enquirer" value={`${enquiry.contact_name} | ${enquiry.contact_phone || "Phone not provided"}`} />
          <AdminEnquiryDetailField label="Email" value={<span className="break-all">{enquiry.contact_email}</span>} />
          <AdminEnquiryDetailField
            label="Listing"
            value={
              listingHref ? (
                <Link href={listingHref} className="text-[#244f86] underline-offset-4 hover:underline">
                  {listing.title}
                </Link>
              ) : (
                listing.title
              )
            }
          />
          <AdminEnquiryDetailField label="Listing Detail" value={listing.detail} />
          <AdminEnquiryDetailField label="Broker" value={getBrokerName(enquiry)} />
          <AdminEnquiryDetailField label="Broker Email" value={<span className="break-all">{enquiry.broker?.email || "Email unavailable"}</span>} />
          <AdminEnquiryDetailField label="Created" value={formatDateTime(enquiry.created_at)} />
          <AdminEnquiryDetailField label="Preferred Channel" value={enquiry.preferred_channel} />
        </div>

        <div className="mt-5 rounded-[12px] border border-[#e7ebf3] bg-white px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8c95a9]">Message</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-[#384255]">{enquiry.message || "No message provided."}</p>
        </div>
      </div>
    </div>
  );
}

function AdminReplyDetailModal({
  enquiry,
  onClose,
}: {
  enquiry: AdminEnquiry;
  onClose: () => void;
}) {
  const orderedReplies = [...enquiry.replies].sort((left, right) => getReplyActivityDate(right).localeCompare(getReplyActivityDate(left)));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-slate-950/60 p-2 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="panel max-h-[calc(100dvh-1rem)] w-full max-w-4xl overflow-x-hidden overflow-y-auto p-3 sm:max-h-[calc(100vh-2rem)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Reply Details</p>
            <h3 className="mt-2 break-words text-2xl font-semibold text-brand-navy">Reply History</h3>
            <p className="mt-2 text-sm leading-6 text-brand-slate">
              {orderedReplies.length} {orderedReplies.length === 1 ? "reply" : "replies"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="modal-close-button" aria-label="Close reply details">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {orderedReplies.length ? (
            orderedReplies.map((reply) => (
              <div key={reply.id} className="rounded-[12px] border border-[#e5e9f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-base font-semibold tracking-[-0.02em] text-[#1f2940]">{reply.subject}</p>
                    <p className="mt-1 break-all text-sm text-[#5c6780]">To {reply.enquirer_email}</p>
                    <p className="mt-1 text-sm text-[#5c6780]">Sent by {getReplyBrokerName(reply)}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <AdminStatusBadge status={reply.status} label={formatReplyStatus(reply.status)} />
                    <span className="rounded-full border border-[#e2e7f0] bg-white px-3 py-1 text-xs font-semibold text-[#5c6780]">
                      {formatDateTime(getReplyActivityDate(reply))}
                    </span>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#384255]">{reply.message}</p>
                {reply.failure_reason ? (
                  <div className="mt-3 rounded-[10px] border border-[#f0c6bf] bg-[#fff7f5] px-3 py-2 text-sm font-semibold text-[#a7473b]">
                    {reply.failure_reason}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <AdminBlankState title="No replies yet" description="Broker replies will appear here after the broker sends an email response." />
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminEnquiriesWorkspace({
  dateFilter,
  enquiries,
  getListingDetailHref,
  showBrokerAction = true,
  stateResetKey,
}: {
  dateFilter: AdminDashboardDateFilterValue;
  enquiries: AdminEnquiry[];
  getListingDetailHref?: (listingId: string) => string;
  showBrokerAction?: boolean;
  stateResetKey: string;
}) {
  const [filter, setFilter] = useState<EnquiryFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalState, setModalState] = useState<AdminEnquiryModalState>(null);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);
  const normalizedSearchQuery = normalizeSearchQuery(debouncedSearchQuery);

  useEffect(() => {
    setFilter("all");
    setSearchQuery("");
    setModalState(null);
  }, [stateResetKey]);

  const dateScopedEnquiries = useMemo(
    () => enquiries.filter((enquiry) => matchesAdminDashboardDateRange(enquiry.created_at, dateFilter)),
    [dateFilter, enquiries]
  );
  const searchScopedEnquiries = useMemo(() => {
    if (!normalizedSearchQuery) {
      return dateScopedEnquiries;
    }

    return dateScopedEnquiries.filter((enquiry) => getEnquirySearchText(enquiry).includes(normalizedSearchQuery));
  }, [dateScopedEnquiries, normalizedSearchQuery]);
  const filters = useMemo(
    () => [
      { id: "all" as const, label: "All Enquiries", count: searchScopedEnquiries.length },
      { id: "unreplied" as const, label: "Unreplied", count: searchScopedEnquiries.filter((enquiry) => enquiry.reply_count === 0).length },
      { id: "replied" as const, label: "Replied", count: searchScopedEnquiries.filter(isRepliedEnquiry).length },
      {
        id: "failed" as const,
        label: "Failed",
        count: searchScopedEnquiries.filter(hasFailedReply).length,
      },
    ],
    [searchScopedEnquiries]
  );
  const visibleEnquiries = useMemo(
    () => searchScopedEnquiries.filter((enquiry) => matchesEnquiryFilter(enquiry, filter)),
    [filter, searchScopedEnquiries]
  );
  const {
    paginatedItems: paginatedEnquiries,
    pagination,
    pageSizeOptions,
    setPage,
    setPageSize,
  } = useClientPagination(visibleEnquiries, {
    resetKey: `${stateResetKey}|${filter}|${normalizedSearchQuery}|${dateFilter.id}|${dateFilter.range?.startDate || ""}|${dateFilter.range?.endDate || ""}|${visibleEnquiries.length}`,
  });

  return (
    <>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
          <div className="flex min-w-max gap-2 md:min-w-0 md:flex-wrap">
            {filters.map((item) => (
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
          ariaLabel="Search enquiries"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search enquirer, listing, broker, message"
          className="w-full xl:max-w-[26rem]"
        />
      </div>

      <div className={cn("mt-6", ADMIN_TABLE_SURFACE_CLASS)}>
        <div className={cn(ADMIN_TABLE_HEADER_CLASS, "border-b border-[#edf1f6]", ENQUIRY_TABLE_DESKTOP_LAYOUT)}>
          {["Enquirer", "Listing", "Broker", "Message", "Replies", "Action"].map((label) => (
            <p key={label} className={cn(ADMIN_TABLE_HEADER_CELL_CLASS, label === "Action" && "text-right xl:justify-self-end")}>
              {label}
            </p>
          ))}
        </div>

        {visibleEnquiries.length ? (
          <div className={ADMIN_TABLE_ROW_GROUP_CLASS}>
            {paginatedEnquiries.map((enquiry) => {
              const listing = getListingSummary(enquiry);
              const listingHref = getAdminListingHref(enquiry, getListingDetailHref);
              const brokerHref = getAdminBrokerHref(enquiry);
              const rowActions: ResponsiveRowAction[] = [
                {
                  label: "View Enquiry",
                  onClick: () => setModalState({ kind: "enquiry", enquiry }),
                  tone: "primary",
                },
                {
                  label: "View Reply",
                  onClick: () => setModalState({ kind: "replies", enquiry }),
                },
                {
                  label: "View Listing",
                  href: listingHref,
                  disabled: !listingHref,
                },
                ...(showBrokerAction
                  ? [
                      {
                        label: "View Broker",
                        href: brokerHref,
                        disabled: !brokerHref,
                      } satisfies ResponsiveRowAction,
                    ]
                  : []),
              ];

              return (
                <div key={enquiry.id} className={cn(ADMIN_TABLE_ROW_CLASS, "relative w-full overflow-hidden xl:overflow-visible")}>
                  <div className={cn("grid grid-cols-1 items-start gap-2 sm:gap-3 xl:items-center", ENQUIRY_TABLE_DESKTOP_LAYOUT)}>
                    <div className="min-w-0 pr-20 xl:pr-0">
                      <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Enquirer</p>
                      <p className={cn(ADMIN_TABLE_TITLE_CLASS, "line-clamp-1")}>{enquiry.contact_name}</p>
                      <p className={cn(ADMIN_TABLE_BODY_TEXT_CLASS, "break-all")}>{enquiry.contact_email}</p>
                      <p className={ADMIN_TABLE_META_TEXT_CLASS}>{enquiry.contact_phone || "Phone not provided"}</p>
                    </div>

                    <div className="min-w-0">
                      <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Listing</p>
                      <p className="mt-0.5 break-words text-[14px] font-semibold text-[#28324a] line-clamp-2 xl:mt-1 xl:text-[15px]">
                        {listing.title}
                      </p>
                      <p className={cn(ADMIN_TABLE_BODY_TEXT_CLASS, "line-clamp-1")}>{listing.detail}</p>
                    </div>

                    <div className="min-w-0">
                      <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Broker</p>
                      <p className="mt-0.5 break-words text-[14px] font-semibold text-[#28324a] line-clamp-2 xl:mt-1 xl:text-[15px]">
                        {getBrokerName(enquiry)}
                      </p>
                      <p className={cn(ADMIN_TABLE_BODY_TEXT_CLASS, "break-all line-clamp-1")}>{enquiry.broker?.email || "Email unavailable"}</p>
                    </div>

                    <div className="min-w-0">
                      <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Message</p>
                      <p className={cn(ADMIN_TABLE_BODY_TEXT_CLASS, "line-clamp-2")}>{enquiry.message || "No message provided."}</p>
                      <p className={ADMIN_TABLE_META_TEXT_CLASS}>Received {formatDateTime(enquiry.created_at)}</p>
                    </div>

                    <div className="min-w-0">
                      <p className={cn(ADMIN_TABLE_MOBILE_LABEL_CLASS, "xl:hidden")}>Replies</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#e2e7f0] bg-white px-3 py-1 text-xs font-semibold text-[#5c6780]">
                          {enquiry.reply_count}
                        </span>
                      </div>
                      <p className={ADMIN_TABLE_META_TEXT_CLASS}>
                        {enquiry.latest_reply_at ? formatDateTime(enquiry.latest_reply_at) : "No replies yet"}
                      </p>
                    </div>

                    <div className="absolute right-2 top-2 mb-0 flex h-fit shrink-0 justify-end whitespace-nowrap pb-0 xl:static xl:col-start-auto xl:row-start-auto xl:self-auto xl:justify-end">
                      <ResponsiveRowActionsMenu actions={rowActions} label={`Open actions for enquiry from ${enquiry.contact_name}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5">
            <AdminBlankState
              title={normalizedSearchQuery ? "No results found" : "No enquiries found"}
              description={
                normalizedSearchQuery
                  ? "No enquiries match your search with the current filter and date range."
                  : "No enquiries match the selected filter and date range."
              }
            />
          </div>
        )}
      </div>

      {visibleEnquiries.length ? (
        <ListPaginationControls
          pagination={pagination}
          pageSizeOptions={pageSizeOptions}
          itemLabel="enquiries"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}

      {modalState?.kind === "enquiry" ? (
        <AdminEnquiryDetailModal
          enquiry={modalState.enquiry}
          getListingDetailHref={getListingDetailHref}
          onClose={() => setModalState(null)}
        />
      ) : null}

      {modalState?.kind === "replies" ? (
        <AdminReplyDetailModal
          enquiry={modalState.enquiry}
          onClose={() => setModalState(null)}
        />
      ) : null}
    </>
  );
}
