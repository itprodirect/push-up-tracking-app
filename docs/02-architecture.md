# Architecture

## Current Architecture

```
Browser (React SPA)
  ├── UI: Vite + React + Recharts
  ├── State: React component state
  └── Persistence: localStorage (versioned keys)
```

- No server-side code exists yet.
- No API routes, no `/api` directory.
- The browser owns all reads and writes directly to localStorage.
- Data domains stored today: push-up entries, workout days, exercises, sets, exercise notes, user settings (daily goal).

## Target Architecture

```
Browser (React SPA)
  → Vercel frontend (static build)
  → Vercel API routes / serverless functions
  → DynamoDB (application records)
  → S3 (file-oriented storage)
```

### Frontend Boundary

- Vite + React stays as-is on Vercel.
- The frontend calls Vercel API routes for persistence — never AWS directly.
- localStorage may remain as a local cache or offline fallback, but DynamoDB is the source of truth.

### Backend / API Boundary

- Vercel API routes (`/api/*`) handle all server-side logic.
- Routes own: request validation, persistence orchestration, response shaping.
- AWS credentials live in Vercel environment variables, never in the browser.

### DynamoDB Role

Primary application database. Source of truth for:
- Workout days, exercises, sets
- Push-up entries
- Exercise-level and workout-day-level notes
- User settings

Planned key design: `pk=userId, sk=date` (or composite sort key per entity type). Set-level notes are deferred from the first cloud version.

### S3 Role

Supporting storage layer (not the primary app database). Handles:
- Data exports (JSON, CSV)
- Backups and snapshots
- AI-generated artifacts
- Future attachments or media uploads

### Auth Status

- No auth exists today.
- Auth is **not required** for solo alpha (single trusted operator).
- Auth **is required** before any external beta user.
- Auth solution selection is deferred but must happen before beta rollout.
- The API boundary should be designed so adding auth later is a middleware concern, not a rewrite.

### localStorage Transition

- localStorage is the only persistence mechanism today.
- Storage keys are versioned (`*.v1`) to support future migration.
- The migration path: frontend switches from direct localStorage calls to API calls. localStorage may remain as a local cache.
- No batch migration of existing records is planned — normalization happens at save and read boundaries.

## Intentionally Deferred

- Direct browser → AWS access (always goes through Vercel API routes)
- Set-level notes in the first cloud version
- Rich attachment or media workflows
- AI features that depend on cloud-stored history
- Multi-user account management beyond limited beta
- PWA / offline-first architecture
