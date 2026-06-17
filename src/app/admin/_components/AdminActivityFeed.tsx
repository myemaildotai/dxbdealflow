"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ResponsiveRowActionsMenu, type ResponsiveRowAction } from "@/components/ResponsiveRowActionsMenu";
import { getActivityCategory, type ActivityCategoryId } from "@/lib/activity-categories";
import type {
  ActivityLog,
  Agency,
  Area,
  BrokerProfile,
  CreditSummary,
  Lead,
  Requirement,
  RequirementMatch,
} from "@/lib/deal-types";
import {
  cn,
  formatCurrency,
  formatDateTime,
  formatDealType,
  formatListingDisplayStatus,
  formatPropertyType,
  formatRequirementMatchStatus,
  formatRequirementStatus,
  formatRequirementUrgency,
  formatUserStatus,
  getFullName,
} from "@/lib/deal-utils";
import { formatRequirementBedrooms } from "@/lib/requirements";

type ActivityActionKind = "navigate" | "changes" | "enquiry" | "requirement";
export type AdminActivityListingSummary = {
  id: string;
  title?: string | null;
  property_type?: string | null;
  price?: number | null;
  status?: string | null;
  deleted_at?: string | null;
  bedrooms?: number | null;
  area?: { name?: string | null; city?: string | null } | null;
};
export type AdminActivityUserSummary = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  agency?: Agency | null;
  brokerProfile?: BrokerProfile | null;
  credits?: CreditSummary | null;
};
export type AdminActivityRequirementSummary = Partial<Requirement> & Pick<Requirement, "id">;
type ActivityRequirementMatchSummary = RequirementMatch;

type ActivityMetaItem = {
  label: string;
  value: string;
};

type ActivityChangeItem = {
  field: string;
  label: string;
  before?: string;
  after?: string;
};

type ActivityAction = {
  kind: ActivityActionKind;
  label: string;
  href?: string | null;
};

type ActivityEnquiryDetails = {
  title: string;
  message: string;
  detailRows: ActivityMetaItem[];
  listingHref: string | null;
};

type ActivityRequirementDetails = {
  title: string;
  description: string;
  detailRows: ActivityMetaItem[];
  matchRows: ActivityMetaItem[];
};

export type ResolvedAdminActivity = ActivityLog & {
  actionLabel: string;
  category: ActivityCategoryId;
  categoryLabel: string;
  targetEntityLabel: string;
  targetTitle: string;
  targetSubtitle: string;
  actorName: string;
  actorSubtitle: string;
  summary: string;
  metaRows: ActivityMetaItem[];
  changes: ActivityChangeItem[];
  enquiryDetails: ActivityEnquiryDetails | null;
  requirementDetails: ActivityRequirementDetails | null;
  modalNavigationAction: ActivityAction | null;
  actions: ActivityAction[];
};

type ResolveAdminActivityLogContext = {
  areaMap: Map<string, Area>;
  getListingDetailHref: (listingId: string) => string;
  listingMap: Map<string, AdminActivityListingSummary>;
  requirementMap: Map<string, AdminActivityRequirementSummary>;
  userMap: Map<string, AdminActivityUserSummary>;
};

const ACTIVITY_ACTION_BUTTON_CLASS =
  "inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#d9dfeb] bg-white px-3.5 text-[14px] font-semibold text-[#33415f] shadow-[0_10px_20px_rgba(35,41,70,0.08)] transition hover:border-[#cad3e4] hover:bg-[#f8faff] xl:min-h-[42px] xl:px-4";

const ACTION_LABELS: Record<string, string> = {
  broker_application_approved: "Broker Application Approved",
  broker_application_rejected: "Broker Application Rejected",
  broker_application_submitted: "Broker Application Submitted",
  broker_profile_updated: "Broker Profile Updated",
  broker_reactivated: "Broker Reactivated",
  broker_suspended: "Broker Suspended",
  credits_assigned: "Credits Assigned",
  lead_created: "Lead Created",
  listing_approved: "Listing Approved",
  listing_created: "Listing Created",
  listing_deactivated: "Listing Deactivated",
  listing_deleted: "Listing Deleted",
  listing_reactivated: "Listing Reactivated",
  listing_rejected: "Listing Rejected",
  listing_updated: "Listing Updated",
  maintenance_mode_disabled: "Maintenance Mode Disabled",
  maintenance_mode_enabled: "Maintenance Mode Enabled",
  public_enquiry_submitted: "Public Enquiry Submitted",
  requirement_activated: "Requirement Activated",
  requirement_created: "Requirement Created",
  requirement_deactivated: "Requirement Deactivated",
  requirement_deleted: "Requirement Deleted",
  requirement_match_status_updated: "Requirement Match Status Updated",
  requirement_match_submitted: "Requirement Match Submitted",
  requirement_matched: "Requirement Matched",
  requirement_updated: "Requirement Updated",
};

const FIELD_LABELS: Record<string, string> = {
  agency_name: "Agency Name",
  area_id: "Area",
  area: "Area",
  bedrooms: "Bedrooms",
  budget_max: "Maximum Budget",
  budget_min: "Minimum Budget",
  co_broke_percent: "Co-broke Percent",
  covered_area_ids: "Covered Areas",
  deactivated_by: "Deactivated By",
  deal_type: "Deal Type",
  description: "Description",
  developer: "Developer",
  experience_years: "Experience",
  instagram_profile: "Instagram Profile",
  handover_date: "Handover Date",
  linkedin_profile: "LinkedIn Profile",
  listing_documents: "Documents",
  listing_images: "Images",
  notes: "Notes",
  payment_plan: "Payment Plan",
  payment_terms: "Payment Terms",
  price: "Price",
  profile_photo: "Profile Photo",
  property_type: "Property Type",
  requirement_match_status: "Match Status",
  rera_brn: "RERA/BRN",
  share_latest_deals: "Share Latest Deals",
  size_sqft: "Size",
  status: "Status",
  speciality: "Speciality",
  title: "Title",
  timeline: "Timeline",
  urgency: "Urgency",
  whatsapp_number: "WhatsApp Number",
  yield_percent: "Yield",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMetadata(log: ActivityLog) {
  return isRecord(log.metadata) ? log.metadata : {};
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getMetadataString(metadata: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = getString(metadata[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

function getMetadataNumber(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  const numericValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numericValue) ? numericValue : null;
}

function humanizeLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatActionLabel(action: string) {
  return ACTION_LABELS[action] || humanizeLabel(action);
}

function formatFieldLabel(field: string) {
  return FIELD_LABELS[field] || humanizeLabel(field);
}

function formatPersonName(user: AdminActivityUserSummary | null | undefined, fallback: string) {
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  return name || user?.email || fallback;
}

function getActivityCategoryLabel(log: ActivityLog, category: ActivityCategoryId) {
  if (log.target_table === "leads") {
    return log.action === "public_enquiry_submitted" ? "Public Enquiry" : "Lead";
  }

  const labelMap: Record<ActivityCategoryId, string> = {
    listings: "Listings",
    brokers: "Brokers",
    credits: "Credits",
    requirements: "Requirements",
    system: "System",
  };

  return labelMap[category];
}

function getTargetEntityLabel(log: ActivityLog) {
  if (log.target_table === "listings") return "Listing";
  if (log.target_table === "users" || log.target_table === "broker_profiles") return "Broker";
  if (log.target_table === "broker_credits") return "Broker Credits";
  if (log.target_table === "leads") return log.action === "public_enquiry_submitted" ? "Public Enquiry" : "Lead";
  if (log.target_table === "requirements") return "Requirement";
  if (log.target_table === "requirement_matches") return "Requirement Match";
  if (log.target_table === "settings") return "System Setting";
  return "System";
}

function formatPreferredChannel(value: string | null | undefined) {
  switch (value) {
    case "both":
      return "Email and WhatsApp";
    case "whatsapp":
      return "WhatsApp";
    case "email":
      return "Email";
    default:
      return "Not provided";
  }
}

function formatMaybe(value: string | null | undefined) {
  return value?.trim() || "Not provided";
}

function formatSafeDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatDateTime(value);
}

function formatActivityValue(field: string, value: unknown, areaMap: Map<string, Area>): string {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  if (field === "area_id" && typeof value === "string") {
    return areaMap.get(value)?.name || value;
  }

  if (field === "covered_area_ids" && Array.isArray(value)) {
    return value.length
      ? value.map((entry) => (typeof entry === "string" ? areaMap.get(entry)?.name || entry : String(entry))).join(", ")
      : "None";
  }

  if (field === "profile_photo") {
    return value ? "Profile photo uploaded" : "No profile photo";
  }

  if (field === "experience_years") {
    const numericValue = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numericValue) ? `${numericValue} year${numericValue === 1 ? "" : "s"}` : String(value);
  }

  if (field === "price" || field === "budget_min" || field === "budget_max") {
    const numericValue = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numericValue) ? formatCurrency(numericValue) : String(value);
  }

  if (field === "property_type") {
    return formatPropertyType(String(value));
  }

  if (field === "deal_type") {
    return formatDealType(String(value));
  }

  if (field === "urgency") {
    return formatRequirementUrgency(String(value));
  }

  if (field === "status") {
    return formatRequirementStatus(String(value));
  }

  if (field === "requirement_match_status") {
    return formatRequirementMatchStatus(String(value));
  }

  if (field === "bedrooms") {
    const numericValue = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(numericValue)) {
      return `${numericValue}BR`;
    }

    return formatRequirementBedrooms(String(value)) || String(value);
  }

  if (field === "size_sqft") {
    const numericValue = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numericValue) ? `${new Intl.NumberFormat("en-US").format(numericValue)} sqft` : String(value);
  }

  if (field === "yield_percent" || field === "co_broke_percent") {
    const numericValue = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numericValue) ? `${numericValue}%` : String(value);
  }

  if (field.includes("date") || field.endsWith("_at")) {
    return typeof value === "string" ? formatSafeDateTime(value) : String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.length ? value.map((entry) => formatActivityValue(field, entry, areaMap)).join(", ") : "None";
  }

  if (isRecord(value)) {
    const readableEntries = Object.entries(value)
      .flatMap(([entryKey, entryValue]): string[] => {
        if (entryValue === null || entryValue === undefined || isRecord(entryValue) || Array.isArray(entryValue)) {
          return [];
        }

        return [`${formatFieldLabel(entryKey)}: ${String(entryValue)}`];
      })
      .slice(0, 2);

    return readableEntries.length ? readableEntries.join(", ") : "Updated value";
  }

  return String(value);
}

function getCurrentBrokerProfileValue(field: string, user: AdminActivityUserSummary | null, areaMap: Map<string, Area>) {
  if (!user) {
    return undefined;
  }

  switch (field) {
    case "agency_name":
      return formatActivityValue(field, user.agency?.name || null, areaMap);
    case "profile_photo":
      return formatActivityValue(field, user.brokerProfile?.profile_photo || null, areaMap);
    case "speciality":
      return formatActivityValue(field, user.brokerProfile?.speciality || null, areaMap);
    case "experience_years":
      return formatActivityValue(field, user.brokerProfile?.experience_years ?? null, areaMap);
    case "whatsapp_number":
      return formatActivityValue(field, user.brokerProfile?.whatsapp_number || null, areaMap);
    case "instagram_profile":
      return formatActivityValue(field, user.brokerProfile?.instagram_profile || null, areaMap);
    case "linkedin_profile":
      return formatActivityValue(field, user.brokerProfile?.linkedin_profile || null, areaMap);
    case "bio":
      return formatActivityValue(field, user.brokerProfile?.bio || null, areaMap);
    case "share_latest_deals":
      return formatActivityValue(field, user.brokerProfile?.share_latest_deals ?? null, areaMap);
    case "covered_area_ids":
      return formatActivityValue(field, user.brokerProfile?.covered_area_ids || [], areaMap);
    default:
      return undefined;
  }
}

function getActivityChanges(
  metadata: Record<string, unknown>,
  areaMap: Map<string, Area>,
  options: {
    action: string;
    targetUser: AdminActivityUserSummary | null;
  }
) {
  const changedFields = metadata.changedFields;
  if (!Array.isArray(changedFields)) {
    return [];
  }

  return changedFields.flatMap((entry): ActivityChangeItem[] => {
    if (typeof entry === "string") {
      return [
        {
          field: entry,
          label: formatFieldLabel(entry),
          after:
            options.action === "broker_profile_updated"
              ? getCurrentBrokerProfileValue(entry, options.targetUser, areaMap)
              : undefined,
        },
      ];
    }

    if (!isRecord(entry)) {
      return [];
    }

    const field = getString(entry.field) || getString(entry.name);
    if (!field) {
      return [];
    }

    const previousValue = entry.previousValue ?? entry.previous ?? entry.oldValue ?? entry.before ?? entry.from ?? null;
    const nextValue = entry.nextValue ?? entry.next ?? entry.newValue ?? entry.after ?? entry.to ?? null;

    return [
      {
        field,
        label: formatFieldLabel(field),
        before: formatActivityValue(field, previousValue, areaMap),
        after: formatActivityValue(field, nextValue, areaMap),
      },
    ];
  });
}

function getListingId(log: ActivityLog, metadata: Record<string, unknown>) {
  if (log.target_table === "listings" && log.target_id) {
    return log.target_id;
  }

  return log.lead?.listing_id || getMetadataString(metadata, "listingId", "listing_id");
}

function getListingSummary(log: ActivityLog, metadata: Record<string, unknown>, context: ResolveAdminActivityLogContext) {
  const listingId = getListingId(log, metadata);
  if (!listingId) {
    return null;
  }

  return (
    context.listingMap.get(listingId) ||
    log.listing ||
    (log.lead?.listing
      ? {
          ...log.lead.listing,
          area: null,
          deleted_at: null,
        }
      : null)
  );
}

function getListingAreaLabel(listing: AdminActivityListingSummary | null | undefined) {
  return listing?.area?.name || "Area pending";
}

function getListingSubtitle(listing: AdminActivityListingSummary | null | undefined) {
  if (!listing) {
    return "Listing details unavailable";
  }

  return [
    listing.status ? formatListingDisplayStatus(listing.status, listing.deleted_at) : null,
    listing.price !== null && listing.price !== undefined ? formatCurrency(listing.price) : null,
    getListingAreaLabel(listing),
  ]
    .filter(Boolean)
    .join(" | ");
}

function getListingMetaRows(listing: AdminActivityListingSummary | null | undefined) {
  if (!listing) {
    return [];
  }

  return [
    { label: "Property Type", value: listing.property_type ? formatPropertyType(listing.property_type) : "Unknown" },
    { label: "Area", value: getListingAreaLabel(listing) },
    { label: "Price", value: listing.price !== null && listing.price !== undefined ? formatCurrency(listing.price) : "TBD" },
  ];
}

function getRequirementMatchSummary(log: ActivityLog): ActivityRequirementMatchSummary | null {
  return log.requirementMatch || null;
}

function getRequirementId(
  log: ActivityLog,
  metadata: Record<string, unknown>,
  requirementMatch: ActivityRequirementMatchSummary | null
) {
  if (log.requirement?.id) {
    return log.requirement.id;
  }

  if (log.target_table === "requirements" && log.target_id) {
    return log.target_id;
  }

  return (
    requirementMatch?.requirement_id ||
    log.lead?.requirement_id ||
    getMetadataString(metadata, "requirementId", "requirement_id")
  );
}

function getRequirementSummary(
  log: ActivityLog,
  metadata: Record<string, unknown>,
  context: ResolveAdminActivityLogContext,
  requirementMatch: ActivityRequirementMatchSummary | null
) {
  const requirementId = getRequirementId(log, metadata, requirementMatch);

  if (!requirementId) {
    return null;
  }

  return context.requirementMap.get(requirementId) || log.requirement || requirementMatch?.requirement || null;
}

function getRequirementLabel(requirement: { title?: string | null; area?: string | null } | null | undefined, metadata?: Record<string, unknown>) {
  return (
    requirement?.title ||
    getMetadataString(metadata || {}, "requirementTitle", "requirement_title", "title") ||
    `Requirement in ${requirement?.area || "preferred areas"}`
  );
}

function getRequirementStatusValue(requirement: AdminActivityRequirementSummary | null | undefined) {
  if (!requirement) {
    return null;
  }

  if (requirement.status) {
    return requirement.status;
  }

  if (requirement.deleted_at) {
    return "closed";
  }

  if (typeof requirement.is_active === "boolean") {
    return requirement.is_active ? "active" : "inactive";
  }

  return null;
}

function getRequirementBudgetLine(requirement: AdminActivityRequirementSummary | null | undefined) {
  if (!requirement) {
    return "Budget unavailable";
  }

  if (requirement.budget_min !== null && requirement.budget_min !== undefined && requirement.budget_max !== null && requirement.budget_max !== undefined) {
    return `${formatCurrency(requirement.budget_min)} - ${formatCurrency(requirement.budget_max)}`;
  }

  if (requirement.budget_max !== null && requirement.budget_max !== undefined) {
    return `Up to ${formatCurrency(requirement.budget_max)}`;
  }

  if (requirement.budget_min !== null && requirement.budget_min !== undefined) {
    return `From ${formatCurrency(requirement.budget_min)}`;
  }

  return "Budget flexible";
}

function getRequirementSubtitle(requirement: AdminActivityRequirementSummary | null | undefined) {
  if (!requirement) {
    return "Requirement details unavailable";
  }

  return [
    getRequirementStatusValue(requirement) ? formatRequirementStatus(getRequirementStatusValue(requirement)) : null,
    requirement.property_type ? formatPropertyType(requirement.property_type) : null,
    requirement.area || "Area pending",
    getRequirementBudgetLine(requirement),
  ]
    .filter(Boolean)
    .join(" | ");
}

function getRequirementMetaRows(requirement: AdminActivityRequirementSummary | null | undefined) {
  if (!requirement) {
    return [];
  }

  return [
    { label: "Property Type", value: requirement.property_type ? formatPropertyType(requirement.property_type) : "Unknown" },
    { label: "Deal Type", value: requirement.deal_type ? formatDealType(requirement.deal_type) : "Unknown" },
    { label: "Budget", value: getRequirementBudgetLine(requirement) },
    { label: "Area", value: requirement.area || "Flexible area" },
  ];
}

function getRequirementDetails(
  log: ActivityLog,
  metadata: Record<string, unknown>,
  requirement: AdminActivityRequirementSummary | null,
  requirementMatch: ActivityRequirementMatchSummary | null
): ActivityRequirementDetails | null {
  const requirementId = getRequirementId(log, metadata, requirementMatch);
  if (!requirement && !requirementId) {
    return null;
  }

  const ownerName = requirement?.owner
    ? getFullName(requirement.owner.first_name, requirement.owner.last_name) || requirement.owner.email || "Broker unavailable"
    : "Broker unavailable";
  const detailRows: ActivityMetaItem[] = [
    { label: "Requirement", value: requirement ? getRequirementLabel(requirement, metadata) : getRequirementLabel(null, metadata) },
    { label: "Requirement ID", value: requirementId || "Not provided" },
    { label: "Broker", value: ownerName },
    { label: "Broker Email", value: requirement?.owner?.email || "Email unavailable" },
    { label: "Property Type", value: requirement?.property_type ? formatPropertyType(requirement.property_type) : "Not provided" },
    { label: "Deal Type", value: requirement?.deal_type ? formatDealType(requirement.deal_type) : "Not provided" },
    { label: "Bedrooms", value: formatRequirementBedrooms(requirement?.bedrooms) || "Open" },
    { label: "Budget", value: getRequirementBudgetLine(requirement) },
    { label: "Area", value: requirement?.area || "Flexible area" },
    { label: "Urgency", value: requirement?.urgency ? formatRequirementUrgency(requirement.urgency) : "Not provided" },
    { label: "Status", value: getRequirementStatusValue(requirement) ? formatRequirementStatus(getRequirementStatusValue(requirement)) : "Not provided" },
  ];

  if (requirement?.created_at) {
    detailRows.push({ label: "Created", value: formatSafeDateTime(requirement.created_at) });
  }

  if (requirement?.updated_at) {
    detailRows.push({ label: "Updated", value: formatSafeDateTime(requirement.updated_at) });
  }

  const matchRows: ActivityMetaItem[] = requirementMatch
    ? [
        {
          label: "Submitted By",
          value: requirementMatch.sender
            ? getFullName(requirementMatch.sender.first_name, requirementMatch.sender.last_name) || requirementMatch.sender.email || "Broker"
            : "Broker unavailable",
        },
        { label: "Listing", value: requirementMatch.listing?.title || getMetadataString(metadata, "listingTitle", "listing_title") || "Listing unavailable" },
        { label: "Match Status", value: formatRequirementMatchStatus(requirementMatch.status || getMetadataString(metadata, "nextStatus", "status")) },
        { label: "Submitted", value: formatSafeDateTime(requirementMatch.created_at || log.created_at) },
        { label: "Message", value: getMessagePreview(requirementMatch.message || getMetadataString(metadata, "message"), 180) },
      ]
    : [];

  if (!requirementMatch && log.action === "requirement_match_status_updated") {
    matchRows.push(
      { label: "Match ID", value: getMetadataString(metadata, "matchId", "match_id") || log.target_id || "Not provided" },
      { label: "Previous Status", value: formatRequirementMatchStatus(getMetadataString(metadata, "previousStatus", "previous_status")) },
      { label: "Next Status", value: formatRequirementMatchStatus(getMetadataString(metadata, "nextStatus", "next_status")) }
    );
  }

  return {
    title: requirement ? getRequirementLabel(requirement, metadata) : getRequirementLabel(null, metadata),
    description: requirement?.description || getMetadataString(metadata, "message") || "Requirement metadata is partially unavailable.",
    detailRows,
    matchRows,
  };
}

function getLeadContactDetails(log: ActivityLog, metadata: Record<string, unknown>) {
  const lead = log.lead;

  return {
    contactName: lead?.contact_name || getMetadataString(metadata, "contactName", "contact_name") || "Public user",
    contactEmail: lead?.contact_email || getMetadataString(metadata, "contactEmail", "contact_email") || null,
    contactPhone: lead?.contact_phone || getMetadataString(metadata, "contactPhone", "contact_phone") || null,
    message: lead?.message || getMetadataString(metadata, "message") || null,
    preferredChannel: lead?.preferred_channel || getMetadataString(metadata, "preferredChannel", "preferred_channel") || null,
    submittedAt: lead?.created_at || getMetadataString(metadata, "submittedAt", "submitted_at") || log.created_at,
  };
}

function getMessagePreview(message: string | null | undefined, maxLength = 130) {
  const resolvedMessage = message?.trim() || "No message provided.";
  if (resolvedMessage.length <= maxLength) {
    return resolvedMessage;
  }

  return `${resolvedMessage.slice(0, maxLength).trimEnd()}...`;
}

function getLeadTypeLabel(lead: Lead | null | undefined) {
  return lead?.lead_type ? humanizeLabel(lead.lead_type) : "Not provided";
}

function getLeadStatusLabel(lead: Lead | null | undefined) {
  return lead?.lead_status ? humanizeLabel(lead.lead_status) : "Not provided";
}

function getEnquiryDetails(
  log: ActivityLog,
  metadata: Record<string, unknown>,
  listing: AdminActivityListingSummary | null,
  listingHref: string | null
): ActivityEnquiryDetails | null {
  if (log.target_table !== "leads") {
    return null;
  }

  const contact = getLeadContactDetails(log, metadata);
  const detailRows: ActivityMetaItem[] = [
    { label: "Full Name", value: contact.contactName },
    { label: "Email", value: formatMaybe(contact.contactEmail) },
    { label: "Phone", value: formatMaybe(contact.contactPhone) },
    { label: "Preferred Channel", value: formatPreferredChannel(contact.preferredChannel) },
    { label: "Related Listing", value: listing?.title || "Listing unavailable" },
    { label: "Submitted", value: formatSafeDateTime(contact.submittedAt) },
    { label: "Lead Type", value: getLeadTypeLabel(log.lead) },
    { label: "Lead Status", value: getLeadStatusLabel(log.lead) },
  ];

  if (log.lead?.email_triggered_at) {
    detailRows.push({ label: "Email Triggered", value: formatSafeDateTime(log.lead.email_triggered_at) });
  }

  if (log.lead?.whatsapp_triggered_at) {
    detailRows.push({ label: "WhatsApp Triggered", value: formatSafeDateTime(log.lead.whatsapp_triggered_at) });
  }

  return {
    title: log.action === "public_enquiry_submitted" ? "Public Enquiry Details" : "Lead Details",
    message: contact.message?.trim() || "No message provided.",
    detailRows,
    listingHref,
  };
}

function resolveActor(log: ActivityLog, metadata: Record<string, unknown>, enquiryDetails: ActivityEnquiryDetails | null) {
  if (log.target_table === "leads" && !log.actor) {
    const contact = getLeadContactDetails(log, metadata);
    const contactParts = [
      contact.contactEmail || null,
      contact.contactPhone ? `Phone ${contact.contactPhone}` : null,
    ].filter(Boolean);

    return {
      actorName: contact.contactName,
      actorSubtitle: contactParts.join(" | ") || "Contact details unavailable",
    };
  }

  if (log.actor) {
    const actorType = log.actor.role === "admin" ? "Admin" : "Broker";

    return {
      actorName: formatPersonName(log.actor, actorType),
      actorSubtitle: log.actor.email || "Email unavailable",
    };
  }

  if (enquiryDetails) {
    const name = enquiryDetails.detailRows.find((row) => row.label === "Full Name")?.value || "Public user";
    const email = enquiryDetails.detailRows.find((row) => row.label === "Email")?.value;

    return {
      actorName: name,
      actorSubtitle: email && email !== "Not provided" ? email : "Contact details unavailable",
    };
  }

  return {
    actorName: "System",
    actorSubtitle: "Automated platform event",
  };
}

function buildDefaultSummary(actionLabel: string, actorName: string, targetEntityLabel: string) {
  return `${actorName} performed ${actionLabel.toLowerCase()} on ${targetEntityLabel.toLowerCase()}.`;
}

function getNotesMetaRows(metadata: Record<string, unknown>) {
  const notes = getMetadataString(metadata, "notes");
  return notes ? [{ label: "Notes", value: notes }] : [];
}

function getActivitySummary({
  actionLabel,
  actorName,
  contactName,
  creditsToAdd,
  listing,
  log,
  requirement,
  requirementMatch,
  targetEntityLabel,
  targetTitle,
}: {
  actionLabel: string;
  actorName: string;
  contactName?: string | null;
  creditsToAdd?: number | null;
  listing?: AdminActivityListingSummary | null;
  log: ActivityLog;
  requirement?: AdminActivityRequirementSummary | null;
  requirementMatch?: ActivityRequirementMatchSummary | null;
  targetEntityLabel: string;
  targetTitle: string;
}) {
  const listingTitle = listing?.title || "a listing";
  const requirementTitle = requirement ? getRequirementLabel(requirement) : targetTitle || "a requirement";
  const matchedListingTitle = requirementMatch?.listing?.title || "a listing";

  switch (log.action) {
    case "listing_created":
      return `${actorName} created a new listing.`;
    case "listing_updated":
      return `${actorName} updated ${listingTitle}.`;
    case "listing_deleted":
      return `${actorName} deleted ${listingTitle}.`;
    case "listing_approved":
      return `${actorName} approved ${listingTitle}.`;
    case "listing_rejected":
      return `${actorName} rejected ${listingTitle}.`;
    case "listing_deactivated":
      return `${actorName} deactivated ${listingTitle}.`;
    case "listing_reactivated":
      return `${actorName} reactivated ${listingTitle}.`;
    case "public_enquiry_submitted":
      return `${contactName || "A public user"} submitted an enquiry${listing?.title ? ` for ${listing.title}` : ""}.`;
    case "lead_created":
      return `${actorName} created a lead${listing?.title ? ` for ${listing.title}` : ""}.`;
    case "broker_application_submitted":
      return `${actorName} submitted a broker application.`;
    case "broker_application_approved":
      return `${actorName} approved ${targetTitle}.`;
    case "broker_application_rejected":
      return `${actorName} rejected ${targetTitle}.`;
    case "broker_suspended":
      return `${actorName} suspended ${targetTitle}.`;
    case "broker_reactivated":
      return `${actorName} reactivated ${targetTitle}.`;
    case "broker_profile_updated":
      return `${actorName} updated broker profile information.`;
    case "credits_assigned":
      return `${actorName} assigned ${creditsToAdd ?? "new"} listing credit${creditsToAdd === 1 ? "" : "s"} to ${targetTitle}.`;
    case "requirement_created":
      return `${actorName} created ${requirementTitle}.`;
    case "requirement_updated":
      return `${actorName} updated ${requirementTitle}.`;
    case "requirement_activated":
      return `${actorName} activated ${requirementTitle}.`;
    case "requirement_deactivated":
      return `${actorName} deactivated ${requirementTitle}.`;
    case "requirement_deleted":
      return `${actorName} deleted ${requirementTitle}.`;
    case "requirement_match_submitted":
    case "requirement_matched":
      return `${actorName} submitted ${matchedListingTitle} for ${requirementTitle}.`;
    case "requirement_match_status_updated":
      return `${actorName} updated the match status for ${requirementTitle}.`;
    case "maintenance_mode_enabled":
      return `${actorName} enabled maintenance mode.`;
    case "maintenance_mode_disabled":
      return `${actorName} disabled maintenance mode.`;
    default:
      return buildDefaultSummary(actionLabel, actorName, targetEntityLabel);
  }
}

export function resolveAdminActivityLog(
  log: ActivityLog,
  context: ResolveAdminActivityLogContext
): ResolvedAdminActivity {
  const metadata = getMetadata(log);
  const category = getActivityCategory(log);
  const categoryLabel = getActivityCategoryLabel(log, category);
  const actionLabel = formatActionLabel(log.action);
  const targetEntityLabel = getTargetEntityLabel(log);
  const listing = getListingSummary(log, metadata, context);
  const listingId = getListingId(log, metadata);
  const listingHref = listingId ? context.getListingDetailHref(listingId) : null;
  const requirementMatch = getRequirementMatchSummary(log);
  const requirement = getRequirementSummary(log, metadata, context, requirementMatch);
  const requirementId = getRequirementId(log, metadata, requirementMatch);
  const targetUserById =
    (log.target_table === "users" || log.target_table === "broker_credits") && log.target_id
      ? context.userMap.get(log.target_id) || log.targetUser || null
      : null;
  const targetUserFromActor =
    log.target_table === "broker_profiles"
      ? log.actor?.id
        ? context.userMap.get(log.actor.id) || log.targetUser || log.actor
        : log.targetUser || null
      : null;
  const targetUser: AdminActivityUserSummary | null = targetUserById || targetUserFromActor || null;
  const enquiryDetails = getEnquiryDetails(log, metadata, listing, listingHref);
  const requirementDetails = getRequirementDetails(log, metadata, requirement, requirementMatch);
  const { actorName, actorSubtitle } = resolveActor(log, metadata, enquiryDetails);
  const changes = getActivityChanges(metadata, context.areaMap, {
    action: log.action,
    targetUser,
  });
  const creditsToAdd = getMetadataNumber(metadata, "creditsToAdd");

  let targetTitle = "System event";
  let targetSubtitle = log.target_table ? `Table: ${log.target_table}` : "No linked record";
  let targetHref: string | null = null;
  let metaRows: ActivityMetaItem[] = getNotesMetaRows(metadata);

  if (listing) {
    targetTitle = listing.title || "Listing details unavailable";
    targetSubtitle = getListingSubtitle(listing);
    targetHref = listingHref;
  } else if (log.target_table === "listings" && log.target_id) {
    targetTitle = "Listing details unavailable";
    targetSubtitle = `ID: ${log.target_id}`;
    targetHref = listingHref;
  } else if (log.target_table === "leads") {
    const contact = getLeadContactDetails(log, metadata);
    targetTitle = "Public enquiry";
    targetSubtitle = `Preferred contact: ${formatPreferredChannel(contact.preferredChannel)}`;
    targetHref = listingHref;
  } else if (targetUser) {
    const userType = targetUser.role === "admin" ? "Admin" : "Broker";
    targetTitle = log.target_table === "broker_credits" ? `${formatPersonName(targetUser, userType)} credits` : formatPersonName(targetUser, userType);
    targetSubtitle = [
      targetUser.email || null,
      targetUser.status ? formatUserStatus(targetUser.status) : null,
    ]
      .filter(Boolean)
      .join(" | ") || "No extra details";
    targetHref = targetUser.role === "broker" && targetUser.id ? `/admin/brokers/${targetUser.id}` : null;
  } else if (requirement) {
    targetTitle = getRequirementLabel(requirement, metadata);
    targetSubtitle = getRequirementSubtitle(requirement);
  } else if (log.target_table === "requirements" || log.target_table === "requirement_matches" || requirementId) {
    targetTitle = getRequirementLabel(null, metadata);
    targetSubtitle = requirementId ? `ID: ${requirementId}` : "No linked requirement";
  } else if (log.target_table === "settings") {
    const settingKey = getMetadataString(metadata, "key");
    targetTitle = settingKey ? humanizeLabel(settingKey) : "Platform setting";
    targetSubtitle = "Setting update";
  }

  if (log.action === "listing_created" && listing) {
    metaRows = [...getListingMetaRows(listing), ...metaRows];
  }

  if (log.action === "requirement_created" && requirement) {
    metaRows = [...getRequirementMetaRows(requirement), ...metaRows];
  }

  if (log.action === "public_enquiry_submitted" || log.action === "lead_created") {
    const contact = getLeadContactDetails(log, metadata);
    metaRows = [
      { label: "Email", value: formatMaybe(contact.contactEmail) },
      { label: "Phone", value: formatMaybe(contact.contactPhone) },
      { label: "Message", value: getMessagePreview(contact.message) },
      ...metaRows,
    ];
  }

  if (log.action === "credits_assigned") {
    metaRows = [{ label: "Credits Added", value: creditsToAdd === null ? "Not provided" : String(creditsToAdd) }, ...metaRows];
  }

  if ((log.action === "listing_updated" || log.action === "broker_profile_updated" || log.action === "requirement_updated") && changes.length) {
    metaRows = [{ label: "Changes", value: `${changes.length} field${changes.length === 1 ? "" : "s"} updated` }, ...metaRows];
  }

  const contact = getLeadContactDetails(log, metadata);
  const summary = getActivitySummary({
    actionLabel,
    actorName,
    contactName: contact.contactName,
    creditsToAdd,
    listing,
    log,
    requirement,
    requirementMatch,
    targetEntityLabel,
    targetTitle,
  });

  const actions: ActivityAction[] = [];
  const targetNavigationAction: ActivityAction | null = targetHref
    ? {
        kind: "navigate",
        label:
          log.target_table === "leads" && listingHref
            ? "View Listing"
            : targetEntityLabel === "Broker" || targetEntityLabel === "Broker Credits"
              ? "View Broker"
              : "View Listing",
        href: targetHref,
      }
    : null;
  const requirementAction: ActivityAction | null = requirementDetails
    ? {
        kind: "requirement",
        label: "View Requirement",
      }
    : null;

  if (log.action === "listing_updated" && changes.length) {
    actions.push({ kind: "changes", label: "View Changes" });
  } else if (log.action === "broker_profile_updated" && changes.length) {
    actions.push({ kind: "changes", label: "View Changes" });
  } else if (log.action === "requirement_updated" && changes.length) {
    actions.push({ kind: "changes", label: "View Changes" });
  } else if (enquiryDetails) {
    actions.push({ kind: "enquiry", label: "View Details" });
  } else if (targetNavigationAction) {
    actions.push(targetNavigationAction);
  }

  if (requirementAction && !actions.some((action) => action.kind === "requirement")) {
    actions.push(requirementAction);
  }

  return {
    ...log,
    actionLabel,
    category,
    categoryLabel,
    targetEntityLabel,
    targetTitle,
    targetSubtitle,
    actorName,
    actorSubtitle,
    summary,
    metaRows,
    changes,
    enquiryDetails,
    requirementDetails,
    modalNavigationAction:
      (log.action === "listing_updated" || log.action === "broker_profile_updated" || log.action === "requirement_updated") && changes.length
        ? targetNavigationAction
        : null,
    actions,
  };
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

function AdminActivityModalShell({
  children,
  description,
  kicker,
  onClose,
  title,
}: {
  children: ReactNode;
  description: string;
  kicker: string;
  onClose: () => void;
  title: string;
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
      <div className="w-full max-w-[55rem] overflow-hidden rounded-[14px] border border-[#dfe6f2] bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fc_100%)] shadow-[0_32px_72px_rgba(18,29,53,0.22)] sm:rounded-[16px]">
        <div className="max-h-[calc(100dvh-1rem)] overflow-x-hidden overflow-y-auto sm:max-h-[calc(100vh-2rem)]">
          <div className="border-b border-[#e5ebf4] bg-[linear-gradient(180deg,#f9fbff_0%,#edf3fb_100%)] px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6f82a0]">{kicker}</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-[#1f2940] sm:text-xl md:text-2xl">{title}</h3>
                <p className="mt-2 max-w-3xl break-words text-[14px] leading-6 text-[#657186] sm:text-[15px]">{description}</p>
              </div>

              <button type="button" onClick={onClose} className="modal-close-button" aria-label={`Close ${title}`}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          </div>

          <div className="px-3 py-3 sm:px-6 sm:py-5">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ActivityChangesModal({
  activity,
  onClose,
  onNavigate,
}: {
  activity: ResolvedAdminActivity;
  onClose: () => void;
  onNavigate: (href: string) => void;
}) {
  const isBrokerProfileUpdate = activity.action === "broker_profile_updated";
  const isRequirementUpdate = activity.action === "requirement_updated";
  const modalNavigationAction = activity.modalNavigationAction;

  return (
    <AdminActivityModalShell
      kicker={isBrokerProfileUpdate ? "Broker Profile Update" : isRequirementUpdate ? "Requirement Update" : "Listing Update"}
      title={isBrokerProfileUpdate ? "Broker Profile Updates" : isRequirementUpdate ? "Requirement Updates" : "Changed Fields"}
      description={activity.summary}
      onClose={onClose}
    >
      <div className="space-y-3">
        {activity.changes.map((change) => (
          <div
            key={`${change.field}:${change.before || ""}:${change.after || ""}`}
            className="rounded-[14px] border border-[#e1e7f0] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(30,35,49,0.05)] sm:rounded-[18px] sm:px-4 sm:py-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">{change.label}</p>
            {change.before === undefined && change.after !== undefined ? (
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8d96a9]">Current Value</p>
                <p className="mt-2 min-w-0 break-words text-[15px] font-semibold leading-6 text-[#28324a]">{change.after}</p>
              </div>
            ) : change.before !== undefined || change.after !== undefined ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                <p className="min-w-0 break-words text-[15px] font-semibold leading-6 text-[#28324a]">{change.before || "Not provided"}</p>
                <span className="hidden text-[14px] font-semibold text-[#8a93a6] sm:block" aria-hidden="true">
                  &rarr;
                </span>
                <p className="min-w-0 break-words text-[15px] font-semibold leading-6 text-[#28324a]">{change.after || "Updated"}</p>
              </div>
            ) : (
              <p className="mt-3 text-[15px] font-semibold leading-6 text-[#28324a]">Updated</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        {modalNavigationAction?.href ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              onClose();
              onNavigate(modalNavigationAction.href || "/admin");
            }}
          >
            {modalNavigationAction.label}
          </button>
        ) : null}
        <button type="button" className="btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </AdminActivityModalShell>
  );
}

function ActivityEnquiryModal({
  activity,
  onClose,
  onNavigate,
}: {
  activity: ResolvedAdminActivity;
  onClose: () => void;
  onNavigate: (href: string) => void;
}) {
  const details = activity.enquiryDetails;

  if (!details) {
    return null;
  }

  return (
    <AdminActivityModalShell
      kicker="Submitted Enquiry"
      title={details.title}
      description={activity.summary}
      onClose={onClose}
    >
      <div className="rounded-[14px] border border-[#e1e7f0] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(30,35,49,0.05)] sm:rounded-[18px] sm:px-4 sm:py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Message</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-7 text-[#28324a]">{details.message}</p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {details.detailRows.map((row) => (
          <div
            key={`${row.label}:${row.value}`}
            className="rounded-[14px] border border-[#e1e7f0] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(30,35,49,0.05)] sm:rounded-[18px] sm:px-4 sm:py-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">{row.label}</p>
            <p className="mt-2 min-w-0 break-words text-[15px] font-semibold leading-6 text-[#28324a]">{row.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        {details.listingHref ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              onClose();
              onNavigate(details.listingHref || "/admin");
            }}
          >
            View Listing
          </button>
        ) : null}
        <button type="button" className="btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </AdminActivityModalShell>
  );
}

function ActivityRequirementModal({
  activity,
  onClose,
}: {
  activity: ResolvedAdminActivity;
  onClose: () => void;
}) {
  const details = activity.requirementDetails;

  if (!details) {
    return null;
  }

  return (
    <AdminActivityModalShell
      kicker={activity.action.startsWith("requirement_match") ? "Requirement Match" : "Requirement Activity"}
      title={details.title}
      description={activity.summary}
      onClose={onClose}
    >
      <div className="rounded-[14px] border border-[#e1e7f0] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(30,35,49,0.05)] sm:rounded-[18px] sm:px-4 sm:py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Requirement Brief</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-7 text-[#28324a]">{details.description}</p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {details.detailRows.map((row) => (
          <div
            key={`${row.label}:${row.value}`}
            className="rounded-[14px] border border-[#e1e7f0] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(30,35,49,0.05)] sm:rounded-[18px] sm:px-4 sm:py-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">{row.label}</p>
            <p className="mt-2 min-w-0 break-words text-[15px] font-semibold leading-6 text-[#28324a]">{row.value}</p>
          </div>
        ))}
      </div>

      {details.matchRows.length ? (
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">Match Details</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {details.matchRows.map((row) => (
              <div
                key={`${row.label}:${row.value}`}
                className="rounded-[14px] border border-[#e1e7f0] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(30,35,49,0.05)] sm:rounded-[18px] sm:px-4 sm:py-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7d879c]">{row.label}</p>
                <p className="mt-2 min-w-0 break-words text-[15px] font-semibold leading-6 text-[#28324a]">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </AdminActivityModalShell>
  );
}

export function AdminActivityCard({
  activity,
  onNavigate,
  surfaceClassName,
  pinMobileActions = false,
}: {
  activity: ResolvedAdminActivity;
  onNavigate: (href: string) => void;
  surfaceClassName?: string;
  pinMobileActions?: boolean;
}) {
  const [openModal, setOpenModal] = useState<"changes" | "enquiry" | "requirement" | null>(null);
  const handleActivityAction = (action: ActivityAction) => {
    if (action.kind === "navigate" && action.href) {
      onNavigate(action.href);
      return;
    }

    if (action.kind === "changes") {
      setOpenModal("changes");
      return;
    }

    if (action.kind === "enquiry") {
      setOpenModal("enquiry");
      return;
    }

    if (action.kind === "requirement") {
      setOpenModal("requirement");
    }
  };
  const menuActions: ResponsiveRowAction[] = activity.actions.map((action) => ({
    label: action.label,
    onClick: () => handleActivityAction(action),
  }));

  return (
    <>
      <div
        className={cn(
          surfaceClassName ||
            "rounded-[12px] border border-[#e5e9f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] px-3 py-3 shadow-[0_10px_22px_rgba(34,40,66,0.05)] sm:px-4 sm:py-4 xl:px-5 xl:py-5",
          pinMobileActions && "relative w-full overflow-hidden xl:overflow-visible"
        )}
      >
        <div
          className={cn(
            "grid items-start gap-2 sm:gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.1fr)_minmax(0,0.92fr)_auto] xl:items-center xl:gap-4 xl:pr-0",
            pinMobileActions ? "grid-cols-1 pr-12" : "grid-cols-[minmax(0,1fr)_auto]"
          )}
        >
          <div className="min-w-0">
            <p className="line-clamp-2 break-words text-base font-semibold tracking-[-0.03em] text-[#202a42] sm:text-[17px] xl:block xl:truncate xl:text-[19px]">{activity.actionLabel}</p>
            <p className="mt-1 line-clamp-2 break-words text-[13px] leading-5 text-[#4f5c73] xl:mt-2 xl:line-clamp-none xl:text-[14px] xl:leading-6">{activity.summary}</p>
            <div className="mt-2 grid min-w-0 gap-1.5 xl:hidden">
              <p className="min-w-0 line-clamp-2 break-words text-[12px] leading-5 text-[#667086]">
                <span className="font-semibold text-[#33415f]">Target:</span> {activity.targetTitle}
              </p>
              <p className="min-w-0 line-clamp-2 break-words text-[12px] leading-5 text-[#667086]">{activity.targetSubtitle}</p>
              <p className="min-w-0 break-words text-[12px] leading-5 text-[#667086]">
                <span className="font-semibold text-[#33415f]">Actor:</span> {activity.actorName}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8d96a9]">{formatDateTime(activity.created_at)}</p>
            </div>
          </div>

          <div className="hidden min-w-0 xl:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d96a9]">Target</p>
            <p className="mt-1 line-clamp-2 break-words text-[14px] font-semibold text-[#28324a] xl:mt-2 xl:block xl:truncate xl:text-[15px]">{activity.targetTitle}</p>
            <p className="mt-0.5 line-clamp-2 break-words text-[13px] leading-5 text-[#667086] xl:mt-1 xl:line-clamp-none xl:text-[14px] xl:leading-6">{activity.targetSubtitle}</p>
          </div>

          <div className="hidden xl:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d96a9]">Actor</p>
            <p className="mt-1 break-words text-[14px] font-semibold text-[#28324a] xl:mt-2 xl:text-[15px]">{activity.actorName}</p>
            <p className="mt-0.5 break-words text-[13px] leading-5 text-[#667086] xl:mt-1 xl:text-[14px] xl:leading-6">{activity.actorSubtitle}</p>
          </div>

          <div
            className={cn(
              "flex shrink-0 self-start items-start justify-end gap-0 whitespace-nowrap xl:col-start-auto xl:row-start-auto xl:self-auto xl:flex-col xl:items-end xl:gap-3",
              pinMobileActions ? "absolute right-2 top-2 mb-0 h-fit pb-0 xl:static" : "col-start-2 row-start-1"
            )}
          >
            <p className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d96a9] xl:block">{formatDateTime(activity.created_at)}</p>
            {activity.actions.length ? (
              <>
                <div className="flex w-auto justify-end xl:hidden">
                  <ResponsiveRowActionsMenu actions={menuActions} label={`Open actions for ${activity.actionLabel}`} />
                </div>
                <div className="hidden xl:flex xl:flex-col xl:items-end xl:gap-2">
                  {activity.actions.map((action) => (
                    <button
                      key={`${activity.id}:${action.kind}:${action.label}`}
                      type="button"
                      className={cn(ACTIVITY_ACTION_BUTTON_CLASS, action.kind !== "navigate" && "min-w-[136px]")}
                      onClick={() => handleActivityAction(action)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {openModal === "changes" ? (
        <ActivityChangesModal activity={activity} onClose={() => setOpenModal(null)} onNavigate={onNavigate} />
      ) : null}
      {openModal === "enquiry" ? (
        <ActivityEnquiryModal activity={activity} onClose={() => setOpenModal(null)} onNavigate={onNavigate} />
      ) : null}
      {openModal === "requirement" ? (
        <ActivityRequirementModal activity={activity} onClose={() => setOpenModal(null)} />
      ) : null}
    </>
  );
}
