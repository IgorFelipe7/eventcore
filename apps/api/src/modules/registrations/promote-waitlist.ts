import {
  type Transaction,
  adjustConfirmedCount,
  appendRegistrationEvent,
  lockHeadOfQueue,
  updateRegistrationStatus,
} from '@eventcore/db'
import { assertRegistrationTransition } from '@eventcore/domain'

export interface Promotion {
  readonly registrationId: string
  readonly userId: string
}

export const promoteFromWaitlist = async (
  tx: Transaction,
  eventId: string,
  seats: number,
  correlationId: string,
): Promise<{ promotions: Promotion[]; confirmedCount: number | null }> => {
  const head = await lockHeadOfQueue(tx, eventId, seats)
  if (head.length === 0) return { promotions: [], confirmedCount: null }

  for (const entry of head) {
    assertRegistrationTransition('WAITLISTED', 'CONFIRMED')
    await updateRegistrationStatus(tx, entry.id, 'CONFIRMED')
    await appendRegistrationEvent(tx, {
      registrationId: entry.id,
      from: 'WAITLISTED',
      to: 'CONFIRMED',
      actorId: null,
      reason: 'waitlist.promoted',
      correlationId,
    })
  }

  const inventory = await adjustConfirmedCount(tx, eventId, head.length)
  return {
    promotions: head.map((entry) => ({ registrationId: entry.id, userId: entry.userId })),
    confirmedCount: inventory.confirmedCount,
  }
}
