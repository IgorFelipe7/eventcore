import { type PendingOutboxEvent, type Transaction } from '@eventcore/db'
import { sql } from 'drizzle-orm'
import { type NotificationSink, PermanentDeliveryError } from './sink'

interface RegistrationPayload {
  readonly registrationId: string
  readonly eventId: string
  readonly participantId: string
  readonly from: string | null
  readonly to: string
  readonly reason: string
  readonly waitlistPosition: number | null
}

const isRegistrationPayload = (
  payload: Record<string, unknown>,
): payload is RegistrationPayload & Record<string, unknown> =>
  typeof payload['registrationId'] === 'string' &&
  typeof payload['eventId'] === 'string' &&
  typeof payload['participantId'] === 'string' &&
  typeof payload['to'] === 'string'

const subjectFor = (
  payload: RegistrationPayload,
  eventName: string,
): { template: string; subject: string } => {
  if (payload.reason === 'waitlist.promoted') {
    return {
      template: 'waitlist-promoted',
      subject: `A seat opened up: you are confirmed for ${eventName}`,
    }
  }
  switch (payload.to) {
    case 'CONFIRMED':
      return { template: 'registration-confirmed', subject: `You are confirmed for ${eventName}` }
    case 'WAITLISTED':
      return {
        template: 'registration-waitlisted',
        subject: `You are #${payload.waitlistPosition ?? '?'} on the waitlist for ${eventName}`,
      }
    case 'CANCELLED':
      return {
        template: 'registration-cancelled',
        subject: `Your registration for ${eventName} was cancelled`,
      }
    default:
      return { template: 'registration-rejected', subject: `${eventName} is full` }
  }
}

export const demoMailbox: NotificationSink = {
  name: 'demo-mailbox',
  async deliver(event: PendingOutboxEvent, tx: Transaction) {
    if (!isRegistrationPayload(event.payload)) {
      throw new PermanentDeliveryError(`Unsupported payload for ${event.eventType}.`)
    }
    const { rows } = await tx.execute<{ name: string }>(
      sql`SELECT name FROM events WHERE id = ${event.payload.eventId}`,
    )
    const eventName = rows[0]?.name
    if (!eventName) {
      throw new PermanentDeliveryError(`Event ${event.payload.eventId} no longer exists.`)
    }

    const { template, subject } = subjectFor(event.payload, eventName)
    await tx.execute(sql`
      INSERT INTO notification_deliveries (outbox_event_id, recipient_user_id, template, subject)
      VALUES (${event.id}, ${event.payload.participantId}, ${template}, ${subject})
      ON CONFLICT (outbox_event_id) DO NOTHING
    `)
  },
}
