# ADR 0005 · Public demo on serverless free tiers

- **Status:** Accepted
- **Date:** 2026-10-19

## Context

The project needs a public URL that a reviewer can open at any time. The production target is the pair of container images built in CI (`infra/Dockerfile`, targets `api` and `worker`), but always-on container hosts are paid, and the free ones put the process to sleep after a few idle minutes. A first request that waits 30 to 60 seconds for a cold container times out in the web app and shows the API as unavailable, which is the worst first impression a demo can give.

## Decision

1. The web app and the API run as two Vercel projects. The API keeps its Fastify application unchanged; `apps/api/src/serverless.ts` builds it once per instance and hands each request to it, and `apps/api/api/index.js` exposes that handler as a single function behind a catch-all rewrite (`apps/api/vercel.json`).
2. PostgreSQL 18 runs on Neon in AWS `us-east-1`, next to Vercel's default function region, so the several queries behind each page stay within the same region.
3. The API connects with Neon's direct connection string and a small pool (`DATABASE_POOL_SIZE=3`). The pooled endpoint is avoided because the pool sets `statement_timeout` as a startup parameter.
4. The worker does not run in the public demo.
5. `server.ts`, the Dockerfile and the container builds in CI stay as they are. The serverless entry is an addition, not a replacement.

## Consequences

- Rate limits are counted per function instance, so the effective limit is looser than `RATE_LIMIT_PER_MINUTE`. A shared store would fix it; the demo does not need one.
- `/metrics` reflects one instance at a time and is not a reliable view of the service. It stays protected by `METRICS_TOKEN`.
- Without the worker, outbox rows stay pending and the integrity sweep does not run. No page reads delivered notifications, so the demo behaves the same for a visitor. Capacity, idempotency and waitlist order are enforced inside the request transaction and do not depend on the worker.
- Migrations and the demo seed are run by hand against the Neon database (`docs/deployment.md`).

## Verification

`vercel build` of `apps/api` produces one Node 24 function. Run from its own output, with the package links restored, it answers `/health/ready` with the database, `/v1/events` and the Swagger UI assets.
