# Agent Workflow

How coding agents (Claude Code, Codex, etc.) should work in this repo.

## Before You Start

1. Read `docs/08-heartbeat.md` to understand what matters right now.
2. Read `docs/09-memory.md` for durable constraints and patterns.
3. Read the issue you're working on. Understand the acceptance criteria.
4. Check `docs/01-current-state.md` and `docs/02-architecture.md` if the issue touches persistence, storage, or app structure.

## Starting Work

- Work from a GitHub issue. If there's no issue, ask whether one should be created first.
- Create a branch named for the issue: `feat/issue-11-api-routes`, `fix/issue-23-date-bug`, etc.
- Keep scope to the issue. If you discover adjacent work, note it — don't do it.

## While Working

- **Keep diffs narrow.** Touch only the files the issue requires. Don't reformat unrelated code, reorganize imports elsewhere, or fix things outside scope.
- **Don't overbuild.** Implement what the issue asks for. Resist the urge to add extra features, abstractions, or "nice-to-haves" that aren't in the acceptance criteria.
- **Run tests before committing.** `npm test` and `npm run build` should pass.
- **If you change architecture or behavior**, update the relevant doc (`02-architecture.md`, `01-current-state.md`, etc.) in the same PR.

## Docs Updates

Update docs when your work changes any of the following:
- What exists today (→ `01-current-state.md`)
- How the system is structured (→ `02-architecture.md`)
- What is next (→ `03-roadmap.md`, `backlog.md`)
- Important decisions made during the work (→ `05-decision-log.md`)

Don't update docs for minor code changes that don't affect the above.

## Session Notes

After a meaningful work session, fill out a session log using the template in `docs/06-session-log-template.md`. Save it as `docs/sessions/YYYY-MM-DD-issue-N.md` (create the `docs/sessions/` directory if needed).

Session logs help the next agent (or human) understand what happened, what's left, and what to watch for.

## Commit and PR

- Commit messages should be descriptive: `feat: add Vercel API route for workout CRUD` not `update stuff`.
- PR descriptions should include: what changed, why, what was tested, and any follow-up needed.
- If the implementation is partial, say so explicitly in the PR body. Partial is fine — hidden partial is not.

## What to Avoid

- Touching files unrelated to the issue.
- Adding dependencies without explicit approval.
- Introducing new patterns or abstractions that aren't in the architecture doc.
- Batch-reformatting or linting changes mixed with feature work.
- Assuming auth, multi-user, or cloud features exist when they don't yet.
