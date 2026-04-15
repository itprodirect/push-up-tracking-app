# Decision Log

Lightweight record of important product and architecture decisions.

---

### 2026-04 - Supabase as shipped v1 persistence backend

**Context:** Earlier planning docs assumed a Vercel + AWS path. The merged persistence implementation that is now live in production uses Supabase behind a Vercel serverless boundary.
**Decision:** Treat Supabase as the canonical v1 cloud persistence backend for the live app.
**Why:** This is the implemented and deployed runtime path, with schema, API behavior, and validation already in place.
**Impact:** Current-state docs, architecture docs, and future follow-up work should assume Supabase + `/api/persistence`, not the earlier DynamoDB/S3 planning path.

---

### 2026-04 - Day-scoped writes through `/api/persistence`

**Context:** Persistence work needed to stop replacing broad owner-level payloads for every update and align cloud writes more closely to how the UI edits data.
**Decision:** Persist changes through `/api/persistence` using day-scoped update behavior.
**Why:** Day-scoped writes reduce blast radius, fit the app's day-based logging model, and make rollout behavior easier to reason about.
**Impact:** Push-up and workout persistence should be documented and extended as per-day operations, not as full-owner replacement flows.

---

### 2026-04 - Keep local fallback and local-only UI state during rollout

**Context:** Supabase v1 shipped during solo alpha, where low-friction rollout mattered more than removing every local path immediately.
**Decision:** Keep `localStorage` fallback active during rollout and leave `app.tab` local-only.
**Why:** `app.tab` is UI preference state, not shared workout data, and local fallback reduces rollout risk while the cloud path settles.
**Impact:** Same-day local-over-remote merge behavior remains for now, and future follow-up work must explicitly decide when fallback is removed or conflict handling changes.

---

### 2026-04 - Vercel as deployment platform

**Context:** Needed a deployment target for the Vite + React app.
**Decision:** Deploy on Vercel with static build + future API routes.
**Why:** Vercel handles both static hosting and serverless functions. No separate backend infra needed during alpha.
**Impact:** Frontend and API routes live in the same repo and deploy together.

---

### 2026-04 - DynamoDB as primary persistence

**Context:** App needed an initial cloud persistence plan while the backend approach was still undecided.
**Decision:** Use DynamoDB as the planned source of truth for application records during early architecture planning.
**Why:** Serverless-native persistence looked like a good fit at planning time.
**Impact:** Historical planning note only. Supabase now supersedes this for the shipped v1 runtime.

---

### 2026-04 - S3 as supporting storage layer

**Context:** The app will need exports, backups, and eventually generated artifacts. These are file-oriented, not record-oriented.
**Decision:** Use S3 for file storage (exports, backups, AI artifacts, future attachments). Not as the primary app database.
**Why:** S3 is the natural fit for file blobs. Keeping it separate from the primary app database avoids scope confusion.
**Impact:** Historical planning note. Export and backup work still remains, but the live persistence runtime is not the earlier AWS design.

---

### 2026-04 - Dogfooding-first rollout

**Context:** The app is being built for real use, not as a demo.
**Decision:** Solo alpha (Nick) uses the app daily before any external beta user is added.
**Why:** Real usage reveals real problems. Adding users too early creates support burden before the foundation is solid.
**Impact:** Feature priority is driven by actual daily use, not speculative user needs.

---

### 2026-04 - Auth required before external beta

**Context:** The app has no user identity today. Solo alpha can operate without auth because there is one trusted user.
**Decision:** No external beta user will be added until a real auth path is in place.
**Why:** Without auth, there is no way to isolate user data or protect the persistence boundary correctly.
**Impact:** Auth selection is deferred in implementation but not in planning. The persistence boundary should be designed so auth can be added without a rewrite.

---

### 2026-04 - Browser never talks directly to the cloud backend

**Context:** The frontend needs to read and write data that lives outside the browser.
**Decision:** All cloud access goes through Vercel serverless endpoints. The browser never calls the backing service directly.
**Why:** Keeps credentials server-side. Creates a stable API contract for the frontend regardless of backend changes.
**Impact:** Frontend persistence migration means switching from direct `localStorage` assumptions to fetch-based API calls.

---

### 2026-04 - Set-level notes deferred from first cloud version

**Context:** Notes exist at workout-day and exercise level. Set-level notes were considered.
**Decision:** Defer set-level notes from the first cloud persistence version.
**Why:** Keeps the initial schema and persistence logic simpler. Can be added later without breaking the model.
**Impact:** The first cloud version only needs note fields at workout-day and exercise level.

---

_Add new decisions above this line. Use the same format._
