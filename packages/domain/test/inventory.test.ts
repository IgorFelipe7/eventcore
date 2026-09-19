import { describe, expect, it } from 'vitest'
import { MAX_CAPACITY, assertInventoryInvariant, planCapacityChange, seatsAvailable } from '../src'

describe('inventory', () => {
  it('reports the seats still available', () => {
    expect(seatsAvailable({ capacity: 10, confirmedCount: 7 })).toBe(3)
  })

  it.each([
    { capacity: 10, confirmedCount: 11 },
    { capacity: 10, confirmedCount: -1 },
    { capacity: 10, confirmedCount: 1.5 },
  ])('flags $confirmedCount of $capacity as an invariant violation', (inventory) => {
    expect(() => assertInventoryInvariant(inventory)).toThrowError(
      expect.objectContaining({ code: 'INVARIANT_VIOLATION' }),
    )
  })
})

describe('planCapacityChange', () => {
  const inventory = { capacity: 10, confirmedCount: 8 }

  it('refuses to drop capacity below the confirmed seats', () => {
    expect(() =>
      planCapacityChange({ inventory, requestedCapacity: 7, queueLength: 0, promotionBatchLimit: 50 }),
    ).toThrowError(expect.objectContaining({ code: 'CAPACITY_BELOW_CONFIRMED' }))
  })

  it('allows shrinking down to exactly the confirmed seats', () => {
    expect(
      planCapacityChange({ inventory, requestedCapacity: 8, queueLength: 4, promotionBatchLimit: 50 }),
    ).toEqual({ capacity: 8, promotions: 0 })
  })

  it('promotes no more than the freed seats, the queue length or the batch limit', () => {
    const plan = (queueLength: number, promotionBatchLimit: number) =>
      planCapacityChange({ inventory, requestedCapacity: 20, queueLength, promotionBatchLimit })
    expect(plan(3, 50).promotions).toBe(3)
    expect(plan(30, 50).promotions).toBe(12)
    expect(plan(30, 5).promotions).toBe(5)
  })

  it.each([-1, 2.5, MAX_CAPACITY + 1, Number.NaN])('rejects %s as a capacity', (requestedCapacity) => {
    expect(() =>
      planCapacityChange({ inventory, requestedCapacity, queueLength: 0, promotionBatchLimit: 1 }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_CAPACITY' }))
  })
})
