import { type App, buildApp } from '@eventcore/api'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApi, testConfig } from '../support/api'
import {
  type TestDatabase,
  createEventFixture,
  createTestDatabase,
  createUsers,
} from '../support/database'
import { register } from '../support/requests'

describe('operability: OpenAPI, metrics and rate limits', () => {
  let database: TestDatabase
  let api: App

  beforeAll(async () => {
    database = await createTestDatabase()
    api = await createTestApi(database)
  })

  afterAll(async () => {
    await api.close()
    await database.close()
  })

  it('publishes an OpenAPI 3.1 document generated from the same Zod contracts', async () => {
    const document = (await api.inject({ method: 'GET', url: '/openapi.json' })).json()

    expect(document.openapi).toBe('3.1.0')
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        '/v1/events',
        '/v1/events/{eventId}/registrations',
        '/v1/registrations/{registrationId}/cancel',
        '/v1/organizations/{organizationId}/events/{eventId}/capacity',
      ]),
    )
    expect(document.components.schemas).toHaveProperty('ProblemDetails')
    expect(document.components.schemas).toHaveProperty('RegistrationResult')
    expect(Object.keys(document.paths)).not.toContain('/metrics')
  })

  it('counts business outcomes separately from HTTP traffic', async () => {
    const fixture = await createEventFixture(database, { capacity: 1 })
    const [first, second] = await createUsers(database, 2)
    await register(api, first, fixture.eventId)
    await register(api, second, fixture.eventId)

    const metrics = (await api.inject({ method: 'GET', url: '/metrics' })).body

    expect(metrics).toContain('registrations_total{status="CONFIRMED",service="eventcore-api"} 1')
    expect(metrics).toContain('registrations_total{status="WAITLISTED",service="eventcore-api"} 1')
    expect(metrics).toMatch(/business_invariant_violations\{service="eventcore-api"\} 0/)
    expect(metrics).toContain('route="/v1/events/:eventId/registrations"')
  })

  it('answers over-limit clients with a retryable 429 problem', async () => {
    const limited = await buildApp({
      db: database.db,
      config: { ...testConfig(database.url), rateLimitPerMinute: 3 },
      logger: false,
    })
    await limited.ready()

    const statuses: number[] = []
    let last
    for (let attempt = 0; attempt < 5; attempt += 1) {
      last = await limited.inject({ method: 'GET', url: '/v1/events' })
      statuses.push(last.statusCode)
    }
    await limited.close()

    expect(statuses).toEqual([200, 200, 200, 429, 429])
    expect(last?.json()).toMatchObject({ code: 'RATE_LIMITED', retryable: true })
    expect(last?.headers['retry-after']).toBeDefined()
  })
})
