export type UserRole = "broker" | "admin";
export type UserStatus = "pending" | "active" | "rejected" | "suspended" | "deactivated" | "approved";
export type ListingStatus = "pending" | "active" | "rejected" | "inactive" | "approved" | "expired";
export type BrokerVerificationStatus = "auto_approved" | "pending";
export type DealType = "off_plan" | "secondary" | "distressed" | "urgent_sale";
export type RequirementDealType = "secondary" | "offplan" | "urgent" | "distressed" | "off_plan" | "urgent_sale";
export type PropertyType =
  | "apartment"
  | "villa"
  | "townhouse"
  | "penthouse"
  | "office"
  | "retail"
  | "warehouse"
  | "land";
export type RequirementUrgency = "low" | "medium" | "high" | "hot" | "active" | "planning";
export type RequirementDeactivatedBy = "broker" | "admin";
export type RequirementStatus = "active" | "inactive" | "closed";
export type RequirementMatchStatus = "new" | "read" | "contacted" | "archived";
export type LeadType = "listing_enquiry" | "requirement_match";
export type LeadStatus = "new" | "contacted" | "won" | "closed";
export type EnquiryReplyStatus = "pending" | "sent" | "failed";

export interface MaintenanceModeState {
  enabled: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

export interface ComingSoonModeState {
  enabled: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

export interface ComingSoonRoleOption {
  id: string;
  name: string;
  display_order: number;
}

export interface ComingSoonRegistration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  whatsapp_number: string;
  instagram_handle: string | null;
  company_agency_name: string;
  role_id: string;
  role_name: string;
  created_at: string;
  updated_at: string;
}

export interface Agency {
  id: string;
  name: string;
  rera_brn: string | null;
  status: UserStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Area {
  id: string;
  name: string;
  city: string;
  slug: string;
}

export interface PlatformUser {
  id: string;
  email: string;
  email_verified_at?: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  agency_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrokerProfile {
  id?: string;
  user_id: string;
  agency_id: string | null;
  profile_photo?: string | null;
  rera_brn: string | null;
  covered_area_ids: string[] | null;
  speciality: string | null;
  experience_years: number | null;
  whatsapp_number: string | null;
  instagram_profile: string | null;
  linkedin_profile: string | null;
  share_latest_deals: boolean;
  terms_accepted: boolean;
  bio: string | null;
  application_status: UserStatus;
  application_submitted_at: string | null;
  approved_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreditSummary {
  id?: string;
  user_id: string;
  available_credits: number;
  used_credits: number;
  total_credits_assigned: number;
  created_at?: string;
  updated_at?: string;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  file_name: string;
  storage_path: string;
  public_url: string;
  sort_order: number;
  is_cover: boolean;
  created_at?: string;
}

export interface ListingDocument {
  id: string;
  listing_id: string;
  file_name: string;
  storage_path: string;
  public_url: string;
}

export interface CommissionTerms {
  listing_id: string;
  co_broke_percent: number;
  payment_terms: string | null;
  notes: string | null;
}

export interface ListingPublicBroker {
  first_name: string | null;
  last_name: string | null;
  profile_photo?: string | null;
}

export interface Listing {
  id: string;
  title: string;
  property_type: PropertyType;
  deal_type: DealType;
  bedrooms: number | null;
  size_sqft: number | null;
  area_id: string | null;
  developer: string | null;
  price: number;
  payment_plan: string | null;
  handover_date: string | null;
  yield_percent: number | null;
  property_video_url: string | null;
  notes: string | null;
  description: string | null;
  status: ListingStatus;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  created_by: string;
  agency_id: string | null;
  renewal_due_at: string | null;
  approved_at: string | null;
  approval_notification_read_at?: string | null;
  last_new_deal_alert_sent_at?: string | null;
  credits_used: number;
  area?: Area | null;
  commission_terms?: CommissionTerms | null;
  listing_images?: ListingImage[];
  listing_documents?: ListingDocument[];
  owner?: PlatformUser | null;
  agency?: Agency | null;
  public_broker?: ListingPublicBroker | null;
  owner_active_listings_count?: number | null;
  enquiry_count?: number | null;
  brokers_engaged_count?: number | null;
  can_edit?: boolean;
  can_chat?: boolean;
}

export interface Requirement {
  id: string;
  broker_id: string;
  title: string | null;
  description: string;
  deal_type: RequirementDealType;
  property_type: PropertyType;
  bedrooms: string | null;
  budget_min: number | null;
  budget_max: number | null;
  area: string | null;
  area_id?: string | null;
  urgency: RequirementUrgency;
  timeline: string | null;
  notes?: string | null;
  is_active: boolean;
  deactivated_by: RequirementDeactivatedBy | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  status?: RequirementStatus;
  posted_by?: string;
  broker_profile?: Pick<BrokerProfile, "id" | "user_id"> | null;
  owner?: Pick<PlatformUser, "id" | "first_name" | "last_name" | "email"> | null;
  submitted_match_count?: number;
  latest_submission_at?: string | null;
}

export interface RequirementMatch {
  id: string;
  requirement_id: string;
  sender_broker_id: string;
  receiver_broker_id: string | null;
  message: string;
  listing_id: string | null;
  status: RequirementMatchStatus;
  created_at: string;
  listing?: (Pick<Listing, "id" | "title" | "status"> & {
    property_type?: Listing["property_type"];
    price?: number;
    area?: Pick<Area, "name" | "city"> | null;
    bedrooms?: number | null;
    is_visible?: boolean;
    deleted_at?: string | null;
  }) | null;
  sender?: Pick<PlatformUser, "id" | "first_name" | "last_name" | "email"> | null;
  requirement?: Pick<Requirement, "id" | "title" | "description" | "area" | "bedrooms" | "budget_min" | "budget_max" | "property_type"> | null;
}

export interface RequirementNotification {
  id: string;
  recipient_broker_id: string;
  actor_broker_id: string | null;
  requirement_id: string | null;
  requirement_match_id: string | null;
  listing_id?: string | null;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  requirement?: Pick<Requirement, "id" | "title" | "description" | "area" | "property_type"> | null;
  match?: RequirementMatch | null;
}

export interface Lead {
  id: string;
  listing_id: string | null;
  requirement_id: string | null;
  from_user_id: string | null;
  to_user_id: string;
  lead_type: LeadType;
  lead_status: LeadStatus;
  message: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  preferred_channel: "email" | "whatsapp" | "both";
  email_triggered_at: string | null;
  whatsapp_triggered_at: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  listing?: Pick<Listing, "id" | "title" | "price" | "property_type" | "status" | "deleted_at"> | null;
}

export interface EnquiryReply {
  id: string;
  enquiry_id: string;
  listing_id: string | null;
  broker_id: string;
  enquirer_email: string;
  subject: string;
  message: string;
  sent_at: string | null;
  status: EnquiryReplyStatus;
  failure_reason: string | null;
  created_at: string;
  broker?: Pick<PlatformUser, "id" | "first_name" | "last_name" | "email"> | null;
}

export type AdminEnquiry = Lead & {
  broker?: Pick<PlatformUser, "id" | "first_name" | "last_name" | "email"> | null;
  replies: EnquiryReply[];
  reply_count: number;
  latest_reply_at: string | null;
  latest_reply_status: EnquiryReplyStatus | null;
};

export type BrokerEnquiry = Lead & {
  replies: EnquiryReply[];
  reply_count: number;
  latest_reply_at: string | null;
  latest_reply_status: EnquiryReplyStatus | null;
};

export interface EarlyAccessLead {
  id: string;
  email: string;
  whatsapp_number: string;
  name: string;
  source: string;
  created_at: string;
}

export type ChatUserSummary = Pick<PlatformUser, "id" | "first_name" | "last_name" | "email"> & {
  profile_photo?: string | null;
};

export interface ChatMessage {
  id: string;
  listing_id: string;
  conversation_id?: string;
  sender_id: string;
  receiver_id?: string | null;
  client_message_id?: string | null;
  message_sequence?: number | null;
  content: string;
  created_at: string;
  updated_at: string;
  sender?: ChatUserSummary | null;
}

export interface PrivateChatThreadSummary {
  conversationId: string;
  participant: ChatUserSummary | null;
  lastMessage: ChatMessage | null;
  lastActivityAt: string | null;
  hasUnread: boolean;
  unreadCount: number;
  lastReadAt: string | null;
  lastReadSequence?: number | null;
  lastMessageSequence?: number | null;
  messageCount: number;
  messages?: ChatMessage[];
  contextType?: "listing" | "requirement_match";
  requirement?: Requirement | null;
  requirementMatch?: RequirementMatch | null;
}

export interface ChatConversationSummary {
  listing: Pick<Listing, "id" | "title" | "status" | "is_visible" | "deleted_at"> &
    Partial<
      Pick<
        Listing,
        | "property_type"
        | "deal_type"
        | "bedrooms"
        | "size_sqft"
        | "area_id"
        | "developer"
        | "price"
        | "created_at"
        | "updated_at"
        | "created_by"
        | "owner"
      >
    > & {
    isOwner?: boolean;
    area?: Pick<Area, "name" | "city"> | null;
    listing_images?: ListingImage[];
  };
  conversations: PrivateChatThreadSummary[];
}

export interface BrokerChatNavigationSummary {
  listing: Pick<Listing, "id">;
  conversations: Array<Pick<PrivateChatThreadSummary, "conversationId">>;
}

export interface ActivityLog {
  id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  actor?: Pick<PlatformUser, "id" | "first_name" | "last_name" | "email" | "role"> | null;
  targetUser?: Pick<PlatformUser, "id" | "first_name" | "last_name" | "email" | "role" | "status"> | null;
  listing?: (Pick<Listing, "id" | "title" | "property_type" | "price" | "status" | "bedrooms" | "deleted_at"> & {
    area?: Pick<Area, "name" | "city"> | null;
  }) | null;
  lead?: Lead | null;
  requirement?: Requirement | null;
  requirementMatch?: RequirementMatch | null;
}

export interface DashboardMetrics {
  totalListings: number;
  activeListings: number;
  pendingListings: number;
  publicEnquiries: number;
  activeChats: number;
  activeRequirements?: number;
  totalRequirements?: number;
  myListings?: number;
  myEnquiries?: number;
  incomingRequirementMatches?: number;
  unreadRequirementNotifications?: number;
  listingsThisWeek?: number;
  pendingListingsThisWeek?: number;
  attentionListings?: number;
  newEnquiries?: number;
  enquiriesThisWeek?: number;
  chatsThisWeek?: number;
  requirementsThisWeek?: number;
  closedRequirements?: number;
  inactiveRequirements?: number;
  contactedRequirementMatches?: number;
  listingsWithChats?: number;
}

export interface BrokerDashboardData {
  metrics: DashboardMetrics;
  profile: PlatformUser | null;
  brokerProfile: BrokerProfile | null;
  agency: Agency | null;
  credits: CreditSummary | null;
  listings: Listing[];
  enquiries: BrokerEnquiry[];
  chats: ChatConversationSummary[];
  requirements: Requirement[];
  incomingRequirementMatches: RequirementMatch[];
  requirementNotifications: RequirementNotification[];
  areas: Area[];
}

export interface RequirementFormValues {
  title: string;
  description: string;
  dealType: RequirementDealType;
  propertyType: PropertyType;
  bedrooms: string;
  area: string;
  areaId?: string;
  budgetMin: string;
  budgetMax: string;
  urgency: RequirementUrgency;
  timeline: string;
  notes?: string;
}

export interface PublicOverview {
  activeBrokerCount: number;
  activeListingCount: number;
  recentListings: Listing[];
  areas: Area[];
  approvedBrokerCount?: number;
  approvedListingCount?: number;
  activeRequirementCount?: number;
}

export interface AdminMetrics {
  pendingApplications: number;
  activeBrokers: number;
  totalUsers: number;
  activeListings: number;
  pendingListings: number;
  activeRequirements: number;
  publicEnquiries: number;
  totalChats: number;
  pendingBrokerUsersThisWeek: number;
  approvedBrokerUsersThisWeek: number;
  pendingListingsThisWeek: number;
  approvedListingsThisWeek: number;
  activeRequirementsThisWeek: number;
}

export interface AdminTabCounts {
  brokers: number;
  listings: number;
  chats: number;
  requirements: number;
  enquiries: number;
  leads: number;
  activity: number;
}

export type AdminBrokerListItem = PlatformUser & {
  brokerProfile: Pick<
    BrokerProfile,
    | "user_id"
    | "profile_photo"
    | "rera_brn"
    | "approved_at"
    | "created_at"
    | "updated_at"
  > | null;
  agency: Pick<Agency, "id" | "name" | "rera_brn" | "status" | "created_at" | "updated_at"> | null;
  credits: CreditSummary | null;
};

export type AdminListingListItem = Pick<
  Listing,
  | "id"
  | "title"
  | "property_type"
  | "deal_type"
  | "bedrooms"
  | "area_id"
  | "developer"
  | "price"
  | "status"
  | "is_visible"
  | "created_at"
  | "updated_at"
  | "deleted_at"
  | "created_by"
  | "approved_at"
> & {
  area?: Area | null;
  owner?: Pick<PlatformUser, "id" | "first_name" | "last_name" | "email"> | null;
};
export type AdminRequirementListItem = Requirement;
export type AdminEnquiryListItem = AdminEnquiry;
export type AdminComingSoonListItem = ComingSoonRegistration;

export type AdminBrokerListCounts = {
  all: number;
  approved: number;
  pending: number;
  rejected: number;
  deactivated: number;
};

export type AdminListingListCounts = {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  inactive: number;
  deleted: number;
};

export type AdminRequirementListCounts = {
  all: number;
  active: number;
  inactive: number;
  deleted: number;
};

export type AdminEnquiryListCounts = {
  all: number;
  unreplied: number;
  replied: number;
  failed: number;
};

export interface AdminPaginatedResponse<TItem, TCounts = Record<string, number>> {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: TCounts;
}

export type AdminPriorityQueueNotificationType = "broker" | "listing";
export type AdminPriorityQueueHandledStatus = UserStatus | ListingStatus;

export interface AdminPriorityQueueNotification {
  id: string;
  admin_user_id: string;
  target_type: AdminPriorityQueueNotificationType;
  target_id: string;
  sentence: string;
  is_read: boolean;
  read_at: string | null;
  source_created_at: string | null;
  handled_status: AdminPriorityQueueHandledStatus | null;
  handled_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AdminChatGroup = {
  listing: Pick<Listing, "id" | "title" | "status" | "price" | "is_visible" | "deleted_at"> & {
    area?: Pick<Area, "name" | "city"> | null;
    listing_images?: ListingImage[];
  };
  conversations: Array<{
    conversationId: string;
    owner: (Pick<PlatformUser, "id" | "first_name" | "last_name" | "email"> & { profile_photo?: string | null }) | null;
    broker: (Pick<PlatformUser, "id" | "first_name" | "last_name" | "email"> & { profile_photo?: string | null }) | null;
    lastMessageAt: string;
    lastMessage: ChatMessage | null;
    messageCount: number;
    unreadCount: number;
    ownerUnreadCount: number;
    brokerUnreadCount: number;
    messages: ChatMessage[];
  }>;
};

export interface AdminOverview {
  metrics: AdminMetrics;
  tabCounts: AdminTabCounts;
  areas: Area[];
}

export type AdminChatConversationCursor = {
  lastMessageAt: string;
  id: string;
};

export interface AdminChatPage {
  chats: AdminChatGroup[];
  hasMore: boolean;
  nextCursor: AdminChatConversationCursor | null;
  totalConversations: number;
}

export type AdminChatMessageCursor = {
  sequence?: number | null;
  createdAt: string;
  id: string;
};

export interface AdminChatMessagesPage {
  conversationId: string;
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor: AdminChatMessageCursor | null;
}

export interface AdminBrokerDetail {
  broker: PlatformUser & {
    brokerProfile: BrokerProfile | null;
    agency: Agency | null;
    credits: CreditSummary | null;
    coveredAreas: Area[];
    listings: Listing[];
    requirements: Requirement[];
    enquiries: AdminEnquiry[];
    activity: ActivityLog[];
  };
}

export interface AdminBrokerOverview {
  broker: PlatformUser & {
    brokerProfile: BrokerProfile | null;
    agency: Agency | null;
    credits: CreditSummary | null;
    coveredAreas: Area[];
  };
  counts: {
    listings: {
      total: number;
      active: number;
      pending: number;
      deleted: number;
    };
    requirements: {
      total: number;
      active: number;
      inactive: number;
      deleted: number;
      submittedMatches: number;
      withSubmittedMatches: number;
    };
    enquiries: number;
    activity: number;
  };
}

export interface AdminBrokerActivityResponse {
  activity: ActivityLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  totalCount: number;
  filteredCount: number;
  categoryCounts: {
    all: number;
    listings: number;
    brokers: number;
    credits: number;
    requirements: number;
    system: number;
  };
}

export interface AdminListingDetail {
  listing: Listing & {
    ownerBrokerProfile?: Pick<BrokerProfile, "whatsapp_number" | "instagram_profile" | "linkedin_profile"> | null;
  };
}

export interface BrokerListingDetail {
  listing: Listing;
}

export interface AdminActivityResponse {
  activity: ActivityLog[];
  totalCount: number;
  filteredCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  countsIncluded: boolean;
  categoryCounts: {
    all: number;
    listings: number;
    brokers: number;
    credits: number;
    requirements: number;
    system: number;
  };
}

export interface ApplicationPayload {
  authUserId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  shareLatestDeals: boolean;
  termsAccepted: boolean;
  password?: string;
  agencyName: string;
  reraBrn: string;
  coveredAreaIds: string[];
  speciality: string;
  experienceYears: number;
  bio?: string;
  instagramProfile?: string;
  linkedinProfile?: string;
}

export interface BrokerVerificationResponse {
  broker_found: boolean;
  email_match: boolean;
  phone_match: boolean;
  status: BrokerVerificationStatus;
}

export interface ListingFormValues {
  title: string;
  propertyType: PropertyType | "";
  dealType: DealType | "";
  bedrooms: string;
  sizeSqft: string;
  areaId: string;
  developer: string;
  price: string;
  paymentPlan: string;
  handoverDate: string;
  yieldPercent: string;
  propertyVideoUrl: string;
  coBrokePercent: string;
  notes: string;
  description: string;
  paymentTerms: string;
}
