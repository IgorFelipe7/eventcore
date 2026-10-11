# EventCore

**Two requests. One seat. Exactly one confirmation.**

EventCore is a reservation engine for events with limited seats. Every decision for an event is serialized on a single PostgreSQL row, so capacity holds under concurrent load, retries never book twice, the waitlist keeps its order, and one organization can never see another's data. Every one of those claims has a test that runs against a real database — and a recorded run you can open in the browser.

![Sheet 01: the last-seat figure, with request A holding the inventory row lock while B waits](docs/media/sheet-01-last-seat.png)

## The result, recorded

Same load, same database, two implementations. 100 concurrent registrations for 10 seats:

| Implementation | Confirmed | Waitlisted | Invariant checks |
|---|---|---|---|
| Naive check-then-insert, no lock | **90 for 10 seats** | 0 | capacity ✗ · counter ✗ |
| EventCore | **10** | 90, positions 1–90 without gaps | all pass |

The other recorded scenarios, all passing every invariant check:

| # | Scenario | Outcome |
|---|---|---|
| 01 | Two people, one seat — then 30 more rounds | One confirmed, one first in line, in all 31 races |
| 03 | Ten identical clicks with one idempotency key | One decision, nine replays, one distinct answer |
| 04 | The server commits, the client never hears back, then retries | The retry gets the original confirmation, byte for byte |
| 05 | Ten cancellations race twenty newcomers | The first ten in line were promoted; no newcomer overtook the queue |
| 06 | Five capacity changes during a 60-person rush | Counter, rows and queue stay consistent; cuts below confirmed seats refused |
| 07 | An admin of the wrong organization probes six routes | All refused: 403 on their routes, 404 through ours; nothing changed |
| 08 | The notification provider is down | All registrations kept; four notifications delivered after recovery, none twice |

Recorded on 2026-10-07 at commit `321bed4` with `pnpm lab:record`: PostgreSQL 18.6, Node.js 24.12, Intel Core i5-10400, the real Fastify app driven in-process (no network hop), 40 pooled connections. Caller-observed p95 for the locked 100-request burst was 931 ms, because all 100 wait on one row lock and one pool. That is a single-machine measurement, not a production figure, and no throughput claim is made anywhere in this repository. The naive count varies between runs; it has never been 10.

## Run it

Requires Node.js 24, pnpm and Docker.

```bash
cp .env.example .env        # set AUTH_DEMO_SECRET to 32+ random characters
pnpm install
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm dev                    # web on :3000, API on :4000, worker
```

Then open <http://localhost:3000>, choose a demo persona under **Acting as**, and race for *The Last Seat*. Swagger UI is at <http://localhost:4000/docs>.

```bash
pnpm test                   # 101 tests in 18 files, against a disposable PostgreSQL 18
pnpm test:e2e               # 11 Playwright tests: the participant journey, axe WCAG 2.2 AA, 360 px
pnpm lab:record             # re-record the Lab; fails if a safe scenario breaks an invariant
```

## How it works

```
request ─ verify token ─ resolve membership ─ validate
        └─ BEGIN
           ├─ claim idempotency key        INSERT … ON CONFLICT DO NOTHING
           ├─ lock event_inventory          SELECT … FOR UPDATE
           ├─ re-read rules, row and queue  under the lock
           ├─ decide                        pure domain function
           ├─ write row, counter, history, audit entry, outbox event
           └─ store the answer on the key ─ COMMIT
        └─ worker relays the outbox, at least once, deduplicated
```

| Decision | Why | Record |
|---|---|---|
| Modular monolith | The hard rule is one synchronous decision; splitting it would turn a transaction into a protocol. | [ADR 0001](docs/adr/0001-modular-monolith.md) |
| Row lock on `event_inventory` under `READ COMMITTED` | Expresses "queue exists, so a newcomer waits" atomically; no retry storms; FIFO kept. `SKIP LOCKED` is used only for the outbox. | [ADR 0002](docs/adr/0002-postgres-capacity-lock.md) |
| Idempotency key committed with the effect | A concurrent duplicate waits on the unique index and reads the committed answer; nothing to poll. | [ADR 0003](docs/adr/0003-idempotency-contract.md) |
| Transactional outbox | The notification exists only if the change does; delivery is retried and deduplicated. | [ADR 0004](docs/adr/0004-transactional-outbox.md) |

The eight invariants (I1–I8), each with the layer that enforces it and the test that tries to break it, are in [`docs/00-vision.md`](docs/00-vision.md) and on Sheet 01 of the web app.

## Repository

```
apps/
  api/        Fastify 5 · application services, HTTP adapters, problem details, metrics
  worker/     Outbox relay, backoff, dead letters, integrity sweep
  web/        Next.js 16 · React 19 · Tailwind 4 · the Proof Sheet experience
packages/
  domain/     Rules and transition tables — no framework, ORM or driver imports
  contracts/  Zod schemas shared by API, web and the Lab recorder
  db/         Drizzle schema, reviewed SQL migrations, explicit-SQL repositories
  auth/       JWT verification and demo-token signing
tests/        Integration, concurrency, security, resilience, e2e, Lab recorder, k6 script
docs/         Vision, ADRs, state machine, data model, threat model, runbooks, experience docs
infra/        Docker Compose and the API and worker images
```

## The web experience

The interface treats the product as an engineering drawing set: every page is a sheet with a title block, every claim has a figure number and points at the test that proves it, and one signal colour marks only the contested seat, the lock and focus. The concept, the alternatives that were discarded, the copy and the design system were decided before any page was built — see [`docs/experience`](docs/experience) and [`DESIGN.md`](DESIGN.md). Lighthouse on the production build scored 100 for accessibility, best practices and SEO on `/`, `/explore` and `/lab`; the measurements and every finding fixed along the way are in [`docs/experience/09-validation.md`](docs/experience/09-validation.md).

| | |
|---|---|
| ![Sheet 04: the Reliability Lab comparing 90 naive confirmations with 10](docs/media/sheet-04-lab.png) | ![Sheet 02: the event board with live seat meters](docs/media/sheet-02-board.png) |

## Known limits

- One very hot event serializes on one row lock. That bound is deliberate, measurable and documented.
- Rate limits are per process until a shared store is configured.
- The Lab replays recorded runs from one machine; it never sends traffic.
- The k6 load script in [`tests/load`](tests/load) has not been run against a deployed environment, so there are no load results to report.

## Documentation

[Vision](docs/00-vision.md) · [State machine](docs/domain-state-machine.md) · [Data model](docs/data-model.md) · [API contract](docs/api-contract.md) · [Threat model](docs/threat-model.md) · [Testing methodology](docs/testing-methodology.md) · [Runbooks](docs/runbooks.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)

## License

[MIT](LICENSE) © 2026 Igor Felipe
