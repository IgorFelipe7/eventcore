import { describe, expect, it } from 'vitest'
import {
  DomainError,
  decideCancellation,
  decideRegistration,
  type RegistrationContext,
} from '../src'

const now = new Date('2026-11-01T12:00:00Z')

const context = (overrides: Partial<RegistrationContext> = {}): RegistrationContext => ({
  event: {
    status: 'PUBLISHED',
    enrollmentOpensAt: new Date('2026-10-01T00:00:00Z'),
    enrollmentClosesAt: new Date('2026-11-30T00:00:00Z'),
    waitlistEnabled: true,
  },
  inventory: { capacity: 10, confirmedCount: 3 },
  queueLength: 0,
  currentStatus: null,
  now,
  ...overrides,
})

describe('decideRegistration', () => {
  it('confirms when a seat is free and nobody is queued', () => {
    expect(decideRegistration(context())).toEqual({
      kind: 'CONFIRM',
      from: null,
      status: 'CONFIRMED',
    })
  })

  it('waitlists when the event is sold out', () => {
    const decision = decideRegistration(
      context({ inventory: { capacity: 10, confirmedCount: 10 } }),
    )
    expect(decision.kind).toBe('WAITLIST')
  })

  it('never lets a newcomer overtake an active queue, even with a free seat', () => {
    const decision = decideRegistration(
      context({ inventory: { capacity: 10, confirmedCount: 9 }, queueLength: 2 }),
    )
    expect(decision.kind).toBe('WAITLIST')
  })

  it('rejects without consuming a seat when sold out and the waitlist is disabled', () => {
    const decision = decideRegistration(
      context({
        event: { ...context().event, waitlistEnabled: false },
        inventory: { capacity: 1, confirmedCount: 1 },
      }),
    )
    expect(decision).toEqual({ kind: 'REJECT', from: null, status: 'REJECTED' })
  })

  it.each(['CONFIRMED', 'WAITLISTED'] as const)(
    'returns the current %s status instead of creating a duplicate',
    (currentStatus) => {
      expect(decideRegistration(context({ currentStatus }))).toEqual({
        kind: 'UNCHANGED',
        status: currentStatus,
      })
    },
  )

  it('keeps an active registration visible even after enrollment closes', () => {
    const decision = decideRegistration(
      context({ currentStatus: 'CONFIRMED', event: { ...context().event, status: 'CLOSED' } }),
    )
    expect(decision).toEqual({ kind: 'UNCHANGED', status: 'CONFIRMED' })
  })

  it('lets a cancelled participant re-enter through the same rules as everyone else', () => {
    expect(decideRegistration(context({ currentStatus: 'CANCELLED' })).kind).toBe('CONFIRM')
    expect(decideRegistration(context({ currentStatus: 'CANCELLED', queueLength: 1 })).kind).toBe(
      'WAITLIST',
    )
  })

  it.each([
    ['a draft event', { status: 'DRAFT' as const }],
    ['a closed event', { status: 'CLOSED' as const }],
    ['a window that has not opened', { enrollmentOpensAt: new Date('2026-11-02T00:00:00Z') }],
    ['a window that already closed', { enrollmentClosesAt: now }],
  ])('refuses %s with EVENT_CLOSED', (_label, eventOverrides) => {
    const attempt = () =>
      decideRegistration(context({ event: { ...context().event, ...eventOverrides } }))
    expect(attempt).toThrowError(DomainError)
    expect(attempt).toThrowError(expect.objectContaining({ code: 'EVENT_CLOSED' }))
  })
})

describe('decideCancellation', () => {
  it('releases a confirmed seat and asks for promotion when someone is queued', () => {
    expect(decideCancellation({ currentStatus: 'CONFIRMED', queueLength: 3 })).toEqual({
      kind: 'RELEASE_SEAT',
      promoteHeadOfQueue: true,
    })
  })

  it('leaves the queue without touching the confirmed counter', () => {
    expect(decideCancellation({ currentStatus: 'WAITLISTED', queueLength: 3 })).toEqual({
      kind: 'LEAVE_QUEUE',
    })
  })

  it('treats a repeated cancellation as a no-op', () => {
    expect(decideCancellation({ currentStatus: 'CANCELLED', queueLength: 0 })).toEqual({
      kind: 'UNCHANGED',
      status: 'CANCELLED',
    })
  })
})
