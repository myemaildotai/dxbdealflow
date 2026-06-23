# Responsive UI

## Use For

Use for visual-only mobile/tablet layout, shared presentation, navigation presentation, forms, dialogs, cards, loading/empty/error states, or accessibility.

## Current Targets

- Affected page under `src/app/` and direct components under `src/components/`
- `src/theme/brand.ts`, `mui-theme.ts`, `ThemeProvider.tsx`
- `src/hooks/useResponsive.ts`
- `src/app/globals.css`, `tailwind.config.ts`
- `src/components/AppShell.tsx` and `PublicHeader.tsx` only when shell/navigation presentation changes

## Safe Change Rules

- Reuse existing brand tokens, MUI theme, Tailwind tokens, shells, cards, modals, and states.
- Mobile/tablet fixes must not alter desktop behavior unless explicitly requested.
- Preserve canonical route-segment navigation, role-specific actions, wording, validation, notifications, and success/error behavior.
- Visual-only work must not change APIs, pagination, hydration, auth, or business logic.
- Avoid horizontal overflow, clipped dialogs, inaccessible controls, and unusable touch targets.

## Validation

- Run `npm run lint` and `npx tsc --noEmit --pretty false`; run `npm run build` for shared boundaries or when requested.
- Verify roughly 360-430px mobile, 768px tablet, and 1280px+ desktop without role/navigation regressions.

