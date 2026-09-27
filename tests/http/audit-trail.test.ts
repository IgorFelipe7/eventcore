import { randomUUID } from 'node:crypto'
import { type App } from '@eventcore/api'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { bearer, createTestApi } from '../support/api'
import {
  type TestDatabase,
  createEventFixture,
  createTestDatabase,
  createUsers,
} from '../support/database'
import { cancel, register } from '../support/requests'

describe('audit trail and transactional outbox (I6, I7)', () => {
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

  const outboxFor = async (aggregateId: string) => {
    const { rows } = await database.db.execute<{
      event_type: string
      payload: Record<string, unknown>
    }>(
      sql`SELECT event_type, payload FROM outbox_events WHERE aggregate_id = ${aggregateId} ORDER BY created_at, id`,
    )
    return rows
  }

  it('writes history, audit and outbox with the same correlation id as the response', async () => {
    const fixture = await createEventFixture(database, { capacity: 1 })
    const [participant] = await createUsers(database, 1)

    const result = await register(api, participant, fixture.eventId)
    const { registrationId, requestId } = result.body as {
      registrationId: string
      requestId: string
    }

    const { rows: audit } = await database.db.execute<{ action: string; request_id: string }>(
      sql`SELECT action, request_id FROM audit_log WHERE resource_id = ${registrationId}`,
    )
    const { rows: history } = await database.db.execute<{ correlation_id: string }>(
      sql`SELECT correlation_id FROM registration_events WHERE registration_id = ${registrationId}`,
    )

    expect(audit).toEqual([{ action: 'participant.registered', request_id: requestId }])
    expect(history).toEqual([{ correlation_id: requestId }])
    expect(await outboxFor(registrationId)).toEqual([
      expect.objectContaining({
        event_type: 'registration.confirmed',
        payload: expect.objectContaining({ registrationId, to: 'CONFIRMED', requestId }),
      }),
    ])
  })

  it('records the promotion caused by a cancellation as its own outbox event', async () => {
    const fixture = await createEventFixture(database, { capacity: 1 })
    const [holder, waiting] = await createUsers(database, 2)
    const held = await register(api, holder, fixture.eventId)
    const queued = await register(api, waiting, fixture.eventId)

    await cancel(api, holder, held.body.registrationId)

    expect((await outboxFor(queued.body.registrationId)).map((row) => row.event_type)).toEqual([
      'registration.waitlisted',
      'registration.confirmed',
    ])
  })

  it('leaves no trail when the command is rejected before it commits', async () => {
    const fixture = await createEventFixture(database, { capacity: 3 })
    const [participant] = await createUsers(database, 1)
    const key = randomUUID()

    await register(api, participant, fixture.eventId, { key, body: { source: 'web' } })
    const { rows: before } = await database.db.execute<{ count: number }>(
      sql`SELECT count(*)::int AS count FROM audit_log`,
    )
    const conflict = await register(api, participant, fixture.eventId, {
      key,
      body: { source: 'api' },
    })
    const { rows: after } = await database.db.execute<{ count: number }>(
      sql`SELECT count(*)::int AS count FROM audit_log`,
    )

    expect(conflict.status).toBe(422)
    expect(after).toEqual(before)
  })

  it('serves the trail to admins only, without names in it', async () => {
    const fixture = await createEventFixture(database, { capacity: 2 })
    const [participant] = await createUsers(database, 1)
    await register(api, participant, fixture.eventId)

    const response = await api.inject({
      method: 'GET',
      url: `/v1/organizations/${fixture.organizationId}/audit?limit=10`,
      headers: await bearer(fixture.admin),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().items[0]).toMatchObject({ action: 'participant.registered' })
    expect(response.body).not.toContain(participant.displayName)

    const asParticipant = await api.inject({
      method: 'GET',
      url: `/v1/organizations/${fixture.organizationId}/audit`,
      headers: await bearer(participant),
    })
    expect(asParticipant.statusCode).toBe(403)
    expect(asParticipant.json().code).toBe('FORBIDDEN_TENANT')
  })
})
