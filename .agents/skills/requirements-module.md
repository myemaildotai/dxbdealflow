# Requirements Module

## Use For

Use for requirement creation, Buyer Board browsing, broker requirement management, matching, submissions/status, moderation, or requirements performance.

## Current Targets

- Pages: `src/app/requirements/`, `src/app/post-requirement/`, `src/app/my-requirements/`, `src/app/dashboard/requirements/`, `src/app/admin/requirements/`
- APIs: `src/app/api/requirements/`, `src/app/api/requirement-matches/`, `src/app/api/dashboard/requirements/`, `src/app/api/admin/requirements/`
- Lightweight APIs: `src/app/api/requirements/form/route.ts`, `src/app/api/requirements/match-preview/route.ts`
- Server rules: `src/lib/requirements.ts`, `requirements-server.ts`, `requirement-matching.ts`
- UI: `src/components/BrokerRequirementsWorkspace.tsx`, `src/app/requirements/_components/`

## Safe Change Rules

- Only active brokers create and match requirements.
- Preserve ownership, active/inactive state, soft deletion, Admin deactivation, matching thresholds/statuses, notifications, and own-listing exclusion.
- Buyer Board list pagination/filtering stays server-side; use `includeStatic=0` when repeated requests do not need static areas/listings.
- Match preview must use `fetchRequirementMatchCandidateListings` and lightweight candidate fields. Do not replace it with full listing hydration.
- Use hydrated candidate listings only for flows that actually render full listing context.
- Do not load all requirements or matches when a bounded page/summary is sufficient.

## Validation

- Run `npm run lint`, `npx tsc --noEmit --pretty false`, and `npm run build`.
- Verify active/blocked broker access, ownership, Admin authority, own-listing exclusion, pagination, and match/notification side effects.

