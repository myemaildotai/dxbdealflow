import type { NotificationItem, NotificationsPagePayload } from "@/lib/notifications";

export type BrokerNotificationType = "requirement" | "enquiry" | "chat" | "listingApproval";

type BrokerNotificationBase = {
  id: string;
  type: BrokerNotificationType;
  title: string;
  message: string;
  ariaLabel: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  href: string;
  priority: NotificationItem["priority"];
};

export type BrokerNotificationFeedItem =
  | (BrokerNotificationBase & {
      type: "requirement";
      source: {
        notificationId: string;
        requirementId: string;
        requirementTitle: string;
      };
    })
  | (BrokerNotificationBase & {
      type: "enquiry";
      source: {
        leadId: string;
        listingId: string | null;
        listingTitle: string;
      };
    })
  | (BrokerNotificationBase & {
      type: "chat";
      unreadCount: number;
      source: {
        conversationId: string;
        listingId: string;
        listingTitle: string;
        lastMessageSequence: number | null;
        lastReadAt: string | null;
      };
    })
  | (BrokerNotificationBase & {
      type: "listingApproval";
      source: {
        listingId: string;
        listingTitle: string;
      };
    });

export type BrokerNotificationsPayload = NotificationsPagePayload;

// Retained for compatibility with legacy dashboard helpers while notification reads move to the unified table.
export type BrokerListingApprovalNotificationSource = {
  id: string;
  title: string;
  approvedAt: string;
  approvalReadAt: string | null;
};

export type BrokerEnquiryNotificationSource = {
  id: string;
  listingId: string | null;
  listingTitle: string | null;
  contactName: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type BrokerChatNotificationSource = {
  conversationId: string;
  listingId: string;
  listingTitle: string;
  participantFirstName: string | null;
  participantLastName: string | null;
  unreadCount: number;
  lastActivityAt: string;
  lastMessageSequence: number | null;
  lastReadAt: string | null;
};

export type BrokerRequirementNotificationSource = {
  id: string;
  requirementId: string;
  requirementTitle: string | null;
  actorFirstName: string | null;
  actorLastName: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

function readMetadataString(notification: NotificationItem, key: string) {
  const value = notification.metadata[key];
  return typeof value === "string" ? value : null;
}

function readMetadataNumber(notification: NotificationItem, key: string) {
  const value = notification.metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapBrokerNotification(notification: NotificationItem): BrokerNotificationFeedItem | null {
  const base = {
    id: notification.id,
    title: notification.title,
    message: notification.message || "",
    ariaLabel: [notification.title, notification.message].filter(Boolean).join(" "),
    isRead: notification.isRead,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    href: notification.href || "/dashboard",
    priority: notification.priority,
  };

  if (notification.type === "requirement_match_found") {
    const requirementId = readMetadataString(notification, "requirementId") || notification.entityId;
    if (!requirementId) return null;

    return {
      ...base,
      type: "requirement",
      source: {
        notificationId: notification.id,
        requirementId,
        requirementTitle: readMetadataString(notification, "requirementTitle") || "Requirement notification",
      },
    };
  }

  if (notification.type === "public_enquiry_received") {
    const leadId = readMetadataString(notification, "leadId") || notification.entityId;
    if (!leadId) return null;

    return {
      ...base,
      type: "enquiry",
      source: {
        leadId,
        listingId: readMetadataString(notification, "listingId"),
        listingTitle: readMetadataString(notification, "listingTitle") || "your listing",
      },
    };
  }

  if (notification.type === "chat_message_received") {
    const conversationId = readMetadataString(notification, "conversationId") || notification.entityId;
    if (!conversationId) return null;

    return {
      ...base,
      type: "chat",
      unreadCount: Math.max(readMetadataNumber(notification, "unreadCount") || 1, 1),
      source: {
        conversationId,
        listingId: readMetadataString(notification, "listingId") || "",
        listingTitle: readMetadataString(notification, "listingTitle") || "a listing",
        lastMessageSequence: readMetadataNumber(notification, "lastMessageSequence"),
        lastReadAt: null,
      },
    };
  }

  if (notification.type === "listing_approved") {
    const listingId = readMetadataString(notification, "listingId") || notification.entityId;
    if (!listingId) return null;

    return {
      ...base,
      type: "listingApproval",
      source: {
        listingId,
        listingTitle: readMetadataString(notification, "listingTitle") || notification.title,
      },
    };
  }

  return null;
}

export function sortBrokerNotificationFeed(items: BrokerNotificationFeedItem[]) {
  const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 };

  return [...items].sort((left, right) => {
    if (left.isRead !== right.isRead) return left.isRead ? 1 : -1;
    if (left.priority !== right.priority) return priorityRank[left.priority] - priorityRank[right.priority];
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function buildBrokerNotificationFeed(items: NotificationItem[]) {
  return sortBrokerNotificationFeed(
    items.flatMap((notification) => {
      const mapped = mapBrokerNotification(notification);
      return mapped ? [mapped] : [];
    })
  );
}

export function countUnreadBrokerNotifications(notifications: BrokerNotificationFeedItem[]) {
  return notifications.reduce(
    (sum, notification) =>
      sum + (notification.isRead ? 0 : notification.type === "chat" ? Math.max(notification.unreadCount, 1) : 1),
    0
  );
}
