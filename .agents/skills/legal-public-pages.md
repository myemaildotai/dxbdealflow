# Legal And Public Pages

## Use For

Use for legal/policy pages, public landing/header/footer content, public site-mode pages, or shared legal navigation/content.

## Current Targets

- Legal routes under `src/app/` listed in `.agents/codebase-index.md`
- `src/components/legal/LegalDocumentPage.tsx`
- `src/lib/legal-content.ts`, `legal-routes.ts`
- `src/components/FooterLegalNavigation.tsx`, `FooterLegalNavigationGate.tsx`, `PublicHeader.tsx`
- Site-mode work only when requested: `src/app/coming-soon/`, `src/app/maintenance/`, `src/lib/site-mode-state.ts`, `middleware.ts`

## Safe Change Rules

- Reuse the shared legal page shell and route/content utilities.
- Preserve route slugs, metadata, public accessibility, legal navigation, and current site-mode allowances.
- Content-only work must not alter APIs, middleware, auth, or business behavior.
- Do not rename/remove legal routes or propagate wording across documents without explicit approval.
- Preserve shared site-mode caching/coalescing when public-mode behavior is involved.

## Validation

- Content-only: inspect links and run `npm run lint` when TSX changes.
- Route/site-mode changes: run `npm run lint`, `npx tsc --noEmit --pretty false`, and `npm run build`; verify maintenance and coming-soon access.
