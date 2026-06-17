# Dashboard And Admin Performance

## Use For

Use for broker dashboard or Admin workspace loading, scoped endpoint design, pagination, hydration, caching, duplicate requests, or broad performance work.

## Current Targets

- Broker UI: `src/app/dashboard/`, `DashboardSectionPageClient.tsx`, `src/components/BrokerDashboardReference.tsx`
- Broker APIs: `src/app/api/dashboard/{shell,overview,listings,enquiries,chats,requirements,notifications}/`
- Admin UI: `src/app/admin/_components/AdminWorkspace.tsx`
- Broker detail UI: `src/app/admin/brokers/[userId]/_components/AdminBrokerDetailWorkspace.tsx`
- Admin APIs: `src/app/api/admin/` and `src/app/api/admin/brokers/[userId]/`
- Server helpers: `src/lib/broker-dashboard-server.ts`, `admin-broker-detail-server.ts`, `admin-api-utils.ts`, `platform-server-data.ts`
- Client helpers: `src/lib/deal-api.ts`, `client-cache.ts`, `session-resource.ts`, `src/hooks/useSessionQuery.ts`

## Current Architecture

- Dashboard uses a shared shell plus one active section endpoint. Profile has its own GET/PUT endpoint.
- Admin uses lightweight overview/site-mode context plus only the active section list endpoint.
- Admin broker detail always loads lightweight overview identity/counts, then only the active child section endpoint.
- Admin lists and broker-detail lists use server filtering, counts, and pagination. Broker-detail activity must remain server-paginated.
- Notification feeds use independent cursor pages and server counts.

## Safe Change Rules

- Do not restore oversized dashboard/Admin payloads or expand compatibility `/api/dashboard` or `/api/admin/brokers/[userId]`.
- Keep filtering, sorting, counts, and pagination server-side.
- Prefer explicit selects, bounded reads, targeted RPCs, batched hydration, and parallel independent queries.
- Reduce unnecessary work before using caching; never cache authorized data across users.
- Preserve current UI behavior and section-level loading/error isolation.

## Validation

- Run `npm run lint`, `npx tsc --noEmit --pretty false`, and `npm run build`.
- Verify each route fetches only its shell/context plus active section data, pagination stays server-side, and role gates remain intact.
