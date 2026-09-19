import { DomainError } from '../errors'

export const REGISTRATION_STATUSES = ['CONFIRMED', 'WAITLISTED', 'REJECTED', 'CANCELLED'] as const
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number]

export type RegistrationOrigin = RegistrationStatus | null

const transitions: Readonly<Record<RegistrationStatus | 'NEW', readonly RegistrationStatus[]>> = {
  NEW: ['CONFIRMED', 'WAITLISTED', 'REJECTED'],
  WAITLISTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED'],
  CANCELLED: ['CONFIRMED', 'WAITLISTED', 'REJECTED'],
  REJECTED: ['CONFIRMED', 'WAITLISTED'],
}

export const isActiveRegistration = (status: RegistrationOrigin): boolean =>
  status === 'CONFIRMED' || status === 'WAITLISTED'

export const canTransitionRegistration = (
  from: RegistrationOrigin,
  to: RegistrationStatus,
): boolean => transitions[from ?? 'NEW'].includes(to)

export const assertRegistrationTransition = (
  from: RegistrationOrigin,
  to: RegistrationStatus,
): void => {
  if (!canTransitionRegistration(from, to)) {
    throw new DomainError(
      'INVALID_REGISTRATION_TRANSITION',
      `A registration cannot move from ${from ?? 'NEW'} to ${to}.`,
      { from, to },
    )
  }
}
