# Heartbeat

_Last updated: April 2026_

## Current Phase

Solo alpha with auth-gated UI and auth-protected Supabase persistence live in production.

## Top Priorities

1. Replace hard-coded `owner_key = 'solo'` with user-scoped persistence tied to the authenticated user
2. Stabilize Supabase rollout behavior, especially cloud error visibility and same-day conflict handling -> #18
3. Decide SMTP/custom email provider and auth rate-limit hardening path for any broader beta

## Actively Dogfooding

- Push-up daily logging and goal tracking
- Workout logging with exercise catalog, recent suggestions, and category auto-fill
- Approved-user magic-link sign-in, session restore, and sign-out
- Supabase-backed save and load through `/api/persistence` with local fallback still enabled
- Auth-protected persistence API with temporary single-owner storage via `owner_key = 'solo'`

## Blocked

- Nothing is currently blocked.

## Do Not Work On Yet

- Multi-user account management beyond the upcoming user-scoped persistence slice
- AI-assisted features beyond current logging and history needs
- Attachment or media uploads
- PWA or offline-first changes

## Recommended Issue Order

1. Replace temporary `owner_key = 'solo'` with user-scoped persistence
2. #18 - Error handling and loading states for cloud save/load
3. SMTP/custom email provider and auth rate-limit hardening
4. #16 - Historical views and cloud aggregation validation
5. #15 - Export and backup path
