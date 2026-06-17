# Next.js App Router

## Use For

Use for routes, layouts, loading states, navigation, middleware, route handlers, server/client boundaries, or shared API contracts.

## Current Targets

- `src/app/` and `src/app/api/**/route.ts`
- `src/app/admin/layout.tsx`, `src/app/admin/_components/AdminWorkspace.tsx`, `src/lib/admin-routes.ts`
- `src/app/admin/brokers/[userId]/layout.tsx` and `_components/AdminBrokerDetailWorkspace.tsx`
- `src/app/dashboard/DashboardSectionPageClient.tsx` and route-segment pages under `src/app/dashboard/`
- `middleware.ts`, `src/lib/deal-api.ts`, `src/lib/route-access.ts`

## Route Rules

- Canonical Admin workspace routes use `/admin` plus `/listings`, `/requirements`, `/chats`, `/enquiries`, `/activity`, and `/leads`.
- Canonical broker-detail routes use `/admin/brokers/[userId]` plus `/listings`, `/requirements`, `/enquiries`, and `/activity`.
- Canonical dashboard routes use `/dashboard` plus `/listings`, `/enquiries`, `/chats`, `/requirements`, and `/profile`.
- Legacy query navigation is redirect-only compatibility. New links and email URLs must use route segments.
- Layout workspaces derive active sections from the pathname. Section recordsets come from scoped APIs.

## Safe Change Rules

- Protected APIs authorize independently of middleware and client guards.
- Keep overview/shell payloads lightweight and preserve section-level failure isolation.
- Treat `/api/dashboard` and the monolithic `/api/admin/brokers/[userId]` handler as compatibility-only; do not add new callers or section datasets.
- Do not move server-filtered or paginated datasets into the browser.
- Keep service-only helpers out of client bundles and retain `"use client"` only where needed.

## Validation

- Run `npm run lint`, `npx tsc --noEmit --pretty false`, and `npm run build`.
- Verify canonical routes, legacy redirects, direct navigation, refresh behavior, and Public/Broker/Admin gates.
