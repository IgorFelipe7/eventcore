import { TokenRejectedError, type TokenVerifier } from '@eventcore/auth'
import { type Database, ensureUser } from '@eventcore/db'
import { type FastifyInstance, type FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { ProblemError } from '../http/problem'

export interface Actor {
  readonly userId: string
  readonly subject: string
  readonly displayName: string
}

declare module 'fastify' {
  interface FastifyRequest {
    actor: Actor | null
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>
  }
}

interface CachedActor {
  readonly actor: Actor
  readonly expiresAt: number
}

const ACTOR_CACHE_TTL_MS = 60_000
const ACTOR_CACHE_LIMIT = 5_000

const bearerTokenOf = (request: FastifyRequest): string | null => {
  const header = request.headers.authorization
  if (!header) return null
  const [scheme, token] = header.split(' ')
  return scheme?.toLowerCase() === 'bearer' && token ? token : null
}

export const authenticationPlugin = fp<{ db: Database; verifyToken: TokenVerifier }>(
  async (app: FastifyInstance, { db, verifyToken }) => {
    const cache = new Map<string, CachedActor>()

    const resolveActor = async (subject: string, displayName: string): Promise<Actor> => {
      const cached = cache.get(subject)
      if (cached && cached.expiresAt > Date.now() && cached.actor.displayName === displayName) {
        return cached.actor
      }
      const user = await ensureUser(db, subject, displayName)
      const actor = { userId: user.id, subject, displayName: user.displayName }
      if (cache.size >= ACTOR_CACHE_LIMIT) cache.clear()
      cache.set(subject, { actor, expiresAt: Date.now() + ACTOR_CACHE_TTL_MS })
      return actor
    }

    app.decorateRequest('actor', null)

    app.decorate('authenticate', async (request: FastifyRequest) => {
      const token = bearerTokenOf(request)
      if (!token) throw new ProblemError('UNAUTHENTICATED', 'Send a bearer token.')
      try {
        const identity = await verifyToken(token)
        request.actor = await resolveActor(identity.subject, identity.displayName)
      } catch (error) {
        if (error instanceof TokenRejectedError) {
          request.log.info(
            { error_code: 'UNAUTHENTICATED', reason: error.message },
            'token rejected',
          )
          throw new ProblemError('UNAUTHENTICATED', 'The bearer token is not valid.')
        }
        throw error
      }
    })
  },
  { name: 'eventcore-authentication' },
)

export const requireActor = (request: FastifyRequest): Actor => {
  if (!request.actor) throw new ProblemError('UNAUTHENTICATED')
  return request.actor
}
