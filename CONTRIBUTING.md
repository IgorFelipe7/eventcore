# Contributing

## Before you open a pull request

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
```

All four run in CI. If a change touches registration, cancellation, capacity or the outbox, also run `pnpm lab:record`: it fails when a safe scenario breaks an invariant, and the updated replay files belong in the same pull request.

## Rules of the codebase

- `packages/domain` imports nothing from Fastify, Next.js, Drizzle or `pg`. ESLint enforces it.
- Any command that touches capacity or the waitlist locks `event_inventory` first, after claiming its idempotency key. Keep the lock order identical everywhere (ADR 0002).
- Mutations write their history, audit entry and outbox event in the same transaction.
- Organizer queries filter by the organization in the path, and the route resolves membership before doing anything else.
- Never trust identity, tenant or role fields from a request body.
- Errors leave the API as problem documents from `PROBLEM_CATALOG`; add a code there before using it.
- No personal data in logs, audit rows, outbox payloads or seeds.
- A change to the visual system starts in `DESIGN.md`.

## Commits

Conventional Commits: `feat(scope):`, `fix(scope):`, `test(scope):`, `docs:`, `ci:`, `chore:`. The body explains why, not what.

## Decisions

A structural change gets an ADR in `docs/adr`, numbered, with context, options, the decision and its consequences.
