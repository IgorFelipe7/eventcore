import { type App } from '@eventcore/api'
import { signDemoToken } from '@eventcore/auth'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TEST_AUTH, bearer, createTestApi } from '../support/api'
import {
  type EventFixture,
  type TestDatabase,
  createEventFixture,
  createTestDatabase,
  createUsers,
} from '../support/database'
import { cancel, changeCapacity, register } from '../support/requests'

describe('tenant isolation (I4, OWASP API1 BOLA)', () => {
  let database: TestDatabase
  let api: App
  let ours: EventFixture
  let theirs: EventFixture

  beforeAll(async () => {
    database = await createTestDatabase()
    api = await createTestApi(database)
    ours = await createEventFixture(database, { capacity: 5 })
    theirs = await createEventFixture(database, { capacity: 5 })
  })

  afterAll(async () => {
    await api.close()
    await database.close()
  })

  const asOurAdmin = async (method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) =>
    api.inject({ method, url, headers: await bearer(ours.admin), ...(payload ? { payload } : {}) })

  it('refuses every route of an organization the caller does not belong to', async () => {
    const urls = [
      `/v1/organizations/${theirs.organizationId}/events`,
      `/v1/organizations/${theirs.organizationId}/events/${theirs.eventId}`,
      `/v1/organizations/${theirs.organizationId}/events/${theirs.eventId}/registrations`,
      `/v1/organizations/${theirs.organizationId}/audit`,
      `/v1/organizations/${theirs.organizationId}/integrity`,
    ]
    for (const url of urls) {
      const response = await asOurAdmin('GET', url)
      expect(response.statusCode, url).toBe(403)
      expect(response.json().code, url).toBe('FORBIDDEN_TENANT')
    }
  })

  it('does not find another organization’s event through our own organization path', async () => {
    const base = `/v1/organizations/${ours.organizationId}/events/${theirs.eventId}`
    const attempts = await Promise.all([
      asOurAdmin('GET', base),
      asOurAdmin('GET', `${base}/registrations`),
      asOurAdmin('PATCH', base, { venue: 'Hijacked' }),
      asOurAdmin('POST', `${base}/status`, { status: 'CANCELLED' }),
      changeCapacity(api, ours.admin, ours.organizationId, theirs.eventId, 0),
    ])

    for (const attempt of attempts) {
      const status = 'statusCode' in attempt ? attempt.statusCode : attempt.status
      expect(status).toBe(404)
    }

    const { rows } = await database.db.execute<{
      venue: string
      status: string
      capacity: number
    }>(sql`
      SELECT e.venue, e.status, i.capacity FROM events e JOIN event_inventory i ON i.event_id = e.id
      WHERE e.id = ${theirs.eventId}
    `)
    expect(rows[0]).toEqual({ venue: 'Fixture hall', status: 'PUBLISHED', capacity: 5 })
  })

  it('does not let an admin cancel registrations of another organization', async () => {
    const [participant] = await createUsers(database, 1)
    const registration = await register(api, participant, theirs.eventId)

    const attempt = await cancel(api, ours.admin, registration.body.registrationId)

    expect(attempt.status).toBe(404)
    expect(attempt.body.code).toBe('NOT_FOUND')
  })

  it('ignores tenant and identity fields smuggled into request bodies', async () => {
    const now = Date.now()
    const created = await asOurAdmin('POST', `/v1/organizations/${ours.organizationId}/events`, {
      slug: 'smuggled-event',
      name: 'Smuggled',
      venue: 'Hall',
      capacity: 3,
      organizationId: theirs.organizationId,
      startsAt: new Date(now + 3 * 86_400_000).toISOString(),
      enrollmentOpensAt: new Date(now).toISOString(),
      enrollmentClosesAt: new Date(now + 2 * 86_400_000).toISOString(),
    })
    expect(created.statusCode).toBe(201)
    expect(created.json().organization.id).toBe(ours.organizationId)

    const [participant] = await createUsers(database, 1)
    const spoofed = await register(api, participant, ours.eventId, {
      body: { userId: ours.adminId },
    })
    expect(spoofed.status).toBe(400)
    expect(spoofed.body.code).toBe('VALIDATION_FAILED')
  })

  it('keeps participants’ registrations private to them', async () => {
    const [alice, bruno] = await createUsers(database, 2)
    await register(api, alice, ours.eventId)

    const view = await api.inject({
      method: 'GET',
      url: '/v1/me/registrations',
      headers: await bearer(bruno),
    })
    expect(view.json().items).toEqual([])
  })

  it('rejects tokens minted with the wrong key or for a non-demo subject', async () => {
    const forged = await signDemoToken({
      secret: 'an-attacker-controlled-secret-of-sufficient-length',
      issuer: TEST_AUTH.issuer,
      audience: TEST_AUTH.audience,
      subject: ours.admin.subject,
      displayName: 'Attacker',
    })
    const response = await api.inject({
      method: 'GET',
      url: `/v1/organizations/${ours.organizationId}/audit`,
      headers: { authorization: `Bearer ${forged}` },
    })
    expect(response.statusCode).toBe(401)
  })
})
