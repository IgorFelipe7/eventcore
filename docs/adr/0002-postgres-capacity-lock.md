# ADR 0002 · Serialize every capacity decision on the inventory row

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

A registration decision reads three things and then writes based on them: the confirmed count, the queue length and the participant's current registration. If two transactions read the same state before either writes, both can conclude "a seat is free". `tests/concurrency/naive-baseline.test.ts` reproduces exactly that against PostgreSQL 18: 60 concurrent participants confirm more than 10 seats.

A `CHECK (confirmed_count <= capacity)` constraint alone does not help when the decision is taken from a `COUNT(*)` over registrations, and even with a counter it only turns a race into an error instead of a correct waitlist decision.

## Options considered

| Option | Verdict |
|---|---|
| Conditional `UPDATE … WHERE confirmed_count < capacity RETURNING` | Correct for a seat counter, but it cannot express "a queue already exists, so a newcomer must wait" in the same atomic step. |
| `SERIALIZABLE` for every command | Correct, but turns contention into `40001` retries. Under a last-seat rush most transactions would abort and retry, which is wasteful and harder to explain to a participant. |
| `SELECT … FOR UPDATE SKIP LOCKED` on the queue | Breaks FIFO: skipping a locked row can promote the second person in line. Reserved for the outbox worker, where strict order is not a business rule. |
| **Row lock on `event_inventory` under `READ COMMITTED`** | **Chosen.** One lock per event serializes every command that can change capacity, the confirmed count or the queue. |

## Decision

Every command that can affect capacity or the waitlist starts with:

```sql
SELECT event_id, capacity, confirmed_count, version
FROM event_inventory
WHERE event_id = $1
FOR UPDATE;
```

and only then reads the event rules, the participant's registration (`FOR UPDATE`) and the queue length. Because each statement in `READ COMMITTED` takes a fresh snapshot, everything read after the lock is acquired reflects every transaction that held the lock before.

Lock order is fixed: **idempotency key → inventory row → registration rows**. All commands follow it, so they cannot deadlock against each other.

The queue position is stamped with `clock_timestamp()` while the inventory lock is held, so `queued_at` order equals serialization order. Using `now()` (transaction start time) would let a transaction that started earlier but acquired the lock later insert itself ahead of someone already queued.

## Consequences

- Commands for **one** event are serialized. Commands for different events never contend.
- Throughput for a single hot event is bounded by how fast one transaction can hold the lock. The transaction is short (a handful of indexed statements), and the limit is measurable rather than hidden.
- `confirmed_count` is a projection of `registrations`. It is kept in the same transaction and cross-checked by `readIntegrity`, which the tests run after every scenario.

## Verification

- `tests/concurrency/last-seat.test.ts` — two participants, one seat, 30 consecutive rounds: exactly one confirmed, one waitlisted at position 1.
- Same file — 100 participants, 10 seats: 10 confirmed, 90 waitlisted with positions 1..90 and no gaps.
- Same file — overlapping requests from one participant never create a second row.
