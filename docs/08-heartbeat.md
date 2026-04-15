# Heartbeat

_Last updated: April 2026_

## Current Phase

Solo alpha. One user dogfooding the app daily.

## Top Priorities

1. Define cloud persistence architecture (DynamoDB + S3 plan) → #9, #10, #12
2. Add Vercel API routes for workout CRUD → #11
3. Migrate frontend persistence from localStorage to API-backed → #13

## Actively Dogfooding

- Push-up daily logging and goal tracking
- Workout logging with exercise catalog, recent suggestions, and category auto-fill

## Blocked

- Nothing is currently blocked.

## Do Not Work On Yet

- Auth implementation (needs architecture decisions first)
- AI-assisted features (need cloud data first)
- Multi-user account management
- Attachment/media uploads
- PWA or offline-first changes

## Recommended Issue Order

1. #9 — Cloud persistence architecture
2. #10 — DynamoDB data model
3. #12 — S3 storage plan
4. #11 — Vercel API routes
5. #13 — Frontend persistence migration
6. #18 — Error handling and loading states
7. #14 — Auth path for beta
