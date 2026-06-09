import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LISTING_SELECT,
  REQUIREMENT_SELECT,
  getServiceSupabase,
} from "@/lib/deal-server";
import type { EmailSendResult } from "@/lib/email";
import { isValidEmailAddress } from "@/lib/email";
import {
  EMAIL_TYPES,
  buildAppUrl,
  sendLoggedEmail,
  type EmailType,
  type LoggedEmailResult,
} from "@/lib/email-service";
import {
  NEW_DEAL_ALERT_COOLDOWN_MS,
  getNewDealAlertAvailableAt,
  getNewDealAlertCooldownState,
} from "@/lib/email-alert-config";
import {
  buildEmailAssetUrl,
  brokerEmailVerificationOtpTemplate,
  brokerPublicEnquiryNotificationTemplate,
  brokerVerificationSuccessTemplate,
  listingApprovedTemplate,
  listingSubmittedTemplate,
  manualReviewPendingTemplate,
  newDealAlertTemplate,
  newMessageReceivedTemplate,
  profileCompletionReminderTemplate,
  requirementMatchFoundTemplate,
  weeklyDealDigestTemplate,
  welcomeEarlyInterestTemplate,
  type EmailListingSummary,
  type EmailTemplate,
} from "@/lib/email-templates";
import type { BrokerProfile, Listing, PlatformUser, Requirement } from "@/lib/deal-types";
import {
  formatCurrency,
  formatDateTime,
  formatPropertyType,
  getFullName,
  isActiveBrokerStatus,
  isActiveListingStatus,
} from "@/lib/deal-utils";
import {
  buildListingIntel,
  compareByOpportunity,
  formatPercentValue,
  getCoverImage,
} from "@/components/browse-listings/browse-listings-utils";
import { getRequirementMatchedListings, isListingMatchingRequirement } from "@/lib/requirement-matching";
import { hydrateListings } from "@/lib/platform-server-data";

type PublicEnquiryEmail = {
  brokerName: string;
  brokerEmail: string;
  brokerUserId?: string | null;
  leadId?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  message?: string | null;
  listingTitle: string;
  enquiryDate: string;
};

type ComingSoonInterestConfirmationEmail = {
  email: string;
  registrationId?: string | null;
  source?: "coming_soon_registrations" | "early_access_leads";
};

type BrokerEmailOtpEmail = {
  brokerName: string;
  brokerEmail: string;
  brokerUserId?: string | null;
  otp: string;
  expiresAt: string;
};

type BrokerRecipient = Pick<PlatformUser, "id" | "email" | "first_name" | "last_name" | "status"> & {
  brokerProfile: Pick<BrokerProfile, "user_id" | "application_status" | "share_latest_deals" | "profile_photo" | "bio"> | null;
};
type BrokerRecipientProfile = NonNullable<BrokerRecipient["brokerProfile"]>;

const ACTIVE_STATUSES = ["active", "approved"];
const DEFAULT_CHAT_THROTTLE_MINUTES = 15;
const MAX_DIGEST_LISTINGS = 5;
const FALLBACK_LISTING_IMAGE_PATH = "/assets/listing_header.png";

export class NewDealAlertCooldownError extends Error {
  readonly availableAt: string | null;
  readonly lastSentAt: string | null;

  constructor(lastSentAt: string | null | undefined) {
    const availableAt = getNewDealAlertAvailableAt(lastSentAt)?.toISOString() || null;

    super(
      availableAt
        ? `New Deal Alert is in cooldown. Available again on ${formatDateTime(availableAt)}.`
        : "New Deal Alert is in cooldown."
    );
    this.name = "NewDealAlertCooldownError";
    this.availableAt = availableAt;
    this.lastSentAt = lastSentAt || null;
  }
}

function toEmailSendResult(result: LoggedEmailResult): EmailSendResult {
  return {
    ok: result.ok || result.status === "pending",
    skipped: result.skipped,
    provider: "smtp",
    error: result.error || undefined,
  };
}

function stableHash(values: string[]) {
  return createHash("sha1").update(values.join("|")).digest("hex").slice(0, 16);
}

function getProfileUrl() {
  return buildAppUrl("/dashboard?section=profile");
}

function getDashboardUrl(section = "overview") {
  return buildAppUrl(`/dashboard?section=${encodeURIComponent(section)}`);
}

function getListingUrl(listingId: string) {
  return buildAppUrl(`/listings/${listingId}`);
}

function getConversationUrl(conversationId: string) {
  return buildAppUrl(`/dashboard/chats/${conversationId}`);
}

function getRequirementMatchesUrl(requirementId: string) {
  return buildAppUrl(`/my-requirements?requirementId=${encodeURIComponent(requirementId)}`);
}

function getListingImageUrl(listing: Listing | null | undefined) {
  if (!listing) {
    return buildEmailAssetUrl(FALLBACK_LISTING_IMAGE_PATH);
  }

  return getCoverImage(listing) || buildEmailAssetUrl(FALLBACK_LISTING_IMAGE_PATH);
}

function getInstagramStoryImageUrl(listing: Listing | null | undefined) {
  return getListingImageUrl(listing);
}

function getWhatsappShareUrl(listing: Pick<Listing, "id" | "title" | "price">) {
  const listingUrl = getListingUrl(listing.id);
  const text = `${listing.title} - ${formatCurrency(listing.price)} ${listingUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function isBrokerRecipientActive(recipient: BrokerRecipient) {
  return (
    isActiveBrokerStatus(recipient.status) &&
    !!recipient.email &&
    isValidEmailAddress(recipient.email) &&
    isActiveBrokerStatus(recipient.brokerProfile?.application_status)
  );
}

async function fetchActiveBrokerRecipients(supabase: SupabaseClient) {
  const { data: userRows } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, status")
    .eq("role", "broker")
    .in("status", ACTIVE_STATUSES);

  const users = (userRows as Array<Pick<PlatformUser, "id" | "email" | "first_name" | "last_name" | "status">> | null) || [];
  const userIds = users.map((user) => user.id);

  if (!userIds.length) {
    return [];
  }

  const profileRows = await supabase
    .from("broker_profiles")
    .select("user_id, application_status, share_latest_deals, profile_photo, bio")
    .in("user_id", userIds);
  const profiles = ((profileRows.data as BrokerRecipientProfile[] | null) || []).filter(
    (profile): profile is BrokerRecipientProfile => Boolean(profile)
  );
  const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));

  return users
    .map((user) => ({
      ...user,
      brokerProfile: profileMap.get(user.id) || null,
    }))
    .filter(isBrokerRecipientActive);
}

async function fetchListingWithContext(supabase: SupabaseClient, listingId: string) {
  const { data } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", listingId)
    .maybeSingle();
  const [listing] = await hydrateListings(supabase, data ? ([data] as Listing[]) : []);
  return listing || null;
}

async function fetchActiveListings(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("is_visible", true)
    .is("deleted_at", null)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(750);

  return hydrateListings(supabase, (data as Listing[] | null) || []);
}

function listingToEmailSummary(listing: Listing, marketListings: Listing[] = []): EmailListingSummary {
  const intel = marketListings.length ? buildListingIntel(listing, marketListings) : null;

  return {
    id: listing.id,
    title: listing.title,
    price: listing.price,
    url: getListingUrl(listing.id),
    areaLabel: listing.area ? [listing.area.name, listing.area.city].filter(Boolean).join(", ") : null,
    imageUrl: getListingImageUrl(listing),
    roiPercent: listing.yield_percent,
    belowMarketPercent: intel?.belowMarketPercent ?? null,
  };
}

function getRequirementSummary(requirement: Requirement) {
  const area = requirement.area || "your buyer";
  const propertyType = formatPropertyType(requirement.property_type).toLowerCase();
  const budget = [requirement.budget_min ? formatCurrency(requirement.budget_min) : null, requirement.budget_max ? formatCurrency(requirement.budget_max) : null]
    .filter(Boolean)
    .join(" - ");
  const bedroomLabel = requirement.bedrooms ? `${requirement.bedrooms} ` : "";
  return [area, bedroomLabel + propertyType, budget].filter(Boolean).join(" | ");
}

async function resolveRequirementOwner(supabase: SupabaseClient, requirement: Requirement) {
  if (requirement.posted_by) {
    const { data } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, status")
      .eq("id", requirement.posted_by)
      .maybeSingle();
    return (data as Pick<PlatformUser, "id" | "email" | "first_name" | "last_name" | "status"> | null) || null;
  }

  const { data: profile } = await supabase
    .from("broker_profiles")
    .select("user_id")
    .eq("id", requirement.broker_id)
    .maybeSingle();

  if (!profile?.user_id) {
    return null;
  }

  const { data } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, status")
    .eq("id", profile.user_id)
    .maybeSingle();
  return (data as Pick<PlatformUser, "id" | "email" | "first_name" | "last_name" | "status"> | null) || null;
}

export async function triggerWelcomeEarlyInterestEmail(data: ComingSoonInterestConfirmationEmail): Promise<LoggedEmailResult | null> {
  const recipientEmail = data.email.trim().toLowerCase();
  if (!recipientEmail) {
    return null;
  }

  return sendLoggedEmail({
    emailType: EMAIL_TYPES.welcomeEarlyInterest,
    recipientEmail,
    relatedEntityType: data.source || null,
    relatedEntityId: data.registrationId || null,
    template: welcomeEarlyInterestTemplate({
      overviewUrl: buildAppUrl("/"),
    }),
    eventKey: `welcome_early_interest:${recipientEmail}`,
    metadata: {
      source: data.source || "public_interest",
    },
    background: true,
  });
}

export async function triggerBrokerVerificationSuccessEmail(data: {
  userId: string;
  email: string;
  brokerName: string;
}): Promise<LoggedEmailResult> {
  return sendLoggedEmail({
    emailType: EMAIL_TYPES.brokerVerificationSuccess,
    recipientEmail: data.email,
    recipientUserId: data.userId,
    relatedEntityType: "users",
    relatedEntityId: data.userId,
    template: brokerVerificationSuccessTemplate({
      brokerName: data.brokerName,
      profileUrl: getProfileUrl(),
    }),
    eventKey: `broker_verification_success:${data.userId}`,
    metadata: {
      trigger: "rera_auto_approval",
    },
    background: true,
  });
}

export async function triggerManualReviewPendingEmail(data: {
  userId: string;
  email: string;
  brokerName: string;
  verificationStatus?: string | null;
}): Promise<LoggedEmailResult> {
  return sendLoggedEmail({
    emailType: EMAIL_TYPES.manualReviewPending,
    recipientEmail: data.email,
    recipientUserId: data.userId,
    relatedEntityType: "users",
    relatedEntityId: data.userId,
    template: manualReviewPendingTemplate({
      brokerName: data.brokerName,
      statusUrl: buildAppUrl("/pending"),
    }),
    eventKey: `manual_review_pending:${data.userId}`,
    metadata: {
      trigger: "rera_manual_review",
      verificationStatus: data.verificationStatus || null,
    },
    background: true,
  });
}

export async function triggerListingSubmittedEmail(data: {
  listingId: string;
  brokerUserId: string;
  brokerEmail: string;
  listingTitle: string;
}): Promise<LoggedEmailResult> {
  return sendLoggedEmail({
    emailType: EMAIL_TYPES.listingSubmitted,
    recipientEmail: data.brokerEmail,
    recipientUserId: data.brokerUserId,
    relatedEntityType: "listings",
    relatedEntityId: data.listingId,
    template: listingSubmittedTemplate({
      listingTitle: data.listingTitle,
      dashboardUrl: getDashboardUrl("listings"),
    }),
    eventKey: `listing_submitted:${data.listingId}:${data.brokerUserId}`,
    metadata: {
      listingTitle: data.listingTitle,
    },
    background: true,
  });
}

export async function triggerListingApprovedEmail(data: {
  listingId: string;
  adminUserId?: string | null;
  notes?: string | null;
}): Promise<LoggedEmailResult | null> {
  const supabase = getServiceSupabase();
  const listing = await fetchListingWithContext(supabase, data.listingId);

  if (!listing) {
    return null;
  }

  const { data: owner } = await supabase
    .from("users")
    .select("id, email, first_name, last_name")
    .eq("id", listing.created_by)
    .maybeSingle();

  if (!owner?.email) {
    return null;
  }

  return sendLoggedEmail({
    emailType: EMAIL_TYPES.listingApproved,
    recipientEmail: owner.email,
    recipientUserId: owner.id,
    relatedEntityType: "listings",
    relatedEntityId: listing.id,
    template: listingApprovedTemplate({
      listingTitle: listing.title,
      propertyType: listing.property_type,
      bedrooms: listing.bedrooms,
      sizeSqft: listing.size_sqft,
      price: listing.price,
      imageUrl: getListingImageUrl(listing),
      instagramStoryImageUrl: getInstagramStoryImageUrl(listing),
      listingUrl: getListingUrl(listing.id),
      whatsappShareUrl: getWhatsappShareUrl(listing),
    }),
    eventKey: `listing_approved:${listing.id}:${owner.id}`,
    metadata: {
      listingTitle: listing.title,
      adminUserId: data.adminUserId || null,
      notes: data.notes || null,
    },
    background: true,
  });
}

export async function triggerNewDealAlertForListing(data: {
  listingId: string;
  subject?: string | null;
  limitedStockWarning?: string | null;
  campaignKey?: string | null;
  includeListingOwner?: boolean;
}) {
  const supabase = getServiceSupabase();
  const [marketListings, recipients] = await Promise.all([
    fetchActiveListings(supabase),
    fetchActiveBrokerRecipients(supabase),
  ]);
  const listing = marketListings.find((candidate) => candidate.id === data.listingId);

  if (!listing || !isActiveListingStatus(listing.status) || listing.deleted_at || !listing.is_visible) {
    return { attempted: 0, sentOrQueued: 0, skipped: 0, failed: 0 };
  }

  const now = new Date();
  const cooldownState = getNewDealAlertCooldownState(listing.last_new_deal_alert_sent_at, now);

  if (cooldownState.isCoolingDown) {
    throw new NewDealAlertCooldownError(listing.last_new_deal_alert_sent_at);
  }

  const triggeredAt = now.toISOString();
  const cooldownCutoff = new Date(now.getTime() - NEW_DEAL_ALERT_COOLDOWN_MS).toISOString();
  const { data: alertStateRow, error: alertStateError } = await supabase
    .from("listings")
    .update({ last_new_deal_alert_sent_at: triggeredAt })
    .eq("id", listing.id)
    .or(`last_new_deal_alert_sent_at.is.null,last_new_deal_alert_sent_at.lte.${cooldownCutoff}`)
    .select("last_new_deal_alert_sent_at")
    .maybeSingle();

  if (alertStateError) {
    throw new Error(alertStateError.message || "Failed to update New Deal Alert state.");
  }

  if (!alertStateRow) {
    const { data: latestAlertState } = await supabase
      .from("listings")
      .select("last_new_deal_alert_sent_at")
      .eq("id", listing.id)
      .maybeSingle();
    const latestLastSentAt =
      (latestAlertState as Pick<Listing, "last_new_deal_alert_sent_at"> | null)?.last_new_deal_alert_sent_at ||
      listing.last_new_deal_alert_sent_at ||
      null;

    throw new NewDealAlertCooldownError(latestLastSentAt);
  }

  const alertSentAt =
    (alertStateRow as Pick<Listing, "last_new_deal_alert_sent_at">).last_new_deal_alert_sent_at || triggeredAt;

  const intel = buildListingIntel(listing, marketListings);
  const belowMarketText = intel.belowMarketPercent > 0 ? `${formatPercentValue(intel.belowMarketPercent)} Below Market` : "";
  const subject = data.subject?.trim() || ["New Off-Market Deal", listing.title, belowMarketText].filter(Boolean).join(" - ");
  const limitedStockWarning = data.limitedStockWarning?.trim() || "Limited stock. View the deal before allocation changes.";
  const campaignKey = data.campaignKey || `listing:${listing.id}:${alertSentAt}:${stableHash([subject, limitedStockWarning])}`;
  let attempted = 0;
  let sentOrQueued = 0;
  let skipped = 0;
  let failed = 0;

  for (const recipient of recipients) {
    if (!data.includeListingOwner && recipient.id === listing.created_by) {
      continue;
    }

    if (!recipient.brokerProfile?.share_latest_deals) {
      continue;
    }

    attempted += 1;
    const result = await sendLoggedEmail({
      supabase,
      emailType: EMAIL_TYPES.newDealAlert,
      recipientEmail: recipient.email,
      recipientUserId: recipient.id,
      relatedEntityType: "listings",
      relatedEntityId: listing.id,
      template: newDealAlertTemplate({
        subject,
        dealTitle: listing.title,
        propertyType: listing.property_type,
        bedrooms: listing.bedrooms,
        sizeSqft: listing.size_sqft,
        price: listing.price,
        roiPercent: intel.roiPercent,
        belowMarketPercent: intel.belowMarketPercent,
        heroImageUrl: getListingImageUrl(listing),
        limitedStockWarning,
        dealUrl: getListingUrl(listing.id),
      }),
      eventKey: `new_deal_alert:${campaignKey}:${recipient.id}`,
      metadata: {
        campaignKey,
        listingTitle: listing.title,
        roiPercent: intel.roiPercent,
        belowMarketPercent: intel.belowMarketPercent,
        dealType: listing.deal_type,
      },
      background: true,
    });

    if (result.ok || result.status === "pending") {
      sentOrQueued += 1;
    } else if (result.status === "skipped") {
      skipped += 1;
    } else {
      failed += 1;
    }
  }

  return {
    attempted,
    sentOrQueued,
    skipped,
    failed,
    lastSentAt: alertSentAt,
    availableAt: getNewDealAlertAvailableAt(alertSentAt)?.toISOString() || null,
  };
}

export async function triggerNewMessageEmail(data: {
  conversationId: string;
  messageId: string;
  senderId: string;
  receiverId: string | null | undefined;
  listingId: string;
  listingTitle?: string | null;
}) {
  if (!data.receiverId || data.receiverId === data.senderId) {
    return null;
  }

  const supabase = getServiceSupabase();
  const [receiverResult, senderResult, listingResult] = await Promise.all([
    supabase.from("users").select("id, email, first_name, last_name, status").eq("id", data.receiverId).maybeSingle(),
    supabase.from("users").select("id, email, first_name, last_name").eq("id", data.senderId).maybeSingle(),
    data.listingTitle
      ? Promise.resolve({ data: { id: data.listingId, title: data.listingTitle } })
      : supabase.from("listings").select("id, title").eq("id", data.listingId).maybeSingle(),
  ]);
  const receiver = receiverResult.data as Pick<PlatformUser, "id" | "email" | "first_name" | "last_name" | "status"> | null;
  const sender = senderResult.data as Pick<PlatformUser, "id" | "email" | "first_name" | "last_name"> | null;
  const listing = listingResult.data as Pick<Listing, "id" | "title"> | null;

  if (!receiver?.email || !isActiveBrokerStatus(receiver.status)) {
    return null;
  }

  const throttleMinutes = DEFAULT_CHAT_THROTTLE_MINUTES;
  const throttleBucket = Math.floor(Date.now() / (throttleMinutes * 60 * 1000));
  const listingTitle = listing?.title || "your listing";

  return sendLoggedEmail({
    supabase,
    emailType: EMAIL_TYPES.newMessageReceived,
    recipientEmail: receiver.email,
    recipientUserId: receiver.id,
    relatedEntityType: "chat_conversations",
    relatedEntityId: data.conversationId,
    template: newMessageReceivedTemplate({
      subject: `New message about your ${listingTitle} listing`,
      senderName: sender ? getFullName(sender.first_name, sender.last_name) : "A broker",
      listingTitle,
      conversationUrl: getConversationUrl(data.conversationId),
    }),
    eventKey: `new_message:${data.conversationId}:${receiver.id}:${throttleBucket}`,
    metadata: {
      throttleMinutes,
      messageId: data.messageId,
      senderId: data.senderId,
      listingId: data.listingId,
      listingTitle,
    },
    background: true,
  });
}

async function sendRequirementMatchFoundEmail(params: {
  supabase: SupabaseClient;
  requirement: Requirement;
  owner: Pick<PlatformUser, "id" | "email" | "first_name" | "last_name" | "status">;
  matchedListings: Listing[];
  eventKey: string;
  trigger: string;
}) {
  if (!isActiveBrokerStatus(params.owner.status) || !params.owner.email) {
    return null;
  }

  const requirementSummary = getRequirementSummary(params.requirement);
  const topListings = params.matchedListings.slice(0, 3).map((listing) => listingToEmailSummary(listing, params.matchedListings));

  return sendLoggedEmail({
    supabase: params.supabase,
    emailType: EMAIL_TYPES.requirementMatchFound,
    recipientEmail: params.owner.email,
    recipientUserId: params.owner.id,
    relatedEntityType: "requirements",
    relatedEntityId: params.requirement.id,
    template: requirementMatchFoundTemplate({
      requirementSummary,
      matchCount: params.matchedListings.length,
      listings: topListings,
      matchesUrl: getRequirementMatchesUrl(params.requirement.id),
    }),
    eventKey: params.eventKey,
    metadata: {
      trigger: params.trigger,
      requirementSummary,
      matchedListingIds: params.matchedListings.map((listing) => listing.id),
    },
    background: true,
  });
}

export async function triggerRequirementMatchFoundForRequirement(data: { requirementId: string }) {
  const supabase = getServiceSupabase();
  const { data: requirementRow } = await supabase
    .from("requirements")
    .select(REQUIREMENT_SELECT)
    .eq("id", data.requirementId)
    .maybeSingle();
  const requirement = requirementRow as Requirement | null;

  if (!requirement || !requirement.is_active || requirement.deleted_at) {
    return null;
  }

  const [owner, activeListings] = await Promise.all([
    resolveRequirementOwner(supabase, requirement),
    fetchActiveListings(supabase),
  ]);

  if (!owner) {
    return null;
  }

  const eligibleListings = activeListings.filter((listing) => listing.created_by !== owner.id);
  const matchedListings = getRequirementMatchedListings(requirement, eligibleListings).map((match) => match.listing);

  if (!matchedListings.length) {
    return null;
  }

  return sendRequirementMatchFoundEmail({
    supabase,
    requirement,
    owner,
    matchedListings,
    eventKey: `requirement_match_found:${requirement.id}:initial:${stableHash(matchedListings.map((listing) => listing.id))}`,
    trigger: "requirement_created",
  });
}

export async function triggerRequirementMatchFoundForListing(data: { listingId: string }) {
  const supabase = getServiceSupabase();
  const [listing, requirementsResult] = await Promise.all([
    fetchListingWithContext(supabase, data.listingId),
    supabase
      .from("requirements")
      .select(REQUIREMENT_SELECT)
      .eq("is_active", true)
      .is("deleted_at", null),
  ]);

  if (!listing || listing.deleted_at || !listing.is_visible || !isActiveListingStatus(listing.status)) {
    return [];
  }

  const requirements = (requirementsResult.data as Requirement[] | null) || [];
  const results: Array<LoggedEmailResult | null> = [];

  for (const requirement of requirements) {
    const owner = await resolveRequirementOwner(supabase, requirement);

    if (!owner || owner.id === listing.created_by || !isListingMatchingRequirement(requirement, listing)) {
      continue;
    }

    results.push(
      await sendRequirementMatchFoundEmail({
        supabase,
        requirement,
        owner,
        matchedListings: [listing],
        eventKey: `requirement_match_found:${requirement.id}:listing:${listing.id}`,
        trigger: "listing_approved",
      }),
    );
  }

  return results;
}

export async function triggerRequirementMatchFoundForSubmittedMatch(data: {
  requirementId: string;
  listingId: string;
  requirementMatchId?: string | null;
}) {
  const supabase = getServiceSupabase();
  const [requirementResult, listing] = await Promise.all([
    supabase
      .from("requirements")
      .select(REQUIREMENT_SELECT)
      .eq("id", data.requirementId)
      .maybeSingle(),
    fetchListingWithContext(supabase, data.listingId),
  ]);
  const requirement = requirementResult.data as Requirement | null;

  if (
    !requirement ||
    !listing ||
    !requirement.is_active ||
    requirement.deleted_at ||
    listing.deleted_at ||
    !listing.is_visible ||
    !isActiveListingStatus(listing.status)
  ) {
    return null;
  }

  if (!isListingMatchingRequirement(requirement, listing)) {
    return null;
  }

  const owner = await resolveRequirementOwner(supabase, requirement);
  if (!owner || owner.id === listing.created_by) {
    return null;
  }

  return sendRequirementMatchFoundEmail({
    supabase,
    requirement,
    owner,
    matchedListings: [listing],
    eventKey: `requirement_match_found:${requirement.id}:submitted:${data.requirementMatchId || listing.id}`,
    trigger: "requirement_match_submitted",
  });
}

function getDigestWeekKey(date = new Date()) {
  const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = current.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  current.setUTCDate(current.getUTCDate() + mondayOffset);
  return current.toISOString().slice(0, 10);
}

function buildDigestData(listings: Listing[]) {
  const intel = listings.map((listing) => buildListingIntel(listing, listings));
  const topDeals = [...intel].sort(compareByOpportunity).slice(0, MAX_DIGEST_LISTINGS).map((item) => item.listing);
  const highestRoiDeal = [...listings].sort((left, right) => Number(right.yield_percent || 0) - Number(left.yield_percent || 0))[0] || null;
  const biggestDiscountDeal = [...intel].sort((left, right) => right.belowMarketPercent - left.belowMarketPercent)[0]?.listing || null;
  const distressedDeals = listings.filter((listing) => listing.deal_type === "distressed").slice(0, MAX_DIGEST_LISTINGS);
  const newLaunches = listings.filter((listing) => listing.deal_type === "off_plan").slice(0, MAX_DIGEST_LISTINGS);

  return {
    topDeals,
    highestRoiDeal,
    biggestDiscountDeal,
    distressedDeals,
    newLaunches,
  };
}

export async function sendWeeklyDealDigestEmails() {
  const supabase = getServiceSupabase();
  const [recipients, listings] = await Promise.all([
    fetchActiveBrokerRecipients(supabase),
    fetchActiveListings(supabase),
  ]);
  const digest = buildDigestData(listings);
  const weekKey = getDigestWeekKey();
  let attempted = 0;
  let sentOrQueued = 0;
  let skipped = 0;
  let failed = 0;

  for (const recipient of recipients) {
    if (!recipient.brokerProfile?.share_latest_deals) {
      continue;
    }

    attempted += 1;
    const result = await sendLoggedEmail({
      supabase,
      emailType: EMAIL_TYPES.weeklyDealDigest,
      recipientEmail: recipient.email,
      recipientUserId: recipient.id,
      relatedEntityType: "weekly_digest",
      relatedEntityId: null,
      template: weeklyDealDigestTemplate({
        topDeals: digest.topDeals.map((listing) => listingToEmailSummary(listing, listings)),
        highestRoiDeal: digest.highestRoiDeal ? listingToEmailSummary(digest.highestRoiDeal, listings) : null,
        biggestDiscountDeal: digest.biggestDiscountDeal ? listingToEmailSummary(digest.biggestDiscountDeal, listings) : null,
        distressedDeals: digest.distressedDeals.map((listing) => listingToEmailSummary(listing, listings)),
        newLaunches: digest.newLaunches.map((listing) => listingToEmailSummary(listing, listings)),
        allDealsUrl: buildAppUrl("/listings"),
      }),
      eventKey: `weekly_deal_digest:${weekKey}:${recipient.id}`,
      metadata: {
        weekKey,
        topDealIds: digest.topDeals.map((listing) => listing.id),
        highestRoiDealId: digest.highestRoiDeal?.id || null,
        biggestDiscountDealId: digest.biggestDiscountDeal?.id || null,
      },
      background: false,
    });

    if (result.ok || result.status === "pending") {
      sentOrQueued += 1;
    } else if (result.status === "skipped") {
      skipped += 1;
    } else {
      failed += 1;
    }
  }

  return { attempted, sentOrQueued, skipped, failed, weekKey };
}

export async function sendProfileCompletionReminderEmails() {
  const supabase = getServiceSupabase();
  const threshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const [recipients, profileRows] = await Promise.all([
    fetchActiveBrokerRecipients(supabase),
    supabase
      .from("broker_profiles")
      .select("user_id, profile_photo, bio, created_at, application_status")
      .lte("created_at", threshold)
      .in("application_status", ACTIVE_STATUSES),
  ]);
  const profileMap = new Map(
    ((profileRows.data as Array<Pick<BrokerProfile, "user_id" | "profile_photo" | "bio" | "created_at" | "application_status">> | null) || []).map(
      (profile) => [profile.user_id, profile],
    ),
  );
  let attempted = 0;
  let sentOrQueued = 0;
  let skipped = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const profile = profileMap.get(recipient.id);
    const incomplete = profile && (!profile.profile_photo || !profile.bio?.trim());

    if (!incomplete) {
      continue;
    }

    attempted += 1;
    const result = await sendLoggedEmail({
      supabase,
      emailType: EMAIL_TYPES.profileCompletionReminder,
      recipientEmail: recipient.email,
      recipientUserId: recipient.id,
      relatedEntityType: "broker_profiles",
      relatedEntityId: recipient.id,
      template: profileCompletionReminderTemplate({
        brokerName: getFullName(recipient.first_name, recipient.last_name),
        profileUrl: getProfileUrl(),
      }),
      eventKey: `profile_completion_reminder:${recipient.id}`,
      metadata: {
        missingProfilePhoto: !profile.profile_photo,
        missingBio: !profile.bio?.trim(),
        profileCreatedAt: profile.created_at,
      },
      background: false,
    });

    if (result.ok || result.status === "pending") {
      sentOrQueued += 1;
    } else if (result.status === "skipped") {
      skipped += 1;
    } else {
      failed += 1;
    }
  }

  return { attempted, sentOrQueued, skipped, failed };
}

async function sendSimpleLoggedEmail(data: {
  emailType: EmailType;
  recipientEmail: string | string[];
  recipientUserId?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  template: EmailTemplate;
  eventKey?: string | null;
  metadata?: Record<string, unknown>;
  replyTo?: string | null;
  background?: boolean;
}) {
  const recipients = Array.isArray(data.recipientEmail) ? data.recipientEmail : [data.recipientEmail];
  const results: LoggedEmailResult[] = [];

  for (const recipientEmail of recipients) {
    if (!recipientEmail) {
      continue;
    }

    results.push(
      await sendLoggedEmail({
        emailType: data.emailType,
        recipientEmail,
        recipientUserId: data.recipientUserId || null,
        relatedEntityType: data.relatedEntityType || null,
        relatedEntityId: data.relatedEntityId || null,
        template: data.template,
        eventKey: data.eventKey ? `${data.eventKey}:${recipientEmail.toLowerCase()}` : null,
        metadata: data.metadata,
        replyTo: data.replyTo && isValidEmailAddress(data.replyTo) ? data.replyTo : undefined,
        background: data.background ?? true,
      }),
    );
  }

  const failed = results.find((result) => !result.ok && result.status !== "pending" && result.status !== "skipped");
  return toEmailSendResult(failed || results[0] || { ok: false, status: "skipped", skipped: true, error: "No recipients." });
}

export async function notifyBrokerPublicEnquiry(data: PublicEnquiryEmail): Promise<EmailSendResult> {
  return sendSimpleLoggedEmail({
    emailType: EMAIL_TYPES.brokerPublicEnquiryNotification,
    recipientEmail: data.brokerEmail,
    recipientUserId: data.brokerUserId || null,
    relatedEntityType: data.leadId ? "leads" : null,
    relatedEntityId: data.leadId || null,
    template: brokerPublicEnquiryNotificationTemplate({
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      message: data.message,
      listingTitle: data.listingTitle,
      enquiryDate: formatDateTime(data.enquiryDate),
      enquiryUrl: getDashboardUrl("enquiries"),
    }),
    eventKey: data.leadId ? `broker_public_enquiry_notification:${data.leadId}` : null,
    metadata: {
      listingTitle: data.listingTitle,
      contactEmail: data.contactEmail,
    },
    replyTo: data.contactEmail,
  });
}

export async function notifyComingSoonInterestConfirmation(data: ComingSoonInterestConfirmationEmail): Promise<void> {
  await triggerWelcomeEarlyInterestEmail(data);
}

export async function sendBrokerEmailVerificationOtp(data: BrokerEmailOtpEmail): Promise<EmailSendResult> {
  const result = await sendLoggedEmail({
    emailType: EMAIL_TYPES.brokerEmailVerificationOtp,
    recipientEmail: data.brokerEmail,
    recipientUserId: data.brokerUserId || null,
    relatedEntityType: data.brokerUserId ? "users" : null,
    relatedEntityId: data.brokerUserId || null,
    template: brokerEmailVerificationOtpTemplate({
      brokerName: data.brokerName,
      otp: data.otp,
      expiresAt: formatDateTime(data.expiresAt),
    }),
    eventKey: `broker_email_verification_otp:${data.brokerEmail.toLowerCase()}:${data.expiresAt}`,
    metadata: {
      expiresAt: data.expiresAt,
    },
    background: false,
  });

  return toEmailSendResult(result);
}
