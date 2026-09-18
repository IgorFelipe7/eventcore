# ADR 0001 · Modular monolith

- **Status:** Accepted
- **Date:** 2026-09-18

## Context

EventCore's hard problem is consistency: capacity, uniqueness, queue order and idempotency all have to hold inside a single atomic decision. Splitting registrations, inventory and waitlist into separate services would turn one local transaction into a distributed one, which means sagas, compensations and eventual consistency for rules that are fundamentally synchronous.

The team is one person. Operational surface area is a real cost.

## Decision

Build **one API process and one PostgreSQL database**, organized as explicit modules with clear boundaries:

```
identity · organizations · events · registrations · waitlist · audit · outbox · reporting
```

- `packages/domain` holds rules, transitions and errors. It imports nothing from Fastify, Next.js or the ORM.
- `packages/db` holds the schema, migrations and transactional repositories.
- `apps/api` holds HTTP adapters and application services. Controllers stay thin; transactions live next to the use case.
- `apps/worker` is a second process for side effects, fed by the transactional outbox.

A monorepo does not imply microservices.

## Consequences

**Positive**

- Every invariant is enforced inside a single `BEGIN … COMMIT`.
- One deployable API, one database to back up, one place to read logs.
- Module boundaries are visible in the folder structure and can be extracted later if a real scaling need appears.

**Negative**

- The API scales vertically first. Horizontal scaling is possible (stateless processes, the database serializes per event) but the database is the shared bottleneck.
- Module discipline is enforced by convention and review, not by network boundaries.

## Revisit when

- A single event's registration throughput saturates one row lock in measured tests.
- A module acquires a genuinely different scaling or availability profile.
