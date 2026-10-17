export const INVARIANT_EVIDENCE: readonly { readonly id: string; readonly verifiedBy: string }[] = [
  { id: 'I1', verifiedBy: 'tests/concurrency/last-seat.test.ts' },
  { id: 'I2', verifiedBy: 'tests/concurrency/last-seat.test.ts' },
  { id: 'I3', verifiedBy: 'tests/http/idempotency.test.ts' },
  { id: 'I4', verifiedBy: 'tests/security/tenant-isolation.test.ts' },
  { id: 'I5', verifiedBy: 'tests/concurrency/waitlist.test.ts' },
  { id: 'I6', verifiedBy: 'tests/http/audit-trail.test.ts' },
  { id: 'I7', verifiedBy: 'tests/resilience/outbox.test.ts' },
  { id: 'I8', verifiedBy: 'tests/http/idempotency.test.ts' },
]
