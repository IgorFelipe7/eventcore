import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  type RegistrationStatus,
  assertInventoryInvariant,
  decideCancellation,
  decideRegistration,
  planCapacityChange,
} from '../src'

interface ModelRegistration {
  status: RegistrationStatus
  queuedAt: number
}

interface Model {
  capacity: number
  confirmedCount: number
  clock: number
  registrations: Map<number, ModelRegistration>
}

type Command =
  | { readonly type: 'register'; readonly participant: number }
  | { readonly type: 'cancel'; readonly participant: number }
  | { readonly type: 'changeCapacity'; readonly capacity: number }

const event = {
  status: 'PUBLISHED' as const,
  enrollmentOpensAt: new Date(0),
  enrollmentClosesAt: new Date(8_640_000_000_000),
  waitlistEnabled: true,
}

const queueOf = (model: Model): number[] =>
  [...model.registrations.entries()]
    .filter(([, registration]) => registration.status === 'WAITLISTED')
    .sort(([idA, a], [idB, b]) => a.queuedAt - b.queuedAt || idA - idB)
    .map(([participant]) => participant)

const promote = (model: Model, seats: number): number[] => {
  const promoted = queueOf(model).slice(0, seats)
  for (const participant of promoted) {
    model.registrations.set(participant, { status: 'CONFIRMED', queuedAt: 0 })
    model.confirmedCount += 1
  }
  return promoted
}

const apply = (model: Model, command: Command): void => {
  model.clock += 1
  const inventory = { capacity: model.capacity, confirmedCount: model.confirmedCount }
  const queueLength = queueOf(model).length

  if (command.type === 'register') {
    const current = model.registrations.get(command.participant)?.status ?? null
    const decision = decideRegistration({
      event,
      inventory,
      queueLength,
      currentStatus: current,
      now: new Date(1),
    })
    if (decision.kind === 'CONFIRM') {
      model.registrations.set(command.participant, { status: 'CONFIRMED', queuedAt: 0 })
      model.confirmedCount += 1
    } else if (decision.kind === 'WAITLIST') {
      model.registrations.set(command.participant, { status: 'WAITLISTED', queuedAt: model.clock })
    }
    return
  }

  if (command.type === 'cancel') {
    const registration = model.registrations.get(command.participant)
    if (!registration) return
    const decision = decideCancellation({ currentStatus: registration.status, queueLength })
    if (decision.kind === 'UNCHANGED') return
    model.registrations.set(command.participant, { status: 'CANCELLED', queuedAt: 0 })
    if (decision.kind === 'RELEASE_SEAT') {
      model.confirmedCount -= 1
      if (decision.promoteHeadOfQueue) promote(model, 1)
    }
    return
  }

  try {
    const plan = planCapacityChange({
      inventory,
      requestedCapacity: command.capacity,
      queueLength,
      promotionBatchLimit: 1_000,
    })
    model.capacity = plan.capacity
    promote(model, plan.promotions)
  } catch {
    return
  }
}

const commandArbitrary: fc.Arbitrary<Command> = fc.oneof(
  { weight: 6, arbitrary: fc.record({ type: fc.constant('register' as const), participant: fc.nat(24) }) },
  { weight: 3, arbitrary: fc.record({ type: fc.constant('cancel' as const), participant: fc.nat(24) }) },
  {
    weight: 1,
    arbitrary: fc.record({ type: fc.constant('changeCapacity' as const), capacity: fc.nat(12) }),
  },
)

describe('domain invariants under random command sequences', () => {
  it('holds I1, I2 and I5 after every command', () => {
    fc.assert(
      fc.property(fc.nat(10), fc.array(commandArbitrary, { maxLength: 200 }), (capacity, commands) => {
        const model: Model = { capacity, confirmedCount: 0, clock: 0, registrations: new Map() }

        for (const command of commands) {
          apply(model, command)

          assertInventoryInvariant({ capacity: model.capacity, confirmedCount: model.confirmedCount })

          const confirmedRows = [...model.registrations.values()].filter(
            (registration) => registration.status === 'CONFIRMED',
          ).length
          expect(confirmedRows).toBe(model.confirmedCount)

          const queue = queueOf(model)
          if (queue.length > 0) {
            expect(model.confirmedCount).toBe(model.capacity)
          }
        }
      }),
      { seed: 20261017, numRuns: 500 },
    )
  })
})
