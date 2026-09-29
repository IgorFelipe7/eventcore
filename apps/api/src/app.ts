import { createTokenVerifier, type TokenVerifier } from '@eventcore/auth'
import { REQUEST_ID_HEADER } from '@eventcore/contracts'
import { type Database } from '@eventcore/db'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import Fastify, { type FastifyServerOptions, LogController } from 'fastify'
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { authenticationPlugin } from './auth/authenticate'
import { type ApiConfig } from './config'
import { registerErrorHandling } from './http/error-handler'
import { generateRequestId } from './http/request-id'
import { publicEventRoutes } from './modules/events/public-routes'
import { healthRoutes } from './modules/health/routes'
import { identityRoutes } from './modules/identity/routes'
import { organizationRoutes } from './modules/organizations/routes'
import { registrationRoutes } from './modules/registrations/routes'
import { metricsPlugin } from './observability/metrics'

export interface AppDependencies {
  readonly db: Database
  readonly config: ApiConfig
  readonly clock?: () => Date
  readonly verifyToken?: TokenVerifier
  readonly logger?: FastifyServerOptions['logger']
}

export const buildApp = async (dependencies: AppDependencies) => {
  const { db, config } = dependencies
  const clock = dependencies.clock ?? (() => new Date())

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

  if (config.rateLimitPerMinute > 0) {
    await app.register(rateLimit, {
      global: true,
      max: config.rateLimitPerMinute,
      timeWindow: '1 minute',
      keyGenerator: (request) => request.ip,
      errorResponseBuilder: (_request, context) => ({
        statusCode: 429,
        message: `Rate limit of ${context.max} requests per ${context.after} exceeded.`,
      }),
    })
  }

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'EventCore API',
        version: '1.0.0',
        description:
          'Capacity-limited event registrations that stay correct under concurrency. Errors follow RFC 9457.',
      },
      servers: [{ url: config.publicOrigin }],
      components: {
        securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      },
      tags: [
        { name: 'events', description: 'Public catalogue and availability' },
        { name: 'registrations', description: 'Idempotent participant commands' },
        { name: 'organizations', description: 'Tenant-scoped organizer operations' },
        { name: 'identity', description: 'The authenticated caller' },
      ],
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  })
  await app.register(swaggerUi, { routePrefix: '/docs' })

  registerErrorHandling(app)

  const verifyToken = dependencies.verifyToken ?? createTokenVerifier(config.auth)
  await app.register(authenticationPlugin, { db, verifyToken })
  await app.register(metricsPlugin, { db, token: config.metricsToken })

  await app.register(healthRoutes, { db })
  await app.register(identityRoutes, { db })
  await app.register(publicEventRoutes, { db })
  await app.register(organizationRoutes, {
    db,
    clock,
    idempotencyTtlSeconds: config.idempotencyTtlSeconds,
  })
  await app.register(registrationRoutes, {
    db,
    clock,
    idempotencyTtlSeconds: config.idempotencyTtlSeconds,
  })

  app.get('/openapi.json', { schema: { hide: true } }, async () => app.swagger())

  return app
}

export type App = Awaited<ReturnType<typeof buildApp>>
