# Decision Log

Lightweight record of important product and architecture decisions.

---

### 2026-04 — Vercel as deployment platform

**Context:** Needed a deployment target for the Vite + React app.
**Decision:** Deploy on Vercel with static build + future API routes.
**Why:** Vercel handles both static hosting and serverless functions. No separate backend infra needed during alpha.
**Impact:** Frontend and API routes live in the same repo and deploy together.

---

### 2026-04 — DynamoDB as primary persistence

**Context:** App needs cloud persistence to replace localStorage. Evaluated options for a serverless-friendly database.
**Decision:** Use DynamoDB as the source of truth for all application records (workouts, push-ups, notes, settings).
**Why:** Serverless-native, scales to zero cost at low volume, fits the key-value access patterns of the app. Good fit for Vercel functions.
**Impact:** Data model designed around `pk=userId, sk=date` patterns. All reads and writes go through Vercel API routes.

---

### 2026-04 — S3 as supporting storage layer

**Context:** The app will need exports, backups, and eventually generated artifacts. These are file-oriented, not record-oriented.
**Decision:** Use S3 for file storage (exports, backups, AI artifacts, future attachments). Not as the primary app database.
**Why:** S3 is the natural fit for file blobs. Keeping it separate from DynamoDB prevents scope confusion.
**Impact:** S3 is introduced early in planning but doesn't block core persistence work.

---

### 2026-04 — Dogfooding-first rollout

**Context:** The app is being built for real use, not as a demo.
**Decision:** Solo alpha (Nick) uses the app daily before any external beta user is added.
**Why:** Real usage reveals real problems. Adding users too early creates support burden before the foundation is solid.
**Impact:** Feature priority is driven by actual daily use, not speculative user needs.

---

### 2026-04 — Auth required before external beta

**Context:** The app has no user identity today. Solo alpha can operate without auth because there's one trusted user.
**Decision:** No external beta user will be added until a real auth path is in place.
**Why:** Without auth, there's no way to isolate user data or prevent unauthorized access to the API.
**Impact:** Auth selection is deferred in implementation but not in planning. API routes should be designed so auth can be added as middleware.

---

### 2026-04 — Browser never talks directly to AWS

**Context:** The frontend needs to read/write data that will live in DynamoDB and S3.
**Decision:** All AWS access goes through Vercel API routes. The browser never calls AWS services directly.
**Why:** Keeps credentials server-side. Creates a stable API contract for the frontend regardless of backend changes.
**Impact:** Frontend persistence migration means switching from localStorage calls to fetch-based API calls.

---

### 2026-04 — Set-level notes deferred from first cloud version

**Context:** Notes exist at workout-day and exercise level. Set-level notes were considered.
**Decision:** Defer set-level notes from the first cloud persistence version.
**Why:** Keeps the initial DynamoDB schema simpler. Can be added later without breaking the model.
**Impact:** DynamoDB schema only needs note fields at workout-day and exercise level initially.

---

_Add new decisions above this line. Use the same format._
