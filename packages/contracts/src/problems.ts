import { z } from 'zod'

export const PROBLEM_CATALOG = {
  VALIDATION_FAILED: { status: 400, title: 'The request is not valid.' },
  IDEMPOTENCY_KEY_REQUIRED: { status: 400, title: 'An Idempotency-Key header is required.' },
  UNAUTHENTICATED: { status: 401, title: 'Authentication is required.' },
  FORBIDDEN_TENANT: { status: 403, title: 'You are not a member of this organization.' },
  INSUFFICIENT_ROLE: { status: 403, title: 'Your role does not allow this action.' },
  NOT_FOUND: { status: 404, title: 'The resource does not exist.' },
  EVENT_CLOSED: { status: 409, title: 'Enrollment for this event is not open.' },
  SOLD_OUT: { status: 409, title: 'The event is sold out and has no waitlist.' },
  CAPACITY_BELOW_CONFIRMED: { status: 409, title: 'Capacity cannot go below confirmed seats.' },
  INVALID_EVENT_TRANSITION: { status: 409, title: 'The event cannot move to that status.' },
  INVALID_REGISTRATION_TRANSITION: {
    status: 409,
    title: 'The registration cannot change that way.',
  },
  SLUG_TAKEN: { status: 409, title: 'That slug is already in use.' },
  IDEMPOTENCY_KEY_REUSED: {
    status: 422,
    title: 'This Idempotency-Key was already used with a different request.',
  },
  INVALID_CAPACITY: { status: 422, title: 'The capacity is not valid.' },
  INVALID_ENROLLMENT_WINDOW: { status: 422, title: 'The enrollment window is not valid.' },
  RATE_LIMITED: { status: 429, title: 'Too many requests. Slow down and retry later.' },
  INTERNAL_ERROR: { status: 500, title: 'Something went wrong on our side.' },
  INVARIANT_VIOLATION: { status: 500, title: 'A business invariant check failed.' },
  TEMPORARY_UNAVAILABLE: { status: 503, title: 'The service is temporarily unavailable.' },
} as const satisfies Record<string, { status: number; title: string }>

export type ProblemCode = keyof typeof PROBLEM_CATALOG

export const PROBLEM_CODES = Object.keys(PROBLEM_CATALOG) as [ProblemCode, ...ProblemCode[]]

export const problemTypeFor = (code: ProblemCode): string =>
  `/problems/${code.toLowerCase().replaceAll('_', '-')}`

export const ProblemDetailsSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int(),
    detail: z.string().optional(),
    instance: z.string().optional(),
    code: z.enum(PROBLEM_CODES),
    requestId: z.string(),
    retryable: z.boolean(),
    errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  })
  .meta({ id: 'ProblemDetails' })

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>

const RETRYABLE_CODES: readonly ProblemCode[] = ['RATE_LIMITED', 'TEMPORARY_UNAVAILABLE']

export const isRetryableProblem = (code: ProblemCode): boolean => RETRYABLE_CODES.includes(code)
