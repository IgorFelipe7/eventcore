export interface Invariant {
  readonly id: string
  readonly rule: string
  readonly enforcedBy: string
  readonly verifiedBy: string
}

export const INVARIANTS: readonly Invariant[] = [
  {
    id: 'I1',
    rule: 'Confirmed seats never exceed capacity, and never go below zero.',
    enforcedBy: 'Inventory row lock + CHECK constraints',
    verifiedBy: 'tests/concurrency/last-seat.test.ts',
  },
  {
    id: 'I2',
    rule: 'A participant holds at most one registration per event; re-entry reuses the same row.',
    enforcedBy: 'UNIQUE (event_id, user_id) + row lock',
    verifiedBy: 'tests/concurrency/last-seat.test.ts',
  },
  {
    id: 'I3',
    rule: 'The same request with the same key has one effect and one answer; a different payload is refused.',
    enforcedBy: 'Idempotency key committed with the effect',
    verifiedBy: 'tests/http/idempotency.test.ts',
  },
  {
    id: 'I4',
    rule: 'No organization can read or change another organization’s data.',
    enforcedBy: 'Membership check + tenant-scoped queries',
    verifiedBy: 'tests/security/tenant-isolation.test.ts',
  },
  {
    id: 'I5',
    rule: 'The waitlist is first in, first out, and a newcomer never overtakes it.',
    enforcedBy: 'queued_at stamped under the lock, ordered (queued_at, id)',
    verifiedBy: 'tests/concurrency/waitlist.test.ts',
  },
  {
    id: 'I6',
    rule: 'Every critical change leaves an audit entry written in the same transaction.',
    enforcedBy: 'Audit append inside the command',
    verifiedBy: 'tests/http/audit-trail.test.ts',
  },
  {
    id: 'I7',
    rule: 'Every committed change produces exactly one notification, delivered after commit.',
    enforcedBy: 'Transactional outbox + deduplicated relay',
    verifiedBy: 'tests/resilience/outbox.test.ts',
  },
  {
    id: 'I8',
    rule: 'Retries and transient failures produce clear answers that never invite endless resubmission.',
    enforcedBy: 'Problem details with retryable flag + replay header',
    verifiedBy: 'tests/http/idempotency.test.ts',
  },
]

export interface Failure {
  readonly name: string
  readonly naive: string
  readonly eventcore: string
  readonly reference: string
}

export const FAILURES: readonly Failure[] = [
  {
    name: 'Overbooking',
    naive:
      'Two requests read “1 seat left” and both write. The event now has one attendee too many.',
    eventcore:
      'Every decision for an event waits for one row lock and re-reads the state under it.',
    reference: 'ADR 0002',
  },
  {
    name: 'Double effects',
    naive: 'A double-click, or a retry after a timeout, books the same person twice.',
    eventcore:
      'The idempotency key is committed with the effect. A retry receives the original answer.',
    reference: 'ADR 0003',
  },
  {
    name: 'False notifications',
    naive:
      'An email goes out for a transaction that rolled back, or never goes out for one that committed.',
    eventcore:
      'The notification is written to an outbox in the same transaction and delivered after commit.',
    reference: 'ADR 0004',
  },
  {
    name: 'Cross-tenant reads',
    naive: 'Changing an id in the URL shows another organizer’s attendee list.',
    eventcore:
      'Every organizer query is scoped by verified membership. Foreign ids are simply not found.',
    reference: 'Threat model T1',
  },
]

export const TRANSACTION_STEPS: readonly { readonly title: string; readonly detail: string }[] = [
  {
    title: 'Verify the caller',
    detail:
      'Signature, issuer, audience and expiry. The actor comes from the token, never the body.',
  },
  {
    title: 'Claim the idempotency key',
    detail: 'Insert or wait on the unique index; a committed twin is replayed instead of re-run.',
  },
  {
    title: 'Lock the inventory row',
    detail: 'SELECT … FOR UPDATE. Every command for this event now runs one at a time.',
  },
  {
    title: 'Re-read under the lock',
    detail: 'Event rules, the participant’s row and the queue length — fresh, not cached.',
  },
  {
    title: 'Ask the domain',
    detail: 'A pure function decides: confirm, waitlist, reject or unchanged.',
  },
  {
    title: 'Write the change',
    detail: 'Registration row, counter, history entry with the request id.',
  },
  {
    title: 'Write the consequences',
    detail: 'Audit entry and outbox event, in the same transaction.',
  },
  {
    title: 'Store the answer',
    detail: 'Status and body saved on the idempotency row, then COMMIT.',
  },
  {
    title: 'Respond',
    detail: 'If the client never hears it, a retry with the same key gets this exact answer.',
  },
]

export const KNOWN_LIMITS: readonly { readonly limit: string; readonly detail: string }[] = [
  {
    limit: 'One hot event, one lock',
    detail:
      'Commands for a single event are serialized by design. Throughput for that event is bounded by how fast one short transaction runs — measurable, documented, not hidden.',
  },
  {
    limit: 'Rate limits per process',
    detail:
      'Each API replica keeps its own counters until a shared store is configured. Good enough for a demo; not for a distributed abuse campaign.',
  },
  {
    limit: 'The Lab is a replay',
    detail:
      'It shows runs recorded on one machine. It never sends traffic, and its timings describe that machine, not production.',
  },
]
