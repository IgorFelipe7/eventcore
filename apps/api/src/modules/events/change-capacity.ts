import { type ChangeCapacityResponse } from '@eventcore/contracts'
import {
  type Transaction,
  countWaitlisted,
  lockInventory,
  readEventRules,
  setCapacity,
} from '@eventcore/db'
import { planCapacityChange } from '@eventcore/domain'
import { type CommandContext, type CommandResponse, ok } from '../../application/command'
import { recordEventChange } from '../../application/trail'
import { ProblemError } from '../../http/problem'
import { promoteFromWaitlist } from '../registrations/promote-waitlist'
import { presentInventory } from './presenters'

export const CHANGE_CAPACITY_ACTION = 'event.change-capacity'
export const PROMOTION_BATCH_LIMIT = 500

export const changeCapacity = async (
  tx: Transaction,
  context: CommandContext & { readonly organizationId: string },
  eventId: string,
  requestedCapacity: number,
): Promise<CommandResponse> => {
  const inventory = await lockInventory(tx, eventId)
  const rules = inventory ? await readEventRules(tx, eventId) : null
  if (!inventory || !rules || rules.organizationId !== context.organizationId) {
    throw new ProblemError('NOT_FOUND', 'No event with that id in this organization.')
  }

  const queueLength = await countWaitlisted(tx, eventId)
  const plan = planCapacityChange({
    inventory,
    requestedCapacity,
    queueLength,
    promotionBatchLimit: PROMOTION_BATCH_LIMIT,
  })

  const updated = await setCapacity(tx, eventId, plan.capacity)
  const { promotions, confirmedCount } = await promoteFromWaitlist(
    tx,
    { organizationId: context.organizationId, eventId },
    plan.promotions,
    context.requestId,
  )
  await recordEventChange(tx, {
    organizationId: context.organizationId,
    eventId,
    actorId: context.actor.userId,
    action: 'event.capacity-changed',
    before: { capacity: inventory.capacity },
    after: { capacity: plan.capacity, promotions: promotions.length },
    requestId: context.requestId,
  })

  const body: ChangeCapacityResponse = {
    eventId,
    inventory: presentInventory({
      capacity: updated.capacity,
      confirmedCount: confirmedCount ?? updated.confirmedCount,
      waitlisted: queueLength - promotions.length,
    }),
    promotedRegistrationIds: promotions.map((promotion) => promotion.registrationId),
    requestId: context.requestId,
  }
  return ok(body)
}
