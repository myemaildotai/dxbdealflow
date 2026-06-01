import { apiFetchCached, getApiCacheKey, prefetchApi } from "@/lib/deal-api";
import { getSessionResource } from "@/lib/session-resource";
import type { BrokerListingDetail, ChatConversationSummary, Requirement } from "@/lib/deal-types";

export type BrokerChatBootstrapResponse = {
  conversationId: string | null;
};

type BrokerChatSummaryResponse = {
  groups: ChatConversationSummary[];
};

type BrokerChatThreadResponse = {
  conversationId: string | null;
};

type RequirementDetailResponse = {
  requirement: Requirement;
};

export type BrokerChatContext = {
  requirementId?: string | null;
  matchId?: string | null;
  notificationId?: string | null;
};

type BrokerChatNavigationOptions = {
  chatGroups?: ChatConversationSummary[] | null;
  context?: BrokerChatContext;
  prefetchRoute?: (href: string) => void;
};

const CHAT_PREFETCH_TTL_MS = 60_000;
const CHAT_PAYLOAD_TTL_MS = 15_000;

function appendChatContext(params: URLSearchParams, context?: BrokerChatContext) {
  if (!context) return;

  if (context.requirementId) {
    params.set("requirementId", context.requirementId);
  }

  if (context.matchId) {
    params.set("matchId", context.matchId);
  }

  if (context.notificationId) {
    params.set("notificationId", context.notificationId);
  }
}

function getDraftChatHref(listingId: string, context?: BrokerChatContext) {
  const draftParams = new URLSearchParams({ listingId });
  appendChatContext(draftParams, context);
  return `/dashboard/chats/new?${draftParams.toString()}`;
}

function getConversationChatHref(conversationId: string, context?: BrokerChatContext) {
  const contextParams = new URLSearchParams();
  appendChatContext(contextParams, context);
  const contextQuery = contextParams.toString();

  return `/dashboard/chats/${conversationId}${contextQuery ? `?${contextQuery}` : ""}`;
}

function buildBrokerChatHref(listingId: string, conversationId: string | null, context?: BrokerChatContext) {
  if (conversationId) {
    return getConversationChatHref(conversationId, context);
  }

  return getDraftChatHref(listingId, context);
}

function findConversationIdForListing(
  listingId: string,
  groups?: ChatConversationSummary[] | null
) {
  return groups?.find((group) => group.listing.id === listingId)?.conversations[0]?.conversationId || null;
}

function getCachedChatGroups() {
  return getSessionResource<BrokerChatSummaryResponse>(getApiCacheKey("/api/chat/conversations"))?.groups || null;
}

function getCachedBootstrapConversationId(listingId: string) {
  const cachedBootstrap = getSessionResource<BrokerChatBootstrapResponse>(getApiCacheKey(`/api/chat/${listingId}`));
  return cachedBootstrap ? cachedBootstrap.conversationId : undefined;
}

function getCachedConversationId(
  listingId: string,
  groups?: ChatConversationSummary[] | null
) {
  const conversationIdFromGroups = findConversationIdForListing(listingId, groups);
  if (conversationIdFromGroups) {
    return conversationIdFromGroups;
  }

  const conversationIdFromCachedGroups = findConversationIdForListing(listingId, getCachedChatGroups());
  if (conversationIdFromCachedGroups) {
    return conversationIdFromCachedGroups;
  }

  return getCachedBootstrapConversationId(listingId);
}

export function getImmediateBrokerChatHref(
  listingId: string,
  context?: BrokerChatContext,
  chatGroups?: ChatConversationSummary[] | null
) {
  const cachedConversationId = getCachedConversationId(listingId, chatGroups);

  if (cachedConversationId !== undefined) {
    return buildBrokerChatHref(listingId, cachedConversationId, context);
  }

  return getDraftChatHref(listingId, context);
}

function prefetchSharedChatResources(listingId: string, context?: BrokerChatContext) {
  prefetchApi<BrokerChatSummaryResponse>("/api/chat/conversations", {}, { ttlMs: CHAT_PREFETCH_TTL_MS });
  prefetchApi<BrokerListingDetail>(`/api/listings/${listingId}`, {}, { ttlMs: CHAT_PREFETCH_TTL_MS });

  if (context?.requirementId) {
    prefetchApi<RequirementDetailResponse>(`/api/requirements/${context.requirementId}`, {}, { ttlMs: CHAT_PREFETCH_TTL_MS });
  }
}

export async function prefetchBrokerChatNavigation(
  listingId: string,
  { chatGroups, context, prefetchRoute }: BrokerChatNavigationOptions = {}
) {
  const optimisticHref = getImmediateBrokerChatHref(listingId, context, chatGroups);
  prefetchRoute?.(optimisticHref);
  prefetchSharedChatResources(listingId, context);

  const groupsPayload = await apiFetchCached<BrokerChatSummaryResponse>("/api/chat/conversations", {}, { ttlMs: CHAT_PREFETCH_TTL_MS });
  const conversationId = findConversationIdForListing(listingId, groupsPayload.groups);
  const href = buildBrokerChatHref(listingId, conversationId, context);

  prefetchRoute?.(href);

  return {
    href,
    conversationId,
  };
}

export async function warmBrokerChatPayload(
  listingId: string,
  { chatGroups, context, prefetchRoute }: BrokerChatNavigationOptions = {}
) {
  prefetchSharedChatResources(listingId, context);

  const cachedConversationId = getCachedConversationId(listingId, chatGroups);
  if (cachedConversationId) {
    const href = getConversationChatHref(cachedConversationId, context);
    prefetchRoute?.(href);
    prefetchApi<BrokerChatThreadResponse>(`/api/chat/conversations/${cachedConversationId}`, {}, { ttlMs: CHAT_PAYLOAD_TTL_MS });

    return {
      href,
      conversationId: cachedConversationId,
    };
  }

  if (cachedConversationId === null) {
    const href = getDraftChatHref(listingId, context);
    prefetchRoute?.(href);
    prefetchApi<BrokerChatThreadResponse>(`/api/chat/${listingId}`, {}, { ttlMs: CHAT_PAYLOAD_TTL_MS });

    return {
      href,
      conversationId: null,
    };
  }

  const bootstrapPayload = await apiFetchCached<BrokerChatBootstrapResponse>(`/api/chat/${listingId}`, {}, { ttlMs: CHAT_PAYLOAD_TTL_MS });
  const href = buildBrokerChatHref(listingId, bootstrapPayload.conversationId, context);

  prefetchRoute?.(href);

  if (bootstrapPayload.conversationId) {
    prefetchApi<BrokerChatThreadResponse>(`/api/chat/conversations/${bootstrapPayload.conversationId}`, {}, { ttlMs: CHAT_PAYLOAD_TTL_MS });
  }

  return {
    href,
    conversationId: bootstrapPayload.conversationId,
  };
}

export async function resolveBrokerChatHref(
  listingId: string,
  context?: BrokerChatContext,
  options: {
    chatGroups?: ChatConversationSummary[] | null;
  } = {}
) {
  const cachedConversationId = getCachedConversationId(listingId, options.chatGroups);
  if (cachedConversationId !== undefined) {
    return buildBrokerChatHref(listingId, cachedConversationId, context);
  }

  const payload = await apiFetchCached<BrokerChatBootstrapResponse>(`/api/chat/${listingId}`, {}, { ttlMs: CHAT_PAYLOAD_TTL_MS });
  return buildBrokerChatHref(listingId, payload.conversationId, context);
}
