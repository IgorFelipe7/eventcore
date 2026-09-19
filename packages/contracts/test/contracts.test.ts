import { describe, expect, it } from 'vitest'
import {
  CreateEventBodySchema,
  IdempotencyKeySchema,
  PROBLEM_CATALOG,
  RegisterBodySchema,
  UpdateEventBodySchema,
  problemTypeFor,
} from '../src'

describe('problem catalog', () => {
  it('maps every code to a stable, URL-safe problem type', () => {
    expect(problemTypeFor('CAPACITY_BELOW_CONFIRMED')).toBe('/problems/capacity-below-confirmed')
  })

  it('keeps client errors and server errors in their HTTP families', () => {
    for (const [code, { status }] of Object.entries(PROBLEM_CATALOG)) {
      const serverSide = [
        'INTERNAL_ERROR',
        'INVARIANT_VIOLATION',
        'TEMPORARY_UNAVAILABLE',
      ].includes(code)
      expect(status >= 500).toBe(serverSide)
    }
  })
})

describe('request schemas', () => {
  it('rejects unknown fields on registration so payload hashes stay meaningful', () => {
    expect(RegisterBodySchema.safeParse({ source: 'web', userId: 'spoofed' }).success).toBe(false)
    expect(RegisterBodySchema.parse({})).toEqual({ source: 'api' })
  })

  it('accepts random UUIDs as idempotency keys and refuses free-form text', () => {
    expect(IdempotencyKeySchema.safeParse('6f1c2e8a-6b3f-4b5e-9d84-6ad1f1b0e7a1').success).toBe(
      true,
    )
    expect(IdempotencyKeySchema.safeParse('retry please').success).toBe(false)
  })

  it('requires at least one field on event updates', () => {
    expect(UpdateEventBodySchema.safeParse({}).success).toBe(false)
    expect(UpdateEventBodySchema.safeParse({ venue: 'Hall B' }).success).toBe(true)
  })

  it('bounds capacity at the domain maximum', () => {
    const body = {
      slug: 'systems-night',
      name: 'Systems Night',
      venue: 'Hall A',
      startsAt: '2026-12-01T19:00:00-03:00',
      enrollmentOpensAt: '2026-11-01T09:00:00-03:00',
      enrollmentClosesAt: '2026-12-01T12:00:00-03:00',
    }
    expect(CreateEventBodySchema.safeParse({ ...body, capacity: 120 }).success).toBe(true)
    expect(CreateEventBodySchema.safeParse({ ...body, capacity: 100_001 }).success).toBe(false)
  })
})
