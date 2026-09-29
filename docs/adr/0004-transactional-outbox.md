# ADR 0004 · Transactional outbox for notifications

- **Status:** Accepted
- **Date:** 2026-09-28

## Context

Committing a registration and sending an email from the same request handler is not atomic. If the commit succeeds and the email fails, the participant is never told. If the email succeeds and the commit fails, the participant is told something false. If the client retries, the email can go out twice.

## Decision

1. Every registration transition writes a row to `outbox_events` **in the same transaction** as the change (see `apps/api/src/application/trail.ts`). If the transaction rolls back, the event never existed.
2. A separate worker process (`apps/worker`) claims due rows with `FOR UPDATE SKIP LOCKED`, so several replicas drain the table without claiming the same row twice. `SKIP LOCKED` is acceptable here because delivery order is not a business rule; it is **not** used for the waitlist (ADR 0002).
3. Each delivery runs inside a savepoint. Success marks the row published. Failure increments `attempts` and schedules `next_attempt_at` with exponential backoff and jitter. After `WORKER_MAX_ATTEMPTS`, or on a permanent error, the row is dead-lettered and kept for inspection. Nothing is silently dropped.
4. Delivery is **at least once**. The outbox event id is the deduplication key: the demo mailbox enforces it with `UNIQUE(outbox_event_id)`; a real provider receives it as its idempotency key.

## MVP scope

No real email is sent. The `demo-mailbox` sink writes to `notification_deliveries`, which the Lab and the tests can inspect. Payloads carry ids, never names or contact data; the sink resolves what it needs at delivery time.

## Consequences

- Notifications are eventually consistent with the registration, typically within one poll interval.
- Holding row locks while calling an external provider would extend lock time; batches are kept small and the worker should get a provider timeout shorter than its statement timeout when a real provider is added.
- The worker also runs maintenance: purging expired idempotency keys and sweeping every event for invariant violations, which it logs as errors.

## Verification

`tests/resilience/outbox.test.ts`: one delivery per change however many times the relay runs; provider down (registrations persist, retries are scheduled, delivery completes after recovery); dead-lettering after the last attempt; four concurrent relays over 60 events with zero duplicate deliveries.
