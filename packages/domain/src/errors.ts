export type DomainErrorCode =
  | 'EVENT_CLOSED'
  | 'SOLD_OUT'
  | 'CAPACITY_BELOW_CONFIRMED'
  | 'INVALID_CAPACITY'
  | 'INVALID_ENROLLMENT_WINDOW'
  | 'INVALID_EVENT_TRANSITION'
  | 'INVALID_REGISTRATION_TRANSITION'
  | 'INSUFFICIENT_ROLE'
  | 'INVARIANT_VIOLATION'

export class DomainError extends Error {
  override readonly name = 'DomainError'

  constructor(
    readonly code: DomainErrorCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message)
  }
}

export const isDomainError = (value: unknown): value is DomainError => value instanceof DomainError
