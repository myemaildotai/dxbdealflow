# Supabase Auth And RBAC

## Use For

Use for login, signup, reset, sessions, cookies, broker verification, roles/statuses, RLS, storage authorization, middleware access, or site-mode gates.

## Current Targets

- Auth client: `src/auth/`, especially `auth-hydration.ts`, `session-sync.ts`, `authOperations.ts`, `AuthProvider.tsx`
- Auth APIs: `src/app/api/auth/`, `src/app/api/brokers/email-verification/`
- Authorization: `src/lib/deal-server.ts`, `route-access.ts`, `client-session.ts`
- Site modes: `middleware.ts`, `src/lib/site-mode-state.ts`, `src/app/api/public/site-modes/route.ts`
- Browser Supabase: `src/lib/supabase.ts`

## Safe Change Rules

- Brokers require role `broker` and status `active` or `approved`; Admin actions require role `admin`.
- APIs authorize every operation independently of middleware and client guards.
- Use request-scoped anon clients where RLS should enforce caller access. Service-role clients remain server-only and require explicit authorization.
- Preserve `dx-access-token` and `dx-refresh-token`, session-write deduplication, short-lived auth hydration caching/coalescing, site-mode coalescing, and blocked-broker behavior.
- Middleware is a coarse gate and must remain fail-open for transient site-mode/auth lookup errors where current behavior does so.
- Never expose tokens, OTPs, SMTP secrets, or `SUPABASE_SERVICE_ROLE_KEY`.

## Validation

- Run `npm run lint`, `npx tsc --noEmit --pretty false`, and `npm run build`.
- Verify anonymous, Public, active broker, blocked broker, and Admin outcomes plus session refresh and site-mode paths.

