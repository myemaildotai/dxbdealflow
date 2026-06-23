# Email Templates And Notifications

## Use For

Use for email templates, eligibility, SMTP delivery, logging/deduplication, cron email, broker verification email, Supabase reset templates, or unified in-app notifications.

## Current Targets

- Email: `src/lib/email-templates.ts`, `email-notifications.ts`, `email-service.ts`, `email.ts`, `email-alert-config.ts`, `cron.ts`
- Unified feed: `src/lib/notifications.ts`, `notifications-server.ts`, `broker-notifications.ts`
- Feed APIs: `src/app/api/admin/notifications/`, `src/app/api/dashboard/notifications/`
- Feed hooks: `src/hooks/useAdminPriorityNotifications.ts`, `useBrokerNotificationFeed.ts`, `useRealtimeNotificationRefresh.ts`
- Templates/assets: `supabase/templates/reset-password.html`, referenced `public/assets/`

## Safe Change Rules

- Emails are server-only, SMTP-backed, logged, and deduplicated through event keys.
- Preserve eligibility, cooldowns, receiver rules, retries, cron authorization, absolute URLs, and text fallbacks.
- New email navigation links use canonical route segments.
- The `notifications` table is the in-app feed source of truth. Cursor pages, unread counts, total counts, and priority counts are independent.
- Do not reintroduce `admin_priority_queue_notifications` or `broker_notifications`.
- A background email failure must not fail a successful business mutation unless the existing flow requires it.

## Validation

- Run `npm run lint`, `npx tsc --noEmit --pretty false`, and `npm run build`.
- Verify recipient eligibility, event keys, canonical links, feed authorization, cursor pagination, counts, Realtime, and read/handled state.

