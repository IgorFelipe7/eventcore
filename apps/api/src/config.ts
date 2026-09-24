import { MIN_DEMO_SECRET_LENGTH } from '@eventcore/auth'
import { z } from 'zod'

const optional = z
  .string()
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined))

const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.url(),
  DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(200).default(20),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  API_PUBLIC_ORIGIN: z.url().default('http://localhost:4000'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TRUST_PROXY: z.stringbool().default(false),
  AUTH_ISSUER: z.string().min(1),
  AUTH_AUDIENCE: z.string().min(1),
  AUTH_JWKS_URL: optional.pipe(z.url().optional()),
  AUTH_DEMO_SECRET: optional.pipe(z.string().min(MIN_DEMO_SECRET_LENGTH).optional()),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(0).default(300),
  IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().min(60).default(86_400),
  METRICS_TOKEN: optional,
})

export interface ApiConfig {
  readonly environment: 'development' | 'test' | 'production'
  readonly databaseUrl: string
  readonly databasePoolSize: number
  readonly host: string
  readonly port: number
  readonly publicOrigin: string
  readonly allowedOrigins: readonly string[]
  readonly logLevel: string
  readonly trustProxy: boolean
  readonly auth: {
    readonly issuer: string
    readonly audience: string
    readonly jwksUrl: string | undefined
    readonly demoSecret: string | undefined
  }
  readonly rateLimitPerMinute: number
  readonly idempotencyTtlSeconds: number
  readonly metricsToken: string | undefined
}

export const loadConfig = (environment: NodeJS.ProcessEnv = process.env): ApiConfig => {
  const parsed = EnvironmentSchema.safeParse(environment)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Invalid API configuration: ${fields}.`)
  }
  const env = parsed.data
  if (!env.AUTH_JWKS_URL && !env.AUTH_DEMO_SECRET) {
    throw new Error('Configure AUTH_JWKS_URL, AUTH_DEMO_SECRET or both.')
  }
  return {
    environment: env.NODE_ENV,
    databaseUrl: env.DATABASE_URL,
    databasePoolSize: env.DATABASE_POOL_SIZE,
    host: env.API_HOST,
    port: env.API_PORT,
    publicOrigin: env.API_PUBLIC_ORIGIN,
    allowedOrigins: env.WEB_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    logLevel: env.LOG_LEVEL,
    trustProxy: env.TRUST_PROXY,
    auth: {
      issuer: env.AUTH_ISSUER,
      audience: env.AUTH_AUDIENCE,
      jwksUrl: env.AUTH_JWKS_URL,
      demoSecret: env.AUTH_DEMO_SECRET,
    },
    rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
    idempotencyTtlSeconds: env.IDEMPOTENCY_TTL_SECONDS,
    metricsToken: env.METRICS_TOKEN,
  }
}
