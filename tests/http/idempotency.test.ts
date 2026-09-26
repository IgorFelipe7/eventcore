import { randomUUID } from 'node:crypto'
import { type App } from '@eventcore/api'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApi } from '../support/api'
import {
  type TestDatabase,
  createEventFixture,
  createTestDatabase,
  createUsers,
  integrityOf,
} from '../support/database'
import { register } from '../support/requests'

describe('idempotent registration (I3)', () => {
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

  const registrationRows = async (eventId: string) => {
    const { rows } = await database.db.execute<{ count: number }>(
      sql`SELECT count(*)::int AS count FROM registrations WHERE event_id = ${eventId}`,
    )
    return rows[0]?.count
  }

  it('requires a key and explains how to use it', async () => {
    const fixture = await createEventFixture(database, { capacity: 1 })
    const [participant] = await createUsers(database, 1)

    const response = await register(api, participant, fixture.eventId, { key: null })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED')
    expect(await registrationRows(fixture.eventId)).toBe(0)
  })

  it('refuses malformed keys', async () => {
    const fixture = await createEventFixture(database, { capacity: 1 })
    const [participant] = await createUsers(database, 1)
    const response = await register(api, participant, fixture.eventId, { key: 'not a key!' })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('VALIDATION_FAILED')
  })

  it('collapses a burst of identical requests into one effect and one answer', async () => {
    const fixture = await createEventFixture(database, { capacity: 5 })
    const [participant] = await createUsers(database, 1)
    const key = randomUUID()

    const results = await Promise.all(
      Array.from({ length: 10 }, () => register(api, participant, fixture.eventId, { key })),
    )

    expect(new Set(results.map((result) => JSON.stringify(result.body))).size).toBe(1)
    expect(results.every((result) => result.status === 201)).toBe(true)
    expect(
      results.filter((result) => result.headers['idempotent-replayed'] === 'true'),
    ).toHaveLength(9)
    expect(await registrationRows(fixture.eventId)).toBe(1)
    expect(await integrityOf(database, fixture.eventId)).toMatchObject({ confirmedCount: 1 })
  })

  it('replays the original snapshot when the client retries after losing the response', async () => {
    const fixture = await createEventFixture(database, { capacity: 1 })
    const [lostResponse, someoneElse] = await createUsers(database, 2)
    const key = randomUUID()

    const original = await register(api, lostResponse, fixture.eventId, { key })
    expect(original.body.status).toBe('CONFIRMED')

    const late = await register(api, someoneElse, fixture.eventId)
    expect(late.body.status).toBe('WAITLISTED')

    const retry = await register(api, lostResponse, fixture.eventId, { key })

    expect(retry.status).toBe(201)
    expect(retry.headers['idempotent-replayed']).toBe('true')
    expect(retry.body).toEqual(original.body)
    expect(retry.headers['x-request-id']).not.toBe(original.body.requestId)
    expect(await integrityOf(database, fixture.eventId)).toMatchObject({
      confirmedCount: 1,
      confirmedRows: 1,
      waitlistedRows: 1,
    })
  })

  it('rejects the same key with a different payload', async () => {
    const fixture = await createEventFixture(database, { capacity: 3 })
    const [participant] = await createUsers(database, 1)
    const key = randomUUID()

    await register(api, participant, fixture.eventId, { key, body: { source: 'web' } })
    const reused = await register(api, participant, fixture.eventId, {
      key,
      body: { source: 'api' },
    })

    expect(reused.status).toBe(422)
    expect(reused.body.code).toBe('IDEMPOTENCY_KEY_REUSED')
  })

  it('scopes keys by actor and by event', async () => {
    const first = await createEventFixture(database, { capacity: 3 })
    const second = await createEventFixture(database, { capacity: 3 })
    const [alice, bruno] = await createUsers(database, 2)
    const key = randomUUID()

    const results = await Promise.all([
      register(api, alice, first.eventId, { key }),
      register(api, bruno, first.eventId, { key }),
      register(api, alice, second.eventId, { key }),
    ])

    expect(results.map((result) => result.status)).toEqual([201, 201, 201])
    expect(results.some((result) => result.headers['idempotent-replayed'])).toBe(false)
    expect(new Set(results.map((result) => result.body.registrationId)).size).toBe(3)
  })

  it('stores business rejections so a retry gets the same answer', async () => {
    const fixture = await createEventFixture(database, { capacity: 0, waitlistEnabled: false })
    const [participant] = await createUsers(database, 1)
    const key = randomUUID()

    const first = await register(api, participant, fixture.eventId, { key })
    await database.db.execute(
      sql`UPDATE event_inventory SET capacity = 5 WHERE event_id = ${fixture.eventId}`,
    )
    const retry = await register(api, participant, fixture.eventId, { key })

    expect(first.status).toBe(409)
    expect(retry.status).toBe(409)
    expect(retry.body).toEqual(first.body)
    expect(retry.headers['content-type']).toContain('application/problem+json')
  })
})
