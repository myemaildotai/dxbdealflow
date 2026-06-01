"use client";

import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import type { BrokerOverviewAction, BrokerOverviewModel, BrokerOverviewSection } from "@/lib/broker-dashboard";
import {
  formatCurrency,
  formatDateTime,
  formatListingStatus,
  formatUserStatus,
  getFullName,
  statusClasses,
} from "@/lib/deal-utils";

type BrokerOverviewTabProps = {
  overview: BrokerOverviewModel;
  onSelectSection: (section: BrokerOverviewSection) => void;
};

const actionClasses: Record<BrokerOverviewAction["tone"], string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
};

function ActionButton({ action, onSelectSection }: { action: BrokerOverviewAction; onSelectSection: (section: BrokerOverviewSection) => void }) {
  const className = actionClasses[action.tone];

  if (action.disabled) {
    return (
      <button type="button" className={`${className} cursor-not-allowed opacity-60`} disabled aria-disabled="true">
        Unavailable
      </button>
    );
  }

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        Open
      </Link>
    );
  }

  if (action.section) {
    return (
      <button type="button" className={className} onClick={() => onSelectSection(action.section!)}>
        Review
      </button>
    );
  }

  return null;
}

export function BrokerOverviewTab({ overview, onSelectSection }: BrokerOverviewTabProps) {
  const canCreateListing = overview.credits.available > 0;
  const noCreditsMessage = "You have no credits left to create a new listing.";

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="panel p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Broker summary</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Account and market coverage</h2>
              <p className="mt-2 max-w-2xl text-sm text-gray-400">
                The overview is now driven from your actual broker profile, agency, coverage, credits, listings, enquiries, and chat activity.
              </p>
            </div>
            <span className={statusClasses(overview.status || "pending")}>{formatUserStatus(overview.status || "pending")}</span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="subtle-panel p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Broker</p>
              <p className="mt-2 text-lg font-semibold text-white">{overview.brokerName}</p>
              <p className="mt-1 text-sm text-gray-400">{overview.email || "Email not available"}</p>
              <p className="mt-1 text-sm text-gray-400">{overview.phone || "Phone not provided"}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-gray-400">Profile completeness</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#D4AF37]" style={{ width: `${overview.profileCompleteness}%` }} />
              </div>
              <p className="mt-2 text-sm text-gray-400">{overview.profileCompleteness}% of the broker profile fields used in this workspace are filled.</p>
            </div>

            <div className="subtle-panel p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Agency and compliance</p>
              <p className="mt-2 text-lg font-semibold text-white">{overview.agencyName || "Agency not linked"}</p>
              <p className="mt-1 text-sm text-gray-400">RERA BRN: {overview.reraBrn || "Not provided"}</p>
              <p className="mt-1 text-sm text-gray-400">Approved: {overview.approvedAt ? formatDateTime(overview.approvedAt) : "Not approved yet"}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-gray-400">WhatsApp</p>
              <p className="mt-1 text-sm text-gray-400">{overview.whatsappNumber || "Not provided"}</p>
            </div>

            <div className="subtle-panel p-4 sm:col-span-2 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Coverage</p>
                  <p className="mt-2 text-lg font-semibold text-white">{overview.speciality || "Speciality not set"}</p>
                  <p className="mt-1 text-sm text-gray-400">
                    {overview.experienceYears ? `${overview.experienceYears} years experience` : "Experience not set"}
                  </p>
                </div>
                <button type="button" className="btn-secondary" onClick={() => onSelectSection("profile")}>
                  Review Profile
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {overview.coveragePreview.length ? (
                  overview.coveragePreview.map((area) => (
                    <span key={area.id} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300">
                      {area.name}, {area.city}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No covered areas selected yet.</p>
                )}
                {overview.extraCoverageCount ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300">
                    +{overview.extraCoverageCount} more
                  </span>
                ) : null}
              </div>
            </div>

            <div className="subtle-panel p-4 sm:col-span-2 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Credits</p>
                  <p className="mt-2 text-lg font-semibold text-white">{overview.credits.available} available</p>
                  <p className="mt-1 text-sm text-gray-400">
                    {overview.credits.used} used out of {overview.credits.assigned} assigned
                  </p>
                </div>
                {canCreateListing ? (
                  <Link href="/post-listing" className="btn-primary">
                    New Listing
                  </Link>
                ) : (
                  <span title={noCreditsMessage}>
                    <button
                      type="button"
                      className="btn-primary cursor-not-allowed opacity-60"
                      disabled
                      aria-disabled="true"
                      aria-label={noCreditsMessage}
                    >
                      New Listing
                    </button>
                  </span>
                )}
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#D4AF37]" style={{ width: `${overview.credits.usagePercent}%` }} />
              </div>
              <p className="mt-2 text-sm text-gray-400">{overview.credits.usagePercent}% of assigned credits have already been consumed.</p>
            </div>
          </div>
        </section>

        <section className="panel p-4 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Priority queue</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Next actions based on current broker data</h2>
          <p className="mt-2 text-sm text-gray-400">Each action below is generated from live dashboard state instead of static overview content.</p>

          <div className="mt-6 space-y-3">
            {overview.actions.map((action) => (
              <div key={action.id} className="subtle-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">{action.title}</p>
                      {action.badge ? <span className="badge border-white/10 bg-white/5 text-gray-300">{action.badge}</span> : null}
                    </div>
                    <p className="mt-2 text-sm text-gray-400">{action.description}</p>
                  </div>
                  <ActionButton action={action} onSelectSection={onSelectSection} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Pipeline health</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Broker activity that needs attention</h2>
          </div>
          <p className="text-sm text-gray-400">
            Latest listing update: {overview.activity.latestListingUpdatedAt ? formatDateTime(overview.activity.latestListingUpdatedAt) : "No listings yet"}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="subtle-panel min-w-0 p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Open chat threads</p>
            <p className="mt-2 break-words text-2xl font-bold text-white sm:text-3xl">{overview.activity.openChats}</p>
            <p className="mt-1 break-words text-xs text-gray-400 sm:text-sm">{overview.activity.totalMessages} messages exchanged across listing conversations.</p>
          </div>
          <div className="subtle-panel min-w-0 p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Listings with conversations</p>
            <p className="mt-2 break-words text-2xl font-bold text-white sm:text-3xl">{overview.activity.listingsWithChats}</p>
            <p className="mt-1 break-words text-xs text-gray-400 sm:text-sm">Inventory that is already attracting broker-to-broker discussion.</p>
          </div>
          <div className="subtle-panel min-w-0 p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Pending moderation</p>
            <p className="mt-2 break-words text-2xl font-bold text-white sm:text-3xl">{overview.activity.pendingListings}</p>
            <p className="mt-1 break-words text-xs text-gray-400 sm:text-sm">Listings waiting for approval before they become active.</p>
          </div>
          <div className="subtle-panel min-w-0 p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">New enquiries</p>
            <p className="mt-2 break-words text-2xl font-bold text-white sm:text-3xl">{overview.activity.newEnquiries}</p>
            <p className="mt-1 break-words text-xs text-gray-400 sm:text-sm">
              {overview.activity.latestEnquiryAt ? `Latest lead received ${formatDateTime(overview.activity.latestEnquiryAt)}` : "No public leads yet."}
            </p>
          </div>
        </div>

        {overview.activity.attentionListings ? (
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            {overview.activity.attentionListings} listing{overview.activity.attentionListings === 1 ? " needs" : "s need"} broker follow-up because they are inactive, rejected, or expired.
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="panel p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Recent listings</p>
              <h2 className="mt-2 text-xl font-bold text-white">Latest inventory changes</h2>
            </div>
            <button type="button" className="btn-secondary" onClick={() => onSelectSection("listings")}>
              View All
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {overview.recent.listings.length ? (
              overview.recent.listings.map((listing) => (
                <div key={listing.id} className="subtle-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{listing.title}</p>
                      <p className="mt-1 text-sm text-gray-400">
                        {listing.area?.name || "Area pending"} | {formatListingStatus(listing.status)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-white">{formatCurrency(listing.price)}</p>
                  </div>
                  <p className="mt-3 text-sm text-gray-400">Updated {formatDateTime(listing.updated_at)}</p>
                </div>
              ))
            ) : (
              <EmptyState title="No listings yet" description="Create your first listing once credits are available." />
            )}
          </div>
        </section>

        <section className="panel p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Recent enquiries</p>
              <h2 className="mt-2 text-xl font-bold text-white">Latest public leads</h2>
            </div>
            <button type="button" className="btn-secondary" onClick={() => onSelectSection("enquiries")}>
              View All
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {overview.recent.enquiries.length ? (
              overview.recent.enquiries.map((enquiry) => (
                <div key={enquiry.id} className="subtle-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{enquiry.contact_name}</p>
                      <p className="mt-1 text-sm text-gray-400">{enquiry.contact_email}</p>
                    </div>
                    <span className={statusClasses(enquiry.lead_status)}>{enquiry.lead_status}</span>
                  </div>
                  <p className="mt-3 text-sm text-gray-400">{enquiry.listing?.title || "General enquiry"}</p>
                  <p className="mt-2 text-sm text-gray-400">Received {formatDateTime(enquiry.created_at)}</p>
                </div>
              ))
            ) : (
              <EmptyState title="No enquiries yet" description="Public enquiries from listing pages will show up here." />
            )}
          </div>
        </section>

        <section className="panel p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-orange">Recent chats</p>
              <h2 className="mt-2 text-xl font-bold text-white">Latest inbox activity</h2>
            </div>
            <button type="button" className="btn-secondary" onClick={() => onSelectSection("chats")}>
              View All
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {overview.recent.chats.length ? (
              overview.recent.chats.map((group) => {
                const latestConversation = group.conversations[0];
                const latestMessage = latestConversation?.lastMessage;
                const participantName = latestConversation?.participant
                  ? getFullName(latestConversation.participant.first_name, latestConversation.participant.last_name)
                  : "Broker";

                return (
                  <div key={group.listing.id} className="subtle-panel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{group.listing.title}</p>
                      <p className="mt-1 text-sm text-gray-400">{participantName}</p>
                      </div>
                      {latestMessage?.created_at ? (
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-400">{formatDateTime(latestMessage.created_at)}</p>
                      ) : null}
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-gray-400">{latestMessage?.content || "No messages yet."}</p>
                  </div>
                );
              })
            ) : (
              <EmptyState title="No chats yet" description="Inbox activity will appear here once conversations start." />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

