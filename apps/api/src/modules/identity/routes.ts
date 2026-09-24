import { ProblemDetailsSchema, ViewerSchema } from '@eventcore/contracts'
import { type Database, listMemberships } from '@eventcore/db'
import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { requireActor } from '../../auth/authenticate'

export const identityRoutes: FastifyPluginAsyncZod<{ db: Database }> = async (app, { db }) => {
  app.get(
    '/v1/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['identity'],
        summary: 'The authenticated user and their organization memberships',
        security: [{ bearer: [] }],
        response: { 200: ViewerSchema, '4xx': ProblemDetailsSchema },
      },
    },
    async (request) => {
      const actor = requireActor(request)
      const memberships = await listMemberships(db, actor.userId)
      return { id: actor.userId, displayName: actor.displayName, memberships }
    },
  )
}
