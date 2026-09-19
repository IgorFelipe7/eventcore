import { DomainError } from '../errors'
import { type OrganizationRole } from '../organizations/roles'

export const EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED'] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]

type TransitionTable = Readonly<
  Record<EventStatus, Readonly<Partial<Record<EventStatus, readonly OrganizationRole[]>>>>
>

const transitions: TransitionTable = {
  DRAFT: { PUBLISHED: ['ADMIN', 'ORGANIZER'], CANCELLED: ['ADMIN'] },
  PUBLISHED: { CLOSED: ['ADMIN', 'ORGANIZER'], CANCELLED: ['ADMIN'] },
  CLOSED: { PUBLISHED: ['ADMIN'], CANCELLED: ['ADMIN'] },
  CANCELLED: {},
}

export const allowedEventTransitions = (from: EventStatus): EventStatus[] =>
  Object.keys(transitions[from]) as EventStatus[]

export const assertEventTransition = (
  from: EventStatus,
  to: EventStatus,
  role: OrganizationRole,
): void => {
  const roles = transitions[from][to]
  if (!roles) {
    throw new DomainError(
      'INVALID_EVENT_TRANSITION',
      `An event cannot move from ${from} to ${to}.`,
      {
        from,
        to,
      },
    )
  }
  if (!roles.includes(role)) {
    throw new DomainError('INSUFFICIENT_ROLE', `Role ${role} cannot move an event to ${to}.`, {
      from,
      to,
      role,
    })
  }
}

export interface EnrollmentSchedule {
  readonly startsAt: Date
  readonly enrollmentOpensAt: Date
  readonly enrollmentClosesAt: Date
}

export const assertEnrollmentSchedule = (schedule: EnrollmentSchedule): void => {
  const opens = schedule.enrollmentOpensAt.getTime()
  const closes = schedule.enrollmentClosesAt.getTime()
  const starts = schedule.startsAt.getTime()
  if ([opens, closes, starts].some(Number.isNaN) || opens >= closes || closes > starts) {
    throw new DomainError(
      'INVALID_ENROLLMENT_WINDOW',
      'Enrollment must open before it closes, and close no later than the event starts.',
    )
  }
}

export const isEnrollmentOpen = (
  event: { readonly status: EventStatus } & Omit<EnrollmentSchedule, 'startsAt'>,
  now: Date,
): boolean =>
  event.status === 'PUBLISHED' &&
  event.enrollmentOpensAt.getTime() <= now.getTime() &&
  now.getTime() < event.enrollmentClosesAt.getTime()
