import type {
  BrokerDashboardData,
  ChatConversationSummary,
  Lead,
  Listing,
  PrivateChatThreadSummary,
  RequirementNotification,
} from "@/lib/deal-types";
import { formatCurrency, formatPropertyType, getFullName } from "@/lib/deal-utils";

export type BrokerNotificationType = "requirement" | "enquiry" | "chat" | "listingApproval";

type BrokerNotificationBase = {
  id: string;
  type: BrokerNotificationType;
  typeLabel: "Requirement" | "Enquiry" | "Chat" | "Listing";
  title: string;
  message: string;
  senderName: string;
  senderEmail: string | null;
  subject: string;
  badge: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  listingId: string | null;
};

function getChatNotificationUnreadCount(conversation: PrivateChatThreadSummary) {
  return Math.max(conversation.unreadCount || 0, conversation.hasUnread ? 1 : 0);
}

export type BrokerNotificationFeedItem =
  | (BrokerNotificationBase & {
      type: "requirement";
      notification: RequirementNotification;
    })
  | (BrokerNotificationBase & {
      type: "enquiry";
      lead: Lead;
    })
  | (BrokerNotificationBase & {
      type: "chat";
      conversation: PrivateChatThreadSummary;
      listing: ChatConversationSummary["listing"];
    })
  | (BrokerNotificationBase & {
      type: "listingApproval";
      listing: Listing;
    });

function getRequirementFeedItem(notification: RequirementNotification): BrokerNotificationFeedItem {
  const senderName = notification.match?.sender
    ? getFullName(notification.match.sender.first_name, notification.match.sender.last_name) || "Broker response"
    : "Broker response";
  const subject = notification.match?.listing?.title || notification.requirement?.title || "Requirement notification";
  const badge = notification.match?.listing?.price
    ? formatCurrency(notification.match.listing.price)
    : notification.requirement?.property_type
      ? formatPropertyType(notification.requirement.property_type)
      : "Requirement";

  return {
    id: `requirement:${notification.id}`,
    type: "requirement",
    typeLabel: "Requirement",
    title: notification.title || "Requirement notification",
    message: notification.match?.message || notification.message || "Message unavailable.",
    senderName,
    senderEmail: notification.match?.sender?.email || null,
    subject,
    badge,
    isRead: notification.is_read,
    readAt: notification.read_at,
    createdAt: notification.created_at,
    listingId: notification.match?.listing_id || notification.listing_id || null,
    notification,
  };
}

function getEnquiryFeedItem(lead: Lead): BrokerNotificationFeedItem {
  const subject = lead.listing?.title || "General enquiry";
  const badge = lead.listing?.price ? formatCurrency(lead.listing.price) : lead.preferred_channel === "both"
    ? "Email + WA"
    : lead.preferred_channel === "whatsapp"
      ? "WhatsApp"
      : "Email";

  return {
    id: `enquiry:${lead.id}`,
    type: "enquiry",
    typeLabel: "Enquiry",
    title: "Public enquiry received",
    message: lead.message || "No message provided.",
    senderName: lead.contact_name,
    senderEmail: lead.contact_email,
    subject,
    badge,
    isRead: Boolean(lead.is_read),
    readAt: lead.read_at ?? null,
    createdAt: lead.created_at,
    listingId: lead.listing_id,
    lead,
  };
}

function getChatFeedItem(
  listing: ChatConversationSummary["listing"],
  conversation: PrivateChatThreadSummary
): BrokerNotificationFeedItem {
  const senderName = conversation.participant
    ? getFullName(conversation.participant.first_name, conversation.participant.last_name) || "Broker"
    : "Broker";
  const unreadCount = getChatNotificationUnreadCount(conversation);

  return {
    id: `chat:${conversation.conversationId}`,
    type: "chat",
    typeLabel: "Chat",
    title: unreadCount > 1 ? `${unreadCount} unread chat messages` : conversation.hasUnread ? "Unread chat message" : "Chat activity update",
    message: conversation.lastMessage?.content || "No messages yet.",
    senderName,
    senderEmail: conversation.participant?.email || null,
    subject: listing.title,
    badge: unreadCount > 0 ? `${unreadCount} new` : `${conversation.messageCount} msg${conversation.messageCount === 1 ? "" : "s"}`,
    isRead: !conversation.hasUnread,
    readAt: conversation.lastReadAt || (!conversation.hasUnread ? conversation.lastActivityAt || null : null),
    createdAt: conversation.lastActivityAt || conversation.lastMessage?.created_at || "",
    listingId: listing.id,
    conversation,
    listing,
  };
}

function isIncomingUnreadChat(conversation: PrivateChatThreadSummary, currentBrokerUserId: string | null) {
  return Boolean(
    currentBrokerUserId &&
      getChatNotificationUnreadCount(conversation) > 0 &&
      conversation.lastMessage &&
      conversation.lastMessage.sender_id !== currentBrokerUserId
  );
}

function isListingApprovalRead(listing: Listing) {
  if (!listing.approved_at) {
    return true;
  }

  if (!listing.approval_notification_read_at) {
    return false;
  }

  return listing.approval_notification_read_at.localeCompare(listing.approved_at) >= 0;
}

function getListingApprovalFeedItem(listing: Listing): BrokerNotificationFeedItem {
  const badge = listing.price ? formatCurrency(listing.price) : formatPropertyType(listing.property_type);

  return {
    id: `listingApproval:${listing.id}`,
    type: "listingApproval",
    typeLabel: "Listing",
    title: "Listing approved by admin",
    message: `${listing.title} is now approved and ready in your broker dashboard.`,
    senderName: "Admin team",
    senderEmail: null,
    subject: listing.title,
    badge,
    isRead: isListingApprovalRead(listing),
    readAt: listing.approval_notification_read_at ?? null,
    createdAt: listing.approved_at || listing.updated_at,
    listingId: listing.id,
    listing,
  };
}

export function buildBrokerNotificationFeed(dashboard: BrokerDashboardData): BrokerNotificationFeedItem[] {
  const requirementItems = dashboard.requirementNotifications.map(getRequirementFeedItem);
  const enquiryItems = dashboard.enquiries.map(getEnquiryFeedItem);
  const currentBrokerUserId = dashboard.profile?.id ?? null;
  const chatItems = dashboard.chats.flatMap((group) =>
    group.conversations
      .filter((conversation) => isIncomingUnreadChat(conversation, currentBrokerUserId))
      .map((conversation) => getChatFeedItem(group.listing, conversation))
  );
  const listingApprovalItems = dashboard.listings
    .filter((listing) => Boolean(listing.approved_at))
    .map(getListingApprovalFeedItem);

  return [...requirementItems, ...enquiryItems, ...chatItems, ...listingApprovalItems];
}

export function countUnreadBrokerNotifications(notifications: BrokerNotificationFeedItem[]) {
  return notifications.reduce((sum, notification) => {
    if (notification.isRead) {
      return sum;
    }

    if (notification.type === "chat") {
      return sum + getChatNotificationUnreadCount(notification.conversation);
    }

    return sum + 1;
  }, 0);
}
