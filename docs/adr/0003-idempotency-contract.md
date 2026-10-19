# ADR 0003 · Idempotency keys committed with the effect

- **Status:** Accepted
- **Date:** 2026-09-25

## Context

A participant double-clicks. A mobile client times out after the server committed and retries. A proxy replays a request. Without a contract, each of these can create a second effect.

Unique constraints already stop a second **row** for the same participant and event (I2), but they do not answer the client correctly: the retry should receive the **same response** the first attempt would have received, not a fresh decision taken against today's state.

## Decision

Mutating endpoints that matter (`register`, `cancel`, `change capacity`) require an `Idempotency-Key` header: a random value, one per user intent, reused on every retry of that intent.

1. The key is scoped by **actor + action + scope id + key**. The actor comes from the verified token, never from the request body. The same key used by another participant, or on another event, is unrelated.
2. The request is fingerprinted with SHA-256 over a canonical JSON of action, scope and body.
3. Inside the business transaction, **before** the inventory lock, the API runs:

   ```sql
   INSERT INTO idempotency_requests (...)
   ON CONFLICT ON CONSTRAINT idempotency_requests_scope_key DO NOTHING
   RETURNING id
   ```

4. If the row was inserted, the command runs and the response (status and body) is written to the same row before `COMMIT`.
5. If it conflicts, PostgreSQL makes the second transaction **wait** until the first one commits or rolls back. Then:
   - same fingerprint → return the stored response with `Idempotent-Replayed: true`;
   - different fingerprint → `422 IDEMPOTENCY_KEY_REUSED`.

There is no `IN_PROGRESS` state to poll: the unique index wait *is* the in-progress state, and it disappears atomically on commit or rollback.

## What is stored

Everything that commits is stored, including business rejections such as `409 SOLD_OUT`. A transaction that rolls back (validation failure, event not found, database unavailable) leaves nothing behind, so the client can safely retry with the same key.

A replay returns the **original snapshot**, including the original `requestId` in the body. The current request's id is still in the `x-request-id` header, so both are traceable. To read the current state, clients call `GET`.

## Expiry

Keys expire after `IDEMPOTENCY_TTL_SECONDS` (24 h by default). An expired key counts as unused: the claim's `INSERT … ON CONFLICT DO UPDATE … WHERE expires_at <= now()` takes it over in the same statement, so concurrent requests still claim it once, and the request runs again. The worker purges expired rows in small batches with `FOR UPDATE SKIP LOCKED`; the purge only reclaims space.

## Consequences

- One extra indexed insert per command.
- Clients must generate and keep a key per intent. The web app does this by rendering the key into the form, so a double submit or a browser retry reuses it.

## Verification

`tests/http/idempotency.test.ts` covers a burst of ten identical requests (one effect, one answer), a retry after a lost response while the event filled up (original snapshot returned), payload mismatch, scoping by actor and event, missing and malformed keys, and a stored business rejection.
