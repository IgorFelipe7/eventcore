import { createTokenVerifier, type TokenVerifier } from '@eventcore/auth'
import { REQUEST_ID_HEADER } from '@eventcore/contracts'
import { type Database } from '@eventcore/db'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import Fastify, { type FastifyServerOptions, LogController } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { authenticationPlugin } from './auth/authenticate'
import { type ApiConfig } from './config'
import { registerErrorHandling } from './http/error-handler'
import { generateRequestId } from './http/request-id'
import { healthRoutes } from './modules/health/routes'
import { identityRoutes } from './modules/identity/routes'

export interface AppDependencies {
  readonly db: Database
  readonly config: ApiConfig
  readonly clock?: () => Date
  readonly verifyToken?: TokenVerifier
  readonly logger?: FastifyServerOptions['logger']
}

export const buildApp = async (dependencies: AppDependencies) => {
  const { db, config } = dependencies

  const app = Fastify({
    logger: dependencies.logger ?? {
      level: config.logLevel,
      redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["idempotency-key"]'],
    },
    genReqId: generateRequestId,
    logController: new LogController({ requestIdLogLabel: 'request_id' }),
    bodyLimit: 16 * 1024,
    trustProxy: config.trustProxy,
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.addHook('onSend', async (request, reply) => {
    void reply.header(REQUEST_ID_HEADER, request.id)
  })

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
  await app.register(cors, {
    origin: [...config.allowedOrigins],
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['authorization', 'content-type', 'idempotency-key', 'x-request-id'],
    exposedHeaders: ['x-request-id', 'idempotent-replayed', 'retry-after'],
    maxAge: 600,
  })

  registerErrorHandling(app)

  const verifyToken = dependencies.verifyToken ?? createTokenVerifier(config.auth)
  await app.register(authenticationPlugin, { db, verifyToken })

  await app.register(healthRoutes, { db })
  await app.register(identityRoutes, { db })

  return app
}

export type App = Awaited<ReturnType<typeof buildApp>>
