import {
  CancellationResultSchema,
  IdSchema,
  MyRegistrationListSchema,
  ProblemDetailsSchema,
  RegisterBodySchema,
  RegistrationResultSchema,
} from '@eventcore/contracts'
import { type Database, listParticipantRegistrations } from '@eventcore/db'
import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  executeIdempotent,
  fingerprintRequest,
  requireIdempotencyKey,
  sendCommandResponse,
} from '../../application/idempotency'
import { requireActor } from '../../auth/authenticate'
import { problemContext } from '../../http/problem'
import { CANCEL_ACTION, cancelRegistration } from './cancel-registration'
import { REGISTER_ACTION, registerForEvent } from './register-for-event'

const IdempotencyHeadersSchema = z.object({ 'idempotency-key': z.string().optional() })

export const registrationRoutes: FastifyPluginAsyncZod<{
  db: Database
  clock: () => Date
  idempotencyTtlSeconds: number
}> = async (app, { db, clock, idempotencyTtlSeconds }) => {
  app.post(
    '/v1/events/:eventId/registrations',
    {
      onRequest: [app.authenticate],
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        tags: ['registrations'],
        summary: 'Register the authenticated participant for an event',
        description:
          'Idempotent. Send a random Idempotency-Key per intent and reuse it on retry; a replay returns the original response with Idempotent-Replayed: true.',
        security: [{ bearer: [] }],
        headers: IdempotencyHeadersSchema,
        params: z.object({ eventId: IdSchema }),
        body: RegisterBodySchema,
        response: {
          200: RegistrationResultSchema,
          201: RegistrationResultSchema,
          '4xx': ProblemDetailsSchema,
        },
      },
    },
    async (request, reply) => {
      const actor = requireActor(request)
      const key = requireIdempotencyKey(request)
      const { eventId } = request.params
      const context = { actor, ...problemContext(request), now: clock() }

      const response = await executeIdempotent(
        db,
        { actorId: actor.userId, action: REGISTER_ACTION, scopeId: eventId, key },
        fingerprintRequest({ action: REGISTER_ACTION, scopeId: eventId, body: request.body }),
        idempotencyTtlSeconds,
        (tx) => registerForEvent(tx, context, eventId),
      )
      if (response.replayed) app.metrics.idempotentReplays.inc({ action: REGISTER_ACTION })
      else if (response.status === 201) {
        app.metrics.registrations.inc({ status: (response.body as { status: string }).status })
      } else if (response.status === 409) app.metrics.registrations.inc({ status: 'REJECTED' })
      return sendCommandResponse(reply, response)
    },
  )

  app.post(
    '/v1/registrations/:registrationId/cancel',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['registrations'],
        summary: 'Cancel a registration and promote the head of the waitlist atomically',
        description:
          'Idempotent. Callable by the participant or by an admin of the organization. Cancelling twice never releases two seats.',
        security: [{ bearer: [] }],
        headers: IdempotencyHeadersSchema,
        params: z.object({ registrationId: IdSchema }),
        body: z.object({}).strict().optional(),
        response: { 200: CancellationResultSchema, '4xx': ProblemDetailsSchema },
      },
    },
    async (request, reply) => {
      const actor = requireActor(request)
      const key = requireIdempotencyKey(request)
      const { registrationId } = request.params
      const context = { actor, ...problemContext(request), now: clock() }

      const response = await executeIdempotent(
        db,
        { actorId: actor.userId, action: CANCEL_ACTION, scopeId: registrationId, key },
        fingerprintRequest({ action: CANCEL_ACTION, scopeId: registrationId, body: {} }),
        idempotencyTtlSeconds,
        (tx) => cancelRegistration(tx, context, registrationId),
      )
      const result = response.body as {
        transition?: string
        promotedRegistrationId?: string | null
      }
      if (response.replayed) app.metrics.idempotentReplays.inc({ action: CANCEL_ACTION })
      else if (result.transition === 'CANCELLED') {
        app.metrics.cancellations.inc({ promoted: String(Boolean(result.promotedRegistrationId)) })
      }
      return sendCommandResponse(reply, response)
    },
  )

  app.get(
    '/v1/me/registrations',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['registrations'],
        summary: "The caller's registrations with waitlist positions and full history",
        security: [{ bearer: [] }],
        response: { 200: MyRegistrationListSchema, '4xx': ProblemDetailsSchema },
      },
    },
    async (request) => {
      const actor = requireActor(request)
      const rows = await listParticipantRegistrations(db, actor.userId)
      return {
        items: rows.map((row) => ({
          ...row,
          updatedAt: row.updatedAt.toISOString(),
          event: { ...row.event, startsAt: row.event.startsAt.toISOString() },
          history: row.history.map((entry) => ({
            ...entry,
            occurredAt: entry.occurredAt.toISOString(),
          })),
        })),
      }
    },
  )
}
