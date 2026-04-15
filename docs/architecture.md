# Architecture

## Exists Today

- Frontend: Vite + React app deployed on Vercel.
- Persistence: browser `localStorage` only.
- Data domains in use today:
  - push-up entries by day
  - workout days
  - exercises within a workout day
  - sets within each exercise
  - exercise-level notes
  - user settings such as daily goal
- Current backend boundary: none. The browser owns reads and writes directly.

## Current Limitations

- Data does not sync across browsers or devices.
- Backup and recovery depend on the same browser storage that can be cleared.
- There is no server-side validation, audit trail, or durable export path.
- The app is not ready for external beta users without a real auth plan.

## Target Architecture

- Frontend remains on Vercel.
- Server-side access is handled by Vercel functions or API routes.
- AWS is introduced intentionally behind that server boundary.
- DynamoDB becomes the primary application database and source of truth.
- S3 is added early as a supporting storage layer.

```text
Browser React app
  -> Vercel frontend
  -> Vercel API routes / serverless functions
  -> DynamoDB for application records
  -> S3 for file-oriented storage
```

## Data Ownership

### DynamoDB Source Of Truth

DynamoDB should be the source of truth for:

- workout days
- exercises
- sets
- notes
- push-up entries
- user settings

Notes should be planned initially at:

- workout-day level
- exercise level

Set-level notes are intentionally deferred from the first cloud version.

### S3 Responsibilities

S3 should be introduced early for:

- exports
- backups and snapshots
- AI artifacts or generated files
- future attachments or uploads

## Backend Boundary

- The browser should not talk directly to AWS services.
- Vercel API routes should own request validation, persistence orchestration, and response shaping.
- AWS credentials stay server-side in Vercel environment configuration.

## Rollout Guardrails

### Solo Alpha

- Can temporarily operate without full auth while the product remains limited to a single trusted user or operator.
- Should still use the Vercel API boundary so the client contract does not have to change again later.

### External Beta

- Requires a real auth path before inviting outside users.
- Auth selection can be deferred in implementation, but it cannot be deferred in planning.

## Recommended Implementation Shape

1. Document the architecture and contracts first.
2. Define the DynamoDB data model around current app entities.
3. Define the S3 storage plan for exports, backups, and generated artifacts.
4. Add Vercel API routes for workout and push-up persistence.
5. Migrate the frontend from `localStorage`-only persistence to API-backed reads and writes.
6. Add the minimum auth path before external beta.
