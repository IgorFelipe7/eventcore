import { type App } from '@eventcore/api'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { bearer, createTestApi } from '../support/api'
import {
  type TestDatabase,
  createEventFixture,
  createTestDatabase,
  createUser,
} from '../support/database'

describe('identity and HTTP conventions', () => {
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

  it('answers unauthenticated calls with an RFC 9457 problem and no internals', async () => {
    const response = await api.inject({ method: 'GET', url: '/v1/me' })

    expect(response.statusCode).toBe(401)
    expect(response.headers['content-type']).toContain('application/problem+json')
    expect(response.json()).toEqual({
      type: '/problems/unauthenticated',
      title: 'Authentication is required.',
      status: 401,
      detail: 'Send a bearer token.',
      instance: '/v1/me',
      code: 'UNAUTHENTICATED',
      requestId: response.headers['x-request-id'],
      retryable: false,
    })
  })

  it('rejects a tampered token', async () => {
    const headers = await bearer({ subject: 'demo|test-tamper', displayName: 'Tamper' })
    const response = await api.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `${headers.authorization}x` },
    })
    expect(response.statusCode).toBe(401)
  })

  it('creates the user on first sight and returns memberships', async () => {
    const fixture = await createEventFixture(database, { capacity: 1 })
    const admin = { subject: 'demo|test-first-sight', displayName: 'First Sight' }

    const first = await api.inject({ method: 'GET', url: '/v1/me', headers: await bearer(admin) })
    expect(first.statusCode).toBe(200)
    expect(first.json()).toMatchObject({ displayName: 'First Sight', memberships: [] })

    const member = await createUser(database)
    const response = await api.inject({
      method: 'GET',
      url: '/v1/me',
      headers: await bearer(member),
    })
    expect(response.json().memberships).toEqual([])
    expect(fixture.organizationId).toBeTruthy()
  })

  it('echoes a well-formed client request id and replaces a malformed one', async () => {
    const kept = await api.inject({
      method: 'GET',
      url: '/health/live',
      headers: { 'x-request-id': 'trace-abc-12345' },
    })
    expect(kept.headers['x-request-id']).toBe('trace-abc-12345')

    const replaced = await api.inject({
      method: 'GET',
      url: '/health/live',
      headers: { 'x-request-id': 'bad id with spaces' },
    })
    expect(replaced.headers['x-request-id']).not.toBe('bad id with spaces')
  })

  it('reports readiness against the real database', async () => {
    const response = await api.inject({ method: 'GET', url: '/health/ready' })
    expect(response.json()).toEqual({ status: 'ok', checks: { database: 'ok' } })
  })

  it('returns a problem document for unknown routes', async () => {
    const response = await api.inject({ method: 'GET', url: '/v1/nope' })
    expect(response.statusCode).toBe(404)
    expect(response.json().code).toBe('NOT_FOUND')
  })
})
