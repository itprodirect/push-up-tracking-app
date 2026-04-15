# Quality Gates

What "done enough to merge" means in this repo.

## Scope Discipline

- The PR addresses the issue it claims to address — nothing more.
- Unrelated changes (formatting, refactors, bonus features) belong in a separate PR.
- If the issue scope grew during implementation, note what expanded and why.

## Build and Tests

- `npm run build` passes with no errors.
- `npm test` passes with no failures.
- If you added new behavior, add or update tests for it.
- If tests are not feasible for the change (e.g., docs-only), say so in the PR.

## Docs

- If the change affects architecture, current state, or roadmap, update the relevant doc in the same PR.
- If a new decision was made, add it to `docs/05-decision-log.md`.
- Docs-only PRs don't need test changes.

## No Unrelated Churn

- Don't reformat files you didn't need to touch.
- Don't reorganize imports in files outside your scope.
- Don't upgrade dependencies unless that's the issue.

## PR Summary

- PR title should be descriptive: `feat: add workout CRUD API route`, not `updates`.
- PR body should include: what changed, why, what was tested, follow-ups if any.

## Partial Implementation

- Partial is fine. Hidden partial is not.
- If the issue isn't fully complete, say so explicitly in the PR body.
- List what was done, what remains, and whether a follow-up issue is needed.
- Don't merge broken states — partial means "the completed subset works correctly."
