# Push-Up Tracking App

Small Vite + React workout tracker with two main flows:

- push-up logging
- machine/free-weight workout logging with local `localStorage` persistence

## Run Locally

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm test
npm run build
```

## Workout Entry Flow

The workout screen in [src/Workouts.tsx](/C:/Users/user/push-up-tracking-app/src/Workouts.tsx) now supports both structured exercise entry and manual entry.

- The exercise name field remains a normal text input.
- A native HTML `datalist` suggests canonical catalog exercises while still allowing free typing.
- On save, known canonical names are stored as-is.
- Known aliases and legacy variants are normalized to their canonical exercise names on save.
- Unknown custom exercise names are preserved unchanged.

Category behavior:

- Known canonical exercises and known aliases can resolve to a default category.
- The form auto-fills the category chip when the typed value maps to a known catalog exercise.
- Manual/custom exercise entry is still allowed.
- Legacy saved category labels such as `push`, `pull`, and `legs` still load into the newer category labels.

Recent suggestions:

- Recent suggestions are derived from logged exercises with at least one set.
- Known aliases are normalized and deduped to their canonical label before display.
- Known catalog exercises sort ahead of custom exercises.
- Suggestion chips show a lightweight `Catalog` or `Custom` badge.
- The existing manual-entry and `datalist` flow stays in place.

## Exercise Catalog Architecture

Catalog-related behavior is intentionally concentrated in a few files:

- [src/exerciseCatalog.ts](/C:/Users/user/push-up-tracking-app/src/exerciseCatalog.ts)
  Canonical exercise list, alias map, category metadata, and helpers such as `normalizeExerciseName`, `getExerciseCategory`, `getCanonicalExerciseName`, and `isKnownExercise`.
- [src/Workouts.tsx](/C:/Users/user/push-up-tracking-app/src/Workouts.tsx)
  Workout form behavior, `datalist` suggestions, category auto-fill, quick-add handling, and recent suggestion rendering.
- [src/workoutLog.helpers.ts](/C:/Users/user/push-up-tracking-app/src/workoutLog.helpers.ts)
  Workout summary/reporting helpers that aggregate by normalized canonical exercise name where appropriate.
- [src/storage.ts](/C:/Users/user/push-up-tracking-app/src/storage.ts)
  `localStorage` persistence, shape normalization on load, and backward-compatible category normalization.

Related tests:

- [src/exerciseCatalog.test.ts](/C:/Users/user/push-up-tracking-app/src/exerciseCatalog.test.ts)
- [src/Workouts.test.tsx](/C:/Users/user/push-up-tracking-app/src/Workouts.test.tsx)
- [src/workoutLog.helpers.test.ts](/C:/Users/user/push-up-tracking-app/src/workoutLog.helpers.test.ts)
- [src/storage.test.ts](/C:/Users/user/push-up-tracking-app/src/storage.test.ts)

## Current Behavior Notes

- Existing workout records are not batch-migrated or rewritten.
- Normalization happens at save and reporting/use boundaries rather than through a full storage migration.
- Unknown custom exercises remain valid and are preserved as entered.
- Existing stored exercises still display correctly even if they were originally entered manually.
- Legacy category labels remain compatible during load.

## Next Recommended Improvements

- Add favorites or pinned exercises for faster repeat logging.
- Improve recent suggestion persistence and ranking beyond simple recency.
- Consider an optional richer picker later if the native `datalist` becomes too limiting.
