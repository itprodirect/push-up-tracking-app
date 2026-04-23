# Heartbeat

_Last updated: April 2026_

## Current Phase

Solo alpha with auth-gated UI, auth-protected Supabase persistence, and the first decorative visual polish pass live in production.

## Top Priorities

1. Re-run the revised legacy `solo` backfill dry-run in production using the checked-in SQL from the current issue #39 safety PR
2. Review the updated `user_settings` merge checks and only consider apply if that revised dry-run returns fully clean
3. Decide SMTP/custom email provider and auth rate-limit hardening path for any broader beta

## Actively Dogfooding

- Push-up daily logging and goal tracking
- Workout logging with exercise catalog, recent suggestions, and category auto-fill
- Approved-user magic-link sign-in, session restore, and sign-out
- Supabase-backed save and load through `/api/persistence` with local fallback still enabled
- Compact sync status for cloud load, save progress, save success, and cloud-sync failures
- Auth-protected persistence API with authenticated-user-scoped cloud ownership live
- Subtle generated imagery on the Push-Ups and Workouts heroes, workout empty state, and trend-card analytics accents

## Recent Session Summary

- Shipped the first generated-imagery visual polish pass: `PageHero`, page banners, workout empty-state illustration, and low-opacity trend-card accents.
- Added the narrow nested-PNG `.gitignore` exception needed for `public/images/app/...` assets to deploy correctly.
- Validation passed with the full test suite, production build, and live visual review after merge.

## Blocked

- The manual legacy `solo` apply path remains blocked until the revised production dry-run returns fully clean.

## Do Not Work On Yet

- Multi-user account management beyond the upcoming user-scoped persistence slice
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

1. Re-run the revised legacy `solo` dry-run in production and inspect the new summary fields
2. SMTP/custom email provider and auth rate-limit hardening
3. #16 - Historical views and cloud aggregation validation
4. #15 - Export and backup path
