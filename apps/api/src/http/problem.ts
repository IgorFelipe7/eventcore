import {
  PROBLEM_CATALOG,
  type ProblemCode,
  type ProblemDetails,
  isRetryableProblem,
  problemTypeFor,
} from '@eventcore/contracts'
import { type DomainError, type DomainErrorCode } from '@eventcore/domain'
import { type FastifyReply, type FastifyRequest } from 'fastify'

export interface FieldError {
  readonly path: string
  readonly message: string
}

export class ProblemError extends Error {
  override readonly name = 'ProblemError'

  constructor(
    readonly code: ProblemCode,
    readonly detail?: string,
    readonly options: {
      readonly errors?: readonly FieldError[]
      readonly retryAfterSeconds?: number
    } = {},
  ) {
    super(detail ?? PROBLEM_CATALOG[code].title)
  }
}

export const buildProblem = (
  code: ProblemCode,
  context: { readonly requestId: string; readonly instance?: string },
  detail?: string,
  errors?: readonly FieldError[],
): ProblemDetails => {
  const { status, title } = PROBLEM_CATALOG[code]
  return {
    type: problemTypeFor(code),
    title,
    status,
    ...(detail ? { detail } : {}),
    ...(context.instance ? { instance: context.instance } : {}),
    code,
    requestId: context.requestId,
    retryable: isRetryableProblem(code),
    ...(errors && errors.length > 0 ? { errors: [...errors] } : {}),
  }
}

const domainProblemCodes = {
  EVENT_CLOSED: 'EVENT_CLOSED',
  SOLD_OUT: 'SOLD_OUT',
  CAPACITY_BELOW_CONFIRMED: 'CAPACITY_BELOW_CONFIRMED',
  INVALID_CAPACITY: 'INVALID_CAPACITY',
  INVALID_ENROLLMENT_WINDOW: 'INVALID_ENROLLMENT_WINDOW',
  INVALID_EVENT_TRANSITION: 'INVALID_EVENT_TRANSITION',
  INVALID_REGISTRATION_TRANSITION: 'INVALID_REGISTRATION_TRANSITION',
  INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
  INVARIANT_VIOLATION: 'INVARIANT_VIOLATION',
} as const satisfies Record<DomainErrorCode, ProblemCode>

export const problemFromDomainError = (
  error: DomainError,
  context: { readonly requestId: string; readonly instance?: string },
): ProblemDetails => buildProblem(domainProblemCodes[error.code], context, error.message)

export const problemContext = (request: FastifyRequest) => ({
  requestId: request.id,
  instance: request.url.split('?')[0] ?? request.url,
})

export const sendProblem = (reply: FastifyReply, problem: ProblemDetails, retryAfter?: number) => {
  if (retryAfter !== undefined) void reply.header('retry-after', String(retryAfter))
  return reply.code(problem.status).type('application/problem+json').send(problem)
}
