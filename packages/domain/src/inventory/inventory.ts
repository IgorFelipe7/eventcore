import { DomainError } from '../errors'

export interface InventorySnapshot {
  readonly capacity: number
  readonly confirmedCount: number
}

export const MAX_CAPACITY = 100_000

export const seatsAvailable = (inventory: InventorySnapshot): number =>
  inventory.capacity - inventory.confirmedCount

export const isSoldOut = (inventory: InventorySnapshot): boolean => seatsAvailable(inventory) <= 0

export const assertValidCapacity = (capacity: number): void => {
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > MAX_CAPACITY) {
    throw new DomainError(
      'INVALID_CAPACITY',
      `Capacity must be an integer between 0 and ${MAX_CAPACITY}.`,
      { capacity },
    )
  }
}

export const assertInventoryInvariant = (inventory: InventorySnapshot): void => {
  const { capacity, confirmedCount } = inventory
  if (!Number.isInteger(confirmedCount) || confirmedCount < 0 || confirmedCount > capacity) {
    throw new DomainError('INVARIANT_VIOLATION', 'Inventory violates 0 <= confirmed <= capacity.', {
      capacity,
      confirmedCount,
    })
  }
}

export interface CapacityChangeInput {
  readonly inventory: InventorySnapshot
  readonly requestedCapacity: number
  readonly queueLength: number
}

export interface CapacityChangePlan {
  readonly capacity: number
  readonly promotions: number
}

export const planCapacityChange = (input: CapacityChangeInput): CapacityChangePlan => {
  const { inventory, requestedCapacity, queueLength } = input
  assertValidCapacity(requestedCapacity)
  if (requestedCapacity < inventory.confirmedCount) {
    throw new DomainError(
      'CAPACITY_BELOW_CONFIRMED',
      `Capacity cannot go below the ${inventory.confirmedCount} seats already confirmed.`,
      { requestedCapacity, confirmedCount: inventory.confirmedCount },
    )
  }
  const freedSeats = requestedCapacity - inventory.confirmedCount
  return {
    capacity: requestedCapacity,
    promotions: Math.max(0, Math.min(freedSeats, queueLength)),
  }
}
