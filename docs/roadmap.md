# Roadmap

## Exists Today

- Vercel-hosted frontend
- `localStorage` persistence only
- No cloud backup, exports, or durable sync
- No auth path for external users

## Next

### Phase 1: Architecture And Data Contracts

- Lock the Vercel + AWS architecture.
- Define DynamoDB as the application source of truth.
- Define S3 responsibilities early so exports and backups do not become an afterthought.
- Keep notes scoped to workout-day and exercise level for the first cloud version.

### Phase 2: Server Boundary

- Add Vercel API routes as the only backend boundary.
- Move reads and writes for workouts, push-ups, notes, and settings behind the API.
- Keep browser-side persistence concerns narrow during migration.

### Phase 3: Storage Migration

- Shift from `localStorage`-only persistence to API-backed persistence.
- Preserve current workout-entry behavior while the storage layer changes.
- Validate history and aggregation logic against cloud data rather than only local state.

### Phase 4: File-Oriented Support

- Add S3-backed exports and backup flows.
- Define how generated artifacts will be stored without changing the main application record model.

### Phase 5: Beta Readiness

- Add the minimum auth path required before external beta.
- Improve loading states, error handling, and deployment documentation.

## Deferred On Purpose

- Direct browser access to AWS
- Set-level notes in the first cloud version
- Rich attachment workflows
- AI-assisted features that depend on cloud-stored history
- Broader user and account management beyond limited beta needs

## Recommended Implementation Order

1. Define cloud persistence architecture for Vercel + AWS.
2. Add the DynamoDB data model for workouts, push-ups, notes, and settings.
3. Add Vercel API routes for workout CRUD and history reads.
4. Add the S3 support plan for exports, backups, and AI artifacts.
5. Migrate persistence from `localStorage`-only to API-backed storage.
6. Define the minimal auth path required before external beta.
7. Add exports, backups, validation, and operational polish.

## Exit Criteria By Stage

### Solo Alpha Cloud Persistence

- Cloud write and read path exists behind Vercel API routes.
- DynamoDB is the source of truth for core app entities.
- S3 plan is documented and export or backup work is queued.
- Local behavior is preserved from the user perspective.

### Limited Beta Readiness

- Auth approach is selected and scoped.
- Deployment and environment documentation is complete.
- Error handling and loading states are acceptable for real users.
- Backup and export paths exist or are explicitly scheduled.
