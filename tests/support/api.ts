import { type ApiConfig, type App, buildApp } from '@eventcore/api'
import { signDemoToken } from '@eventcore/auth'
import { type TestDatabase } from './database'

export const TEST_AUTH = {
  issuer: 'https://auth.eventcore.test',
  audience: 'eventcore-api',
  demoSecret: 'integration-tests-demo-secret-0123456789',
} as const

export const testConfig = (databaseUrl: string): ApiConfig => ({
  environment: 'test',
  databaseUrl,
  databasePoolSize: 40,
  host: '127.0.0.1',
  port: 0,
  publicOrigin: 'http://localhost:4000',
  allowedOrigins: ['http://localhost:3000'],
  logLevel: 'silent',
  trustProxy: false,
  auth: {
    issuer: TEST_AUTH.issuer,
    audience: TEST_AUTH.audience,
    jwksUrl: undefined,
    demoSecret: TEST_AUTH.demoSecret,
  },
  rateLimitPerMinute: 0,
  idempotencyTtlSeconds: 86_400,
  metricsToken: undefined,
})

export const createTestApi = async (
  database: TestDatabase,
  overrides: { clock?: () => Date } = {},
): Promise<App> => {
  const app = await buildApp({
    db: database.db,
    config: testConfig(database.url),
    logger: false,
    ...overrides,
  })
  await app.ready()
  return app
}

export const bearer = async (user: { subject: string; displayName: string }) => ({
  authorization: `Bearer ${await signDemoToken({
    secret: TEST_AUTH.demoSecret,
    issuer: TEST_AUTH.issuer,
    audience: TEST_AUTH.audience,
    subject: user.subject,
    displayName: user.displayName,
  })}`,
})
