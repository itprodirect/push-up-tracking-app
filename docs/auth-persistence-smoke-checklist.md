# Auth + Persistence Smoke Checklist

This is the narrow manual smoke path for the current auth + persistence slice.

Use it after PR1 user-scoped persistence is deployed and before any broader beta-facing changes.

## Purpose

Validate the highest-risk shipped path quickly:

- approved-user auth gate works
- session restore works
- sign-out works
- a new push-up entry persists
- a new workout entry persists
- data is still present after reload and after sign-out/sign-in

## Preconditions

- Use an approved Supabase Auth email address.
- Use a browser profile that is easy to reset or inspect.
- Confirm the deployed environment includes the merged PR1 user-scoped persistence change.
- Do not mix this checklist with any legacy `solo` backfill execution.

## Smoke Path

### 1. Signed-out gate

1. Open the app in a fresh tab while signed out.
2. Confirm the app shows the sign-in gate.
3. Confirm the main app shell is not visible yet.

Expected result:

- `Sign in` is shown.
- The app content is gated behind auth.

### 2. Approved-user sign-in

1. Enter an approved email.
2. Click `Send magic link`.
3. Complete the sign-in flow from the received email.

Expected result:

- The request succeeds.
- After following the link, the signed-in app shell appears.
- The signed-in email is visible in the auth bar.

### 3. Session restore

1. While signed in, refresh the page.

Expected result:

- The session is restored without returning to the sign-in gate.
- The app shell stays mounted.

### 4. Push-up persistence

1. On the `Push-Ups` tab, add one set with `+10`.
2. Confirm the total increases.
3. Refresh the page.

Expected result:

- The push-up total remains present after reload.

### 5. Workout persistence

1. Switch to the `Workouts` tab.
2. Add one exercise, for example `Bench Press`.
3. Add one set, for example `100 x 10`.
4. Refresh the page.

Expected result:

- The workout day still shows the exercise and set after reload.
- The day total volume remains present.

### 6. Sign-out

1. Click `Sign out`.

Expected result:

- The app returns to the sign-in gate.
- The signed-in app shell is no longer visible.

### 7. Sign back in and verify retained data

1. Sign back in with the same approved account.
2. Check the same push-up day and workout day again.

Expected result:

- Previously entered push-up data is still present.
- Previously entered workout data is still present.

## Notes

- Record the exact date used during the smoke so reload and post-sign-in checks target the same day.
- If a failure appears, capture whether the issue is auth-only, load-only, save-only, or post-reload/post-sign-in restoration.
- This checklist is intentionally manual because the repo does not currently include a practical live-auth E2E harness.
