# North Star

## What This Is

A personal workout tracking app that makes it easy to log push-ups, machine exercises, and free-weight work — then see your history and trends over time.

## Who It Is For

Right now: Nick (solo dogfooder).
Next: one beta user at a time, added deliberately.
Later: a small number of trusted users who want simple, reliable workout logging without subscription bloat.

## Why It Matters

Most fitness apps are overbuilt, ad-driven, or subscription-gated for basic tracking. This app exists to be a fast, focused tool that does logging and history well — and eventually backs it up to the cloud so data isn't trapped in one browser.

## What Good Looks Like (6–12 Months)

- All workout data persists in DynamoDB, not just localStorage.
- Exports and backups flow through S3.
- The app works across devices for the same user.
- At least 1–3 beta users are actively logging workouts.
- Auth is in place — simple, not enterprise.
- The app still feels fast and focused. No feature creep.

## Product Philosophy

- **Logging speed wins.** The app should never make you fight the UI to record a set.
- **Data durability matters.** Cloud persistence is the single most important infrastructure goal.
- **Small beats big.** Ship narrow, useful improvements over large speculative features.
- **Dogfood first.** Every feature should be used by us before it reaches anyone else.

## Rollout Philosophy

1. Build and stabilize on a single user (solo alpha).
2. Add one beta user at a time. Watch what breaks.
3. Auth is the gate to external beta — no shortcuts.
4. Keep the user count low until cloud persistence, error handling, and backup paths are solid.
