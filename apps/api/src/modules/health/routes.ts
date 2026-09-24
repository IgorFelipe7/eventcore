import { type Database } from '@eventcore/db'
import { sql } from 'drizzle-orm'
import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

const HealthSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
  checks: z.record(z.string(), z.string()),
})

export const healthRoutes: FastifyPluginAsyncZod<{ db: Database }> = async (app, { db }) => {
  app.get(
    '/health/live',
    { schema: { hide: true, response: { 200: HealthSchema } }, config: { rateLimit: false } },
    async () => ({ status: 'ok' as const, checks: { process: 'ok' } }),
  )

  app.get(
    '/health/ready',
    {
      schema: { hide: true, response: { 200: HealthSchema, 503: HealthSchema } },
      config: { rateLimit: false },
    },
    async (_request, reply) => {
      try {
        await db.execute(sql`SELECT 1`)
        return { status: 'ok' as const, checks: { database: 'ok' } }
      } catch {
        return reply
          .code(503)
          .send({ status: 'unavailable' as const, checks: { database: 'unreachable' } })
      }
    },
  )
}
