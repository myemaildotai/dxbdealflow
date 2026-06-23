# Listings Module

## Use For

Use for listing creation, browsing, detail, broker management, moderation, uploads, visibility, enquiries, credits, or listing query performance.

## Current Targets

- Pages: `src/app/listings/`, `src/app/post-listing/`, `src/app/dashboard/listings/`, `src/app/admin/listings/`
- APIs: `src/app/api/listings/`, `src/app/api/dashboard/listings/`, `src/app/api/admin/listings/`
- Browse UI: `src/components/browse-listings/`
- Server data: `src/lib/listing-detail-server.ts`, `platform-server-data.ts`, listing helpers in `deal-server.ts`
- Media: `src/lib/listing-media.ts`, `image-upload.ts`, `document-upload.ts`

## Safe Change Rules

- Public listings remain active/approved, visible, and not soft-deleted.
- Broker mutations verify ownership; brokers cannot control moderation fields.
- Preserve credits, pending approval, media/documents, internal-field visibility, enquiries, notifications, and cache invalidation.
- Keep browse filtering/counts/pagination server-side. Preserve bounded candidate/comparable reads and hydrate only returned UI records.
- Use `listing-detail-server.ts` and existing detail RPC/fallback paths before adding detail queries.
- Do not solve oversized queries with caching alone or broaden lightweight public/dashboard payloads.

## Validation

- Run `npm run lint`, `npx tsc --noEmit --pretty false`, and `npm run build`.
- Verify Public visibility, broker ownership, Admin moderation, soft deletion, pagination, and affected cache/notification paths.

