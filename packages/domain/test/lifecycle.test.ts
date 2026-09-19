import { describe, expect, it } from 'vitest'
import {
  EVENT_STATUSES,
  REGISTRATION_STATUSES,
  allowedEventTransitions,
  assertEnrollmentSchedule,
  assertEventTransition,
  canTransitionRegistration,
  hasPermission,
} from '../src'

describe('event lifecycle', () => {
  it('publishes a draft for organizers and admins', () => {
    expect(() => assertEventTransition('DRAFT', 'PUBLISHED', 'ORGANIZER')).not.toThrow()
    expect(() => assertEventTransition('DRAFT', 'PUBLISHED', 'ADMIN')).not.toThrow()
  })

  it('reserves cancellation and reopening for admins', () => {
    expect(() => assertEventTransition('PUBLISHED', 'CANCELLED', 'ORGANIZER')).toThrowError(
      expect.objectContaining({ code: 'INSUFFICIENT_ROLE' }),
    )
    expect(() => assertEventTransition('CLOSED', 'PUBLISHED', 'ORGANIZER')).toThrowError(
      expect.objectContaining({ code: 'INSUFFICIENT_ROLE' }),
    )
  })

  it('treats CANCELLED as terminal', () => {
    expect(allowedEventTransitions('CANCELLED')).toEqual([])
    for (const target of EVENT_STATUSES) {
      expect(() => assertEventTransition('CANCELLED', target, 'ADMIN')).toThrowError(
        expect.objectContaining({ code: 'INVALID_EVENT_TRANSITION' }),
      )
    }
  })

  it('requires enrollment to close no later than the event starts', () => {
    const startsAt = new Date('2026-12-01T19:00:00Z')
    expect(() =>
      assertEnrollmentSchedule({
        startsAt,
        enrollmentOpensAt: new Date('2026-11-01T00:00:00Z'),
        enrollmentClosesAt: new Date('2026-12-02T00:00:00Z'),
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ENROLLMENT_WINDOW' }))
  })
})

describe('registration transitions', () => {
  it('matches the documented transition table exactly', () => {
    const allowed = Object.fromEntries(
      [null, ...REGISTRATION_STATUSES].map((from) => [
        from ?? 'NEW',
        REGISTRATION_STATUSES.filter((to) => canTransitionRegistration(from, to)),
      ]),
    )
    expect(allowed).toEqual({
      NEW: ['CONFIRMED', 'WAITLISTED', 'REJECTED'],
      CONFIRMED: ['CANCELLED'],
      WAITLISTED: ['CONFIRMED', 'CANCELLED'],
      REJECTED: ['CONFIRMED', 'WAITLISTED'],
      CANCELLED: ['CONFIRMED', 'WAITLISTED', 'REJECTED'],
    })
  })
})

describe('permissions', () => {
  it('keeps capacity changes and audit access with admins only', () => {
    expect(hasPermission('ADMIN', 'event:change-capacity')).toBe(true)
    expect(hasPermission('ORGANIZER', 'event:change-capacity')).toBe(false)
    expect(hasPermission('ORGANIZER', 'audit:read')).toBe(false)
    expect(hasPermission('ORGANIZER', 'registration:list')).toBe(true)
  })
})
