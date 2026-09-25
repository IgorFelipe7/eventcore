import {
  IdSchema,
  ProblemDetailsSchema,
  RegisterBodySchema,
  RegistrationResultSchema,
} from '@eventcore/contracts'
import { type Database } from '@eventcore/db'
import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { requireActor } from '../../auth/authenticate'
import { problemContext } from '../../http/problem'
import { registerForEvent } from './register-for-event'

export const registrationRoutes: FastifyPluginAsyncZod<{
  db: Database
  clock: () => Date
}> = async (app, { db, clock }) => {
  app.post(
    '/v1/events/:eventId/registrations',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['registrations'],
        summary: 'Register the authenticated participant for an event',
        security: [{ bearer: [] }],
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
      const context = { actor: requireActor(request), ...problemContext(request), now: clock() }
      const response = await db.transaction((tx) =>
        registerForEvent(tx, context, request.params.eventId),
      )
      if (response.status >= 400) void reply.type('application/problem+json')
      return reply.code(response.status).send(response.body as never)
    },
  )
}
