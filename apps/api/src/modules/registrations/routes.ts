import {
  IdSchema,
  ProblemDetailsSchema,
  RegisterBodySchema,
  RegistrationResultSchema,
} from '@eventcore/contracts'
import { type Database } from '@eventcore/db'
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
      return sendCommandResponse(reply, response)
    },
  )
}
