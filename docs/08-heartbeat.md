# Heartbeat

_Last updated: April 2026_

## Current Phase

Solo alpha with auth-gated UI, auth-protected Supabase persistence, authenticated-user cloud ownership, persistence payload validation hardening, and CI-backed local Playwright smoke coverage in place.

## Top Priorities

1. Create a docs-only persistence v2 design plan for canonical push-up source of truth, exact set preservation, atomic day writes/RPC, migration, tests, and rollback
2. Create issue-backed implementation tickets from that design
3. Re-run the revised legacy `solo` backfill dry-run in production manually, review the `user_settings` merge checks, and only consider apply if the revised dry-run is fully clean

## Actively Dogfooding

- Push-up daily logging and goal tracking
- Workout logging with exercise catalog, recent suggestions, and category auto-fill
- Approved-user magic-link sign-in, session restore, and sign-out
- Supabase-backed save and load through `/api/persistence` with local fallback still enabled
- Compact sync status for cloud load, save progress, save success, and cloud-sync failures
- Auth-protected persistence API with authenticated-user-scoped cloud ownership live
- Subtle generated imagery on the Push-Ups and Workouts heroes, workout empty state, and trend-card analytics accents
- Mocked/local Playwright smoke coverage for the core app path in Chromium

## Recent Session Summary

- PR #49 updated architecture docs so Supabase persistence is described as authenticated-user scoped, with `/api/persistence` deriving ownership from the verified Supabase Auth bearer token.
- PR #50 hardened `/api/persistence` payload validation before Supabase writes. Invalid push-up/workout payloads now return `400` and do not call Supabase mutations.
- PR #51 removed React `act(...)` warnings from Push-Ups and Workouts screen tests without suppressing console errors or changing runtime behavior.
- PR #52 added the existing mocked/local Playwright smoke tests to GitHub CI in Chromium.
- Validation during the stabilization session: `npm test` passed with 142 tests, `npm run build` passed, and Playwright smoke passed locally with 4 tests.

## Known Warnings

- Vite still warns that `src/supabaseClient.ts` is both dynamically and statically imported, which affects chunking.
- Vite still reports a large bundle/chunk-size warning.

## Blocked

- Persistence v2 implementation is blocked on a reviewed design for the canonical push-up source of truth and atomic day-write strategy.
- The manual legacy `solo` apply path remains blocked until the revised production dry-run returns fully clean and is reviewed by a human operator.

## Do Not Work On Yet

- Persistence v2 implementation without the docs-only design plan
- Legacy `solo` apply without a fresh clean production dry-run
- Multi-user account management beyond the current authenticated-user ownership model
- AI-assisted features beyond current logging and history needs
- Attachment or media uploads
- PWA or offline-first changes

## Current Stop Point

- Production read-only validation verified target auth user `4666c980-df61-4285-8007-0c065ab32e70`.
- The old dry-run defects were confirmed and fixed in repo-side SQL/docs.
- Production read-only checks found no `pushup_days` or `workout_days` conflicts.
- Production read-only checks found both target and `solo` `user_settings` rows present, with disjoint `entries` day keys.
- No production mutation was performed.
- The revised production dry-run has not been rerun yet from the updated checked-in SQL.

## Recommended Issue Order

1. Docs-only persistence v2 design plan
2. Issue-backed implementation tickets from that design
3. Re-run and review the revised legacy `solo` production dry-run manually
4. Implement the canonical push-up persistence source of truth
5. Implement atomic day writes after the source-of-truth decision
6. Add deployed auth/persistence smoke validation with a disposable account or operator checklist automation
7. Later: address Vite bundle/chunk warnings, SMTP/auth hardening, historical views, export/backup, and broader UX polish
