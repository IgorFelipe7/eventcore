import { type RegistrationResult } from '@eventcore/contracts'
import {
  type Transaction,
  adjustConfirmedCount,
  appendRegistrationEvent,
  countWaitlisted,
  findRegistrationForUpdate,
  insertRegistration,
  lockInventory,
  readEventRules,
  updateRegistrationStatus,
  waitlistPosition,
} from '@eventcore/db'
import { decideRegistration } from '@eventcore/domain'
import { type CommandContext, type CommandResponse, ok, rejected } from '../../application/command'
import { ProblemError } from '../../http/problem'
import { presentInventory } from '../events/presenters'

export const REGISTER_ACTION = 'registration.create'

export const registerForEvent = async (
  tx: Transaction,
  context: CommandContext,
  eventId: string,
): Promise<CommandResponse> => {
  const inventory = await lockInventory(tx, eventId)
  const event = inventory ? await readEventRules(tx, eventId) : null
  if (!inventory || !event || event.status === 'DRAFT') {
    throw new ProblemError('NOT_FOUND', 'No public event with that id.')
  }

  const existing = await findRegistrationForUpdate(tx, eventId, context.actor.userId)
  const queueLength = await countWaitlisted(tx, eventId)

  const decision = decideRegistration({
    event,
    inventory,
    queueLength,
    currentStatus: existing?.status ?? null,
    now: context.now,
  })

  let registrationId = existing?.id
  let confirmedCount = inventory.confirmedCount

  if (decision.kind !== 'UNCHANGED') {
    if (existing) {
      await updateRegistrationStatus(tx, existing.id, decision.status)
    } else {
      registrationId = await insertRegistration(tx, {
        eventId,
        userId: context.actor.userId,
        status: decision.status,
      })
    }
    if (!registrationId) throw new Error('Registration id missing after write.')

    if (decision.kind === 'CONFIRM') {
      confirmedCount = (await adjustConfirmedCount(tx, eventId, 1)).confirmedCount
    }

    await appendRegistrationEvent(tx, {
      registrationId,
      from: decision.from,
      to: decision.status,
      actorId: context.actor.userId,
      reason: decision.from ? 'participant.reentered' : 'participant.registered',
      correlationId: context.requestId,
    })
  }

  if (!registrationId) throw new Error('Registration id missing after decision.')

  if (
    decision.kind === 'REJECT' ||
    (decision.kind === 'UNCHANGED' && decision.status === 'REJECTED')
  ) {
    return rejected(
      'SOLD_OUT',
      context,
      'Every seat is taken and this event does not keep a waitlist.',
    )
  }

  const waitlisted = decision.kind === 'WAITLIST' ? queueLength + 1 : queueLength
  const body: RegistrationResult = {
    registrationId,
    eventId,
    status: decision.status,
    transition:
      decision.kind === 'UNCHANGED' ? 'UNCHANGED' : decision.from ? 'REENTERED' : 'CREATED',
    waitlistPosition:
      decision.status === 'WAITLISTED' ? await waitlistPosition(tx, registrationId) : null,
    inventory: presentInventory({ capacity: inventory.capacity, confirmedCount, waitlisted }),
    requestId: context.requestId,
  }
  return ok(body, decision.kind === 'UNCHANGED' ? 200 : 201)
}
