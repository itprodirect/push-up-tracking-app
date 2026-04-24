# Decision Log

Lightweight record of important product and architecture decisions.

---

### 2026-04 - Deep-review stabilization before persistence v2 implementation

**Context:** A GPT-5.5 read-only deep review found repo-health issues around persistence documentation, request validation, noisy React test warnings, CI smoke coverage, and the still-open push-up persistence source-of-truth problem.
**Decision:** Stabilize the existing v1 path first: document authenticated-user ownership accurately, reject invalid persistence payloads before Supabase writes, remove React `act(...)` warnings in tests without suppressing console errors, and add the existing mocked/local Playwright smoke suite to CI. Do not start persistence v2 implementation until there is a docs-only design plan.
**Why:** The app is healthier if the current boundary is well described, validated, and covered before changing its storage model. The remaining push-up source-of-truth issue needs an explicit design rather than an opportunistic code change.
**Impact:** The next session should create the persistence v2 design plan first, then issue-backed implementation tickets. Persistence v2 is not designed or implemented yet, and the legacy `solo` backfill is not complete.

---

### 2026-04 - Decorative imagery stays subtle, branded, and reusable

**Context:** The app needed a first visual polish pass after the core auth and persistence foundation shipped, without making the logging workflows feel noisy or distracting.
**Decision:** Use generated decorative imagery as subtle support: reusable `PageHero` banners on Push-Ups and Workouts, a low-opacity analytics accent on trend cards, and a workout empty-state illustration. Keep the assets under `public/images/app` and track nested PNGs with a narrow `.gitignore` exception.
**Why:** Low-distraction imagery makes the app feel more finished while preserving readability and fast daily logging. A shared `PageHero` avoids duplicating page-specific banner code.
**Impact:** The decorative image lane is complete and live. Future work should be limited to small crop, opacity, or spacing refinements if dogfooding shows a real visual issue.

---

### 2026-04 - Legacy `solo` `user_settings` backfill must use conservative merge validation

**Context:** Read-only production validation of the legacy `solo` backfill lane found no `pushup_days` or `workout_days` collisions for the verified target user, but it did find that both the target and `solo` `user_settings` rows already exist with disjoint `pushup_settings.entries` day keys. The older repo-side SQL also had dry-run defects around placeholder validation, JSON key counting, and one conflict result-set shape.
**Decision:** Update the backfill runbook and admin SQL so the dry-run uses session-local temp objects only, validates `user_settings` shape, flags unexpected top-level keys, checks entry-day overlap explicitly, and treats `user_settings` as a conservative merge-then-remove-source path instead of a naive owner-key reassignment.
**Why:** `user_settings` is no longer safe to treat like a simple parent-row owner swap when a target row already exists. The safest operational path is to abort on ambiguity and only allow a merge when the known `entries` shape is clean and source/target day keys are disjoint.
**Impact:** The next session should rerun the revised checked-in dry-run SQL manually in production and inspect the new summary fields before any apply path is considered. No production mutation was performed during this validation/fix session.

---

### 2026-04 - Supabase Auth v0 closes public UI access

**Context:** The app needed a minimal real auth path before continuing beyond a trusted public UI. Supabase was already the live persistence backend, so the smallest integrated auth path mattered more than broad auth feature depth.
**Decision:** Ship Supabase Auth v0 with approved-user email magic-link sign-in, session restore, and sign-out.
**Why:** This closes public UI access with minimal architecture churn and keeps the auth boundary aligned with the existing Supabase integration.
**Impact:** Current-state and architecture docs should assume auth is live. Future auth work should build from this minimal shipped path rather than from a no-auth baseline.

---

### 2026-04 - Protect `/api/persistence` with Supabase bearer-token verification while keeping `owner_key = 'solo'`

**Context:** Auth v0 gated the UI, but the persistence API also needed protection without expanding scope into schema changes or a full ownership migration.
**Decision:** Require a valid Supabase bearer token for `GET` and `POST` requests to `/api/persistence`, while keeping the temporary single-owner model `owner_key = 'solo'`.
**Why:** This protects the serverless persistence boundary immediately and preserves the minimal slice size needed for rollout.
**Impact:** Historical note. This protected the API first; later authenticated-user scoped persistence replaced the live `solo` ownership model. Any remaining `solo` rows are now legacy backfill data only.

---

### 2026-04 - Defer SMTP/custom email provider setup and auth hardening beyond auth v0

**Context:** The auth v0 goal was to close public UI access and protect the current persistence boundary, not to finish full production-grade auth operations.
**Decision:** Defer SMTP/custom email provider setup, branded/authenticated mail delivery work, and auth rate-limit hardening to follow-up work.
**Why:** Those pieces were not required to ship the minimal auth gate and would have expanded scope significantly.
**Impact:** Docs should describe the current auth stack as live but intentionally minimal. Broader beta-readiness work still needs mail and auth hardening decisions.

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

**Context:** Historical pre-auth planning note. At this stage the app had no user identity, and solo alpha could operate without auth because there was one trusted user.
**Decision:** No external beta user will be added until a real auth path is in place.
**Why:** Without auth, there is no way to isolate user data or protect the persistence boundary correctly.
**Impact:** This decision drove the later auth v0 implementation and authenticated-user scoped persistence work. The remaining `owner_key = 'solo'` concern is legacy production backfill, not the live runtime model.

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

### 2026-04 - Supabase Auth as preferred next auth path

**Context:** Auth is needed before any external beta user. The app already uses Supabase for persistence, so the auth provider choice affects integration complexity and the owner model transition.
**Decision:** Prefer Supabase Auth as the next auth path for the current architecture and scope. Defer Clerk for now unless future product requirements justify the added dependency.
**Why:** Supabase Auth integrates naturally with the existing Supabase backend, avoids adding a second external service, and keeps the auth boundary close to the persistence boundary. Row-level security can build directly on Supabase Auth user IDs.
**Impact:** This preference is now implemented in auth v0, and live persistence ownership is now derived from the verified Supabase user id. Clerk remains a valid option to revisit later if the product needs stronger out-of-the-box auth UX, orgs or teams support, or broader productized auth requirements.

---

_Add new decisions above this line. Use the same format._
