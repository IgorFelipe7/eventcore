import { DomainError } from '../errors'
import { type EventStatus, isEnrollmentOpen } from '../events/event-lifecycle'
import { type InventorySnapshot, isSoldOut } from '../inventory/inventory'
import {
  type RegistrationOrigin,
  type RegistrationStatus,
  assertRegistrationTransition,
  isActiveRegistration,
} from './registration-status'

export interface RegistrationContext {
  readonly event: {
    readonly status: EventStatus
    readonly enrollmentOpensAt: Date
    readonly enrollmentClosesAt: Date
    readonly waitlistEnabled: boolean
  }
  readonly inventory: InventorySnapshot
  readonly queueLength: number
  readonly currentStatus: RegistrationOrigin
  readonly now: Date
}

export type RegistrationDecision =
  | { readonly kind: 'UNCHANGED'; readonly status: RegistrationStatus }
  | { readonly kind: 'CONFIRM'; readonly from: RegistrationOrigin; readonly status: 'CONFIRMED' }
  | { readonly kind: 'WAITLIST'; readonly from: RegistrationOrigin; readonly status: 'WAITLISTED' }
  | { readonly kind: 'REJECT'; readonly from: RegistrationOrigin; readonly status: 'REJECTED' }

export const decideRegistration = (context: RegistrationContext): RegistrationDecision => {
  const { event, inventory, queueLength, currentStatus, now } = context

  if (isActiveRegistration(currentStatus) && currentStatus) {
    return { kind: 'UNCHANGED', status: currentStatus }
  }

  if (!isEnrollmentOpen(event, now)) {
    throw new DomainError('EVENT_CLOSED', 'Enrollment for this event is not open.', {
      eventStatus: event.status,
    })
  }

  const queueIsActive = queueLength > 0

  if (!isSoldOut(inventory) && !queueIsActive) {
    assertRegistrationTransition(currentStatus, 'CONFIRMED')
    return { kind: 'CONFIRM', from: currentStatus, status: 'CONFIRMED' }
  }

  if (event.waitlistEnabled) {
    assertRegistrationTransition(currentStatus, 'WAITLISTED')
    return { kind: 'WAITLIST', from: currentStatus, status: 'WAITLISTED' }
  }

  if (currentStatus === 'REJECTED') {
    return { kind: 'UNCHANGED', status: 'REJECTED' }
  }

  assertRegistrationTransition(currentStatus, 'REJECTED')
  return { kind: 'REJECT', from: currentStatus, status: 'REJECTED' }
}

export interface CancellationContext {
  readonly currentStatus: RegistrationStatus
  readonly queueLength: number
}

export type CancellationDecision =
  | { readonly kind: 'RELEASE_SEAT'; readonly promoteHeadOfQueue: boolean }
  | { readonly kind: 'LEAVE_QUEUE' }
  | { readonly kind: 'UNCHANGED'; readonly status: RegistrationStatus }

export const decideCancellation = (context: CancellationContext): CancellationDecision => {
  switch (context.currentStatus) {
    case 'CONFIRMED':
      return { kind: 'RELEASE_SEAT', promoteHeadOfQueue: context.queueLength > 0 }
    case 'WAITLISTED':
      return { kind: 'LEAVE_QUEUE' }
    case 'CANCELLED':
    case 'REJECTED':
      return { kind: 'UNCHANGED', status: context.currentStatus }
  }
}
