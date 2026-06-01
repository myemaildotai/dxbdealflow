"use client";

import { invalidateApiCache } from "@/lib/deal-api";

export function invalidateListingCaches(listingId?: string) {
  invalidateApiCache("/api/listings");
  invalidateApiCache("/api/dashboard");
  invalidateApiCache("/api/public/overview");
  invalidateApiCache("/api/admin/overview");
  invalidateApiCache("/api/chat/conversations");

  if (!listingId) {
    return;
  }

  invalidateApiCache(`/api/listings/${listingId}`);
  invalidateApiCache(`/api/dashboard/listings/${listingId}`);
  invalidateApiCache(`/api/admin/listings/${listingId}`);
  invalidateApiCache(`/api/chat/${listingId}`);
}

export function invalidateRequirementCaches(requirementId?: string) {
  invalidateApiCache("/api/requirements");
  invalidateApiCache("/api/dashboard");
  invalidateApiCache("/api/admin/overview");

  if (requirementId) {
    invalidateApiCache(`/api/requirements/${requirementId}`);
  }
}

export function invalidateChatCaches({
  conversationId,
  listingId,
}: {
  conversationId?: string | null;
  listingId?: string | null;
} = {}) {
  invalidateApiCache("/api/chat/conversations");
  invalidateApiCache("/api/dashboard");

  if (conversationId) {
    invalidateApiCache(`/api/chat/conversations/${conversationId}`);
  }

  if (listingId) {
    invalidateApiCache(`/api/chat/${listingId}`);
  }
}

export function invalidateAdminOverviewCaches() {
  invalidateApiCache("/api/admin/overview");
  invalidateApiCache("/api/admin/activity");
}
