# Chat System

## Use For

Use for broker conversations, send/read behavior, Realtime, optimistic updates, cursor pagination, unread state, listing availability, or read-only Admin chat inspection.

## Current Targets

- Pages: `src/app/dashboard/chats/` and `src/app/dashboard/chats/[listingId]/`
- APIs: `src/app/api/chat/`, `src/app/api/dashboard/chats/`, `src/app/api/admin/chats/`
- Server/client helpers: `src/lib/chat-navigation.ts`, chat helpers in `platform-server-data.ts` and `deal-server.ts`
- Hooks: `src/hooks/useInfiniteScroll.ts`, `useRealtimeNotificationRefresh.ts`, `useBrokerNotificationFeed.ts`
- Unified feed: `src/lib/notifications.ts`, `notifications-server.ts`

## Safe Change Rules

- Chat is private, broker-only, participant-authorized, and listing-scoped.
- Preserve stable message sequences, client-message idempotency, cursor ordering, optimistic reconciliation, read markers, and Realtime subscriptions.
- Messaging remains disabled for unavailable listings; Admin chat remains read-only.
- Chat notification read/handled state belongs to the unified `notifications` feed; do not add legacy notification-table readers.
- Do not weaken participant/listing checks or load full message histories into summary endpoints.

## Validation

- Run `npm run lint`, `npx tsc --noEmit --pretty false`, and `npm run build`.
- Verify both participants, non-participants, unavailable listings, cursors, idempotency, unread state, and Admin read-only access.

