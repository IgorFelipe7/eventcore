import { createHash } from 'node:crypto'
import {
  IDEMPOTENCY_KEY_HEADER,
  IDEMPOTENT_REPLAYED_HEADER,
  IdempotencyKeySchema,
} from '@eventcore/contracts'
import {
  type Database,
  type IdempotencyScope,
  type Transaction,
  claimIdempotencyKey,
  completeIdempotencyKey,
} from '@eventcore/db'
import { type FastifyReply, type FastifyRequest } from 'fastify'
import { ProblemError } from '../http/problem'
import { type CommandResponse } from './command'

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    )
  }
  return value
}

export const fingerprintRequest = (request: {
  readonly action: string
  readonly scopeId: string
  readonly body: unknown
}): string =>
  createHash('sha256')
    .update(JSON.stringify(canonicalize(request)))
    .digest('hex')

export const requireIdempotencyKey = (request: FastifyRequest): string => {
  const header = request.headers[IDEMPOTENCY_KEY_HEADER]
  const value = Array.isArray(header) ? header[0] : header
  if (!value) {
    throw new ProblemError(
      'IDEMPOTENCY_KEY_REQUIRED',
      'Generate a random UUID per user intent and send it as Idempotency-Key. Reuse it when retrying.',
    )
  }
  const parsed = IdempotencyKeySchema.safeParse(value)
  if (!parsed.success) {
    throw new ProblemError('VALIDATION_FAILED', 'The Idempotency-Key header is malformed.', {
      errors: [{ path: 'headers.idempotency-key', message: 'Use 8-128 letters, digits, - or _.' }],
    })
  }
  return parsed.data
}

export interface IdempotentResponse extends CommandResponse {
  readonly replayed: boolean
}

export const executeIdempotent = (
  db: Database,
  scope: IdempotencyScope,
  requestHash: string,
  ttlSeconds: number,
  command: (tx: Transaction) => Promise<CommandResponse>,
): Promise<IdempotentResponse> =>
  db.transaction(async (tx) => {
    const claim = await claimIdempotencyKey(tx, scope, requestHash, ttlSeconds)

    if (claim.kind === 'replay') {
      return { status: claim.httpStatus, body: claim.responseBody, replayed: true }
    }
    if (claim.kind === 'conflict') {
      throw new ProblemError(
        'IDEMPOTENCY_KEY_REUSED',
        'This key already belongs to a different request. Generate a new key for a new intent.',
      )
    }

    const response = await command(tx)
    await completeIdempotencyKey(tx, claim.id, response.status, response.body)
    return { ...response, replayed: false }
  })

export const sendCommandResponse = (reply: FastifyReply, response: IdempotentResponse) => {
  if (response.replayed) void reply.header(IDEMPOTENT_REPLAYED_HEADER, 'true')
  if (response.status >= 400) void reply.type('application/problem+json')
  return reply.code(response.status).send(response.body as never)
}
