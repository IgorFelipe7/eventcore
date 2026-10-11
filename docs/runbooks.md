# Runbooks

## Local environment

```bash
cp .env.example .env              # then set AUTH_DEMO_SECRET to 32+ random characters
pnpm install
pnpm db:up                        # PostgreSQL 18 on localhost:54329
pnpm db:migrate
pnpm db:seed                      # resets all data to the fictional demo set
pnpm dev                          # API :4000, worker, web :3000
```

The whole stack in containers: `docker compose -f infra/docker-compose.yml --env-file .env --profile app up --build`.

## Health

| Endpoint | Meaning | Use for |
|---|---|---|
| `GET /health/live` | The process is up. | Container liveness. Never touches the database. |
| `GET /health/ready` | The database answers `SELECT 1`. | Load balancer readiness. `503` while the database is unreachable. |
| `GET /metrics` | Prometheus exposition. | Scraping. Set `METRICS_TOKEN` outside a private network. |

## Symptoms and responses

### `business_invariant_violations` is above 0

1. The worker logs the affected `event_ids` under `operation: integrity.sweep`.
2. Read `GET /v1/organizations/{id}/integrity` for the organization to see which check fails.
3. Do **not** edit counters by hand. Find the transaction that wrote the drift through `registration_events.correlation_id` and the request logs with the same `request_id`.
4. Repair inside one transaction that locks the inventory row first, then recomputes `confirmed_count` from the rows, and record the repair in `audit_log`.

### `outbox_pending` keeps growing

1. Check the worker is running and its logs for `outbox.relay` failures.
2. Inspect `last_error` on the oldest pending rows. Transient provider errors resolve with backoff.
3. Rows are never dropped. After `WORKER_MAX_ATTEMPTS` they move to `dead_lettered_at IS NOT NULL`; `outbox_dead_lettered` reports how many.

### Re-driving dead letters

```sql
UPDATE outbox_events
SET dead_lettered_at = NULL, attempts = 0, next_attempt_at = now(), last_error = NULL
WHERE dead_lettered_at IS NOT NULL AND id = ANY($1);
```

Redelivery is safe: deliveries are deduplicated by the outbox event id.

### Many `TEMPORARY_UNAVAILABLE` problems

The API maps connection failures and timeouts to `503` with `Retry-After`. Clients retry with the same idempotency key, so nothing is duplicated. Check `/health/ready`, connection counts and the `statement_timeout` (5 s) for long-running queries.

### A single event is slow under a rush

Expected: commands for one event are serialized on its inventory row (ADR 0002). Check that transactions are short (no external calls inside them) and that the pool is not exhausted by other work. Do not raise the isolation level as a fix.

## Migrations

1. Change `packages/db/src/schema.ts`.
2. `pnpm db:generate` and review the SQL in `packages/db/migrations` by hand.
3. For changes to live columns use expand and contract: add, backfill, switch reads, then remove in a later release.
4. Migrations run as a separate step (`pnpm db:migrate`), never automatically on API start.

## Demo seed safety

`pnpm db:seed` truncates every table. It refuses to run with `NODE_ENV=production` unless `ALLOW_DEMO_SEED=true` is set explicitly for a demo database.
