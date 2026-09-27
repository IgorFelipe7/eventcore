import { type CancellationResult } from '@eventcore/contracts'
import {
  type Transaction,
  adjustConfirmedCount,
  appendRegistrationEvent,
  countWaitlisted,
  findMembership,
  findRegistrationById,
  lockInventory,
  updateRegistrationStatus,
} from '@eventcore/db'
import { decideCancellation, hasPermission } from '@eventcore/domain'
import { type CommandContext, type CommandResponse, ok } from '../../application/command'
import { recordRegistrationChange } from '../../application/trail'
import { ProblemError } from '../../http/problem'
import { presentInventory } from '../events/presenters'
import { promoteFromWaitlist } from './promote-waitlist'

export const CANCEL_ACTION = 'registration.cancel'

const notVisible = () => new ProblemError('NOT_FOUND', 'No registration with that id.')

export const cancelRegistration = async (
  tx: Transaction,
  context: CommandContext,
  registrationId: string,
): Promise<CommandResponse> => {
  const located = await findRegistrationById(tx, registrationId, { forUpdate: false })
  if (!located) throw notVisible()

  if (located.userId !== context.actor.userId) {
    const role = await findMembership(tx, located.organizationId, context.actor.userId)
    if (!role || !hasPermission(role, 'registration:cancel-any')) throw notVisible()
  }

  const inventory = await lockInventory(tx, located.eventId)
  const registration = await findRegistrationById(tx, registrationId, { forUpdate: true })
  if (!inventory || !registration) throw notVisible()

  const queueLength = await countWaitlisted(tx, registration.eventId)
  const decision = decideCancellation({ currentStatus: registration.status, queueLength })

  let confirmedCount = inventory.confirmedCount
  let waitlisted = queueLength
  let promotedRegistrationId: string | null = null

  if (decision.kind !== 'UNCHANGED') {
    const reason =
      registration.userId === context.actor.userId ? 'participant.cancelled' : 'organizer.cancelled'
    await updateRegistrationStatus(tx, registration.id, 'CANCELLED')
    await appendRegistrationEvent(tx, {
      registrationId: registration.id,
      from: registration.status,
      to: 'CANCELLED',
      actorId: context.actor.userId,
      reason,
      correlationId: context.requestId,
    })
    await recordRegistrationChange(tx, {
      organizationId: registration.organizationId,
      eventId: registration.eventId,
      registrationId: registration.id,
      participantId: registration.userId,
      actorId: context.actor.userId,
      from: registration.status,
      to: 'CANCELLED',
      reason,
      requestId: context.requestId,
    })
  }

  if (decision.kind === 'LEAVE_QUEUE') waitlisted -= 1

  if (decision.kind === 'RELEASE_SEAT') {
    confirmedCount = (await adjustConfirmedCount(tx, registration.eventId, -1)).confirmedCount
    if (decision.promoteHeadOfQueue) {
      const promoted = await promoteFromWaitlist(
        tx,
        { organizationId: registration.organizationId, eventId: registration.eventId },
        1,
        context.requestId,
      )
      promotedRegistrationId = promoted.promotions[0]?.registrationId ?? null
      confirmedCount = promoted.confirmedCount ?? confirmedCount
      waitlisted -= promoted.promotions.length
    }
  }

  const body: CancellationResult = {
    registrationId: registration.id,
    eventId: registration.eventId,
    status: decision.kind === 'UNCHANGED' ? decision.status : 'CANCELLED',
    transition: decision.kind === 'UNCHANGED' ? 'UNCHANGED' : 'CANCELLED',
    promotedRegistrationId,
    inventory: presentInventory({ capacity: inventory.capacity, confirmedCount, waitlisted }),
    requestId: context.requestId,
  }
  return ok(body)
}
