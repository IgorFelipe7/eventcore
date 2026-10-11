# Testing methodology

The rule: **a guarantee that depends on the database is tested against the database.** Nothing that claims a lock, a constraint or a transaction boundary is mocked.

## Layers

| Layer | Where | Runs against | What it proves |
|---|---|---|---|
| Domain unit | `packages/domain/test` | Pure functions | Transition tables, registration and cancellation policy, capacity planning. |
| Model-based property | `packages/domain/test/invariants.property.test.ts` | 500 seeded random command sequences | I1, the counter projection and "no idle seat while queued" hold after every command. |
| Contract | `packages/contracts/test`, `tests/http/operations.test.ts` | Zod schemas, generated OpenAPI | Requests are validated at the boundary; the published document matches the code. |
| Auth | `packages/auth/test` | `jose` | Issuer, audience, expiry and the demo-namespace restriction. |
| HTTP integration | `tests/http` | Real Fastify app + PostgreSQL 18 | Problem details, idempotency, organizer workflows, audit and outbox writes. |
| Concurrency | `tests/concurrency` | Real Fastify app + PostgreSQL 18, up to 40 pooled connections | Last seat, 100-on-10, FIFO under racing cancellations, capacity changes during a rush, the naive baseline. |
| Security | `tests/security` | Real app + database | Cross-tenant reads and writes, smuggled fields, forged tokens. |
| Resilience | `tests/resilience` | Real worker relay + database | Provider outage, recovery, dead letters, concurrent relays. |
| End to end | `tests/e2e` | Browser, web app, API, database | The participant journey, organizer isolation, keyboard and reduced-motion use, axe WCAG 2.2 AA, 360 px layout. |
| Lab recording | `tests/lab` | Same as concurrency | Produces the replay files the web app renders, and fails if a safe scenario breaks an invariant. |

## Database isolation

`tests/support/global-setup.ts` starts one PostgreSQL 18 container with Testcontainers, migrates a template database once, and every test file clones its own database from that template with `CREATE DATABASE … TEMPLATE`. Files never share rows, and cloning takes milliseconds. Set `TEST_DATABASE_ADMIN_URL` to use an existing server instead of a container.

## Concurrency tests

Concurrency is produced by issuing many requests at once with `Promise.all` against the in-process Fastify app (`app.inject`). The HTTP layer is real; there is no network hop. The database receives genuinely concurrent transactions over separate pooled connections, which is what the invariants are about.

Every concurrency test ends by reading the integrity view (`readIntegrity`): capacity, the counter, and counts of confirmed and waitlisted rows computed from the rows themselves. A test that only checks HTTP responses could miss a counter that drifted from the rows.

The naive baseline (`tests/support/naive-registration.ts`) exists to prove the hazard is real in this environment. It is never imported by application code.

## What the numbers do not mean

- Latencies in the Lab are caller-observed on one machine, with the caller, the API and the database sharing it. They include waiting for a pooled connection and for the inventory lock.
- No throughput figure is published. A load test with `k6` is prepared in `tests/load/` but has not been run against a deployed environment, so it has no results to report.
- Lighthouse and trace figures in `docs/experience/09-validation.md` are lab measurements on localhost without network throttling. They locate risks; they are not field data.

## Commands

```bash
pnpm test                  # every Vitest project, against a disposable PostgreSQL 18
pnpm vitest run tests/concurrency
pnpm test:e2e              # needs pnpm db:up; starts the API and web app if they are not running
pnpm lab:record            # re-records apps/web/src/lab/replays/*.json
```
