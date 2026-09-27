import { type Transaction, appendAudit, enqueueOutbox } from '@eventcore/db'
import { type RegistrationOrigin, type RegistrationStatus } from '@eventcore/domain'

export const OUTBOX_EVENT_TYPES = {
  CONFIRMED: 'registration.confirmed',
  WAITLISTED: 'registration.waitlisted',
  REJECTED: 'registration.rejected',
  CANCELLED: 'registration.cancelled',
} as const satisfies Record<RegistrationStatus, string>

export interface RegistrationChange {
  readonly organizationId: string
  readonly eventId: string
  readonly registrationId: string
  readonly participantId: string
  readonly actorId: string | null
  readonly from: RegistrationOrigin
  readonly to: RegistrationStatus
  readonly reason: string
  readonly requestId: string
  readonly waitlistPosition?: number | null
}

export const recordRegistrationChange = async (
  tx: Transaction,
  change: RegistrationChange,
): Promise<void> => {
  await appendAudit(tx, {
    organizationId: change.organizationId,
    actorId: change.actorId,
    action: change.reason,
    resourceType: 'registration',
    resourceId: change.registrationId,
    safeBefore: change.from ? { status: change.from } : null,
    safeAfter: { status: change.to, eventId: change.eventId },
    requestId: change.requestId,
  })
  await enqueueOutbox(tx, {
    aggregateType: 'registration',
    aggregateId: change.registrationId,
    eventType: OUTBOX_EVENT_TYPES[change.to],
    payload: {
      registrationId: change.registrationId,
      eventId: change.eventId,
      participantId: change.participantId,
      from: change.from,
      to: change.to,
      reason: change.reason,
      waitlistPosition: change.waitlistPosition ?? null,
      requestId: change.requestId,
    },
  })
}

export interface EventChange {
  readonly organizationId: string
  readonly eventId: string
  readonly actorId: string
  readonly action: string
  readonly before: Record<string, unknown> | null
  readonly after: Record<string, unknown> | null
  readonly requestId: string
}

export const recordEventChange = (tx: Transaction, change: EventChange) =>
  appendAudit(tx, {
    organizationId: change.organizationId,
    actorId: change.actorId,
    action: change.action,
    resourceType: 'event',
    resourceId: change.eventId,
    safeBefore: change.before,
    safeAfter: change.after,
    requestId: change.requestId,
  })
