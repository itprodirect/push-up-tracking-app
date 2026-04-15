# Heartbeat

_Last updated: April 2026_

## Current Phase

Solo alpha with Supabase v1 persistence live in production. One user dogfooding the app daily.

## Top Priorities

1. Stabilize Supabase rollout behavior, especially cloud error visibility and same-day conflict handling -> #18
2. Clean up environment and deployment documentation around the shipped Vercel + Supabase path -> #17
3. Define the auth path that replaces the current hard-coded solo owner model before any external beta -> #14

## Actively Dogfooding

- Push-up daily logging and goal tracking
- Workout logging with exercise catalog, recent suggestions, and category auto-fill
- Supabase-backed save and load through `/api/persistence` with local fallback still enabled

## Blocked

- Nothing is currently blocked.

## Do Not Work On Yet

- Multi-user account management beyond the upcoming auth decision
- AI-assisted features beyond current logging and history needs
- Attachment or media uploads
- PWA or offline-first changes

## Recommended Issue Order

1. #18 - Error handling and loading states for cloud save/load
2. #17 - Environment and deployment documentation
3. #14 - Auth path for beta
4. #16 - Historical views and cloud aggregation validation
5. #15 - Export and backup path
