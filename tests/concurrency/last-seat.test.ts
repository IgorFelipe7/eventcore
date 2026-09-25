import { type App } from '@eventcore/api'
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

describe('registration under concurrent pressure', () => {
  let database: TestDatabase
  let api: App

  beforeAll(async () => {
    database = await createTestDatabase(40)
    api = await createTestApi(database)
  })

  afterAll(async () => {
    await api.close()
    await database.close()
  })

  it('gives the last seat to exactly one of two simultaneous participants, 30 rounds in a row', async () => {
    for (let round = 0; round < 30; round += 1) {
      const fixture = await createEventFixture(database, { capacity: 1 })
      const [first, second] = await createUsers(database, 2)
      if (!first || !second) throw new Error('fixture users missing')

      const results = await Promise.all([
        register(api, first, fixture.eventId),
        register(api, second, fixture.eventId),
      ])

      const statuses = results.map((result) => result.body.status).sort()
      expect(statuses).toEqual(['CONFIRMED', 'WAITLISTED'])
      expect(
        results.find((result) => result.body.status === 'WAITLISTED')?.body.waitlistPosition,
      ).toBe(1)

      const integrity = await integrityOf(database, fixture.eventId)
      expect(integrity).toMatchObject({
        capacity: 1,
        confirmedCount: 1,
        confirmedRows: 1,
        waitlistedRows: 1,
      })
    }
  })

  it('confirms exactly ten of one hundred participants and queues the rest in a gapless order', async () => {
    const fixture = await createEventFixture(database, { capacity: 10 })
    const participants = await createUsers(database, 100)

    const results = await Promise.all(
      participants.map((participant) => register(api, participant, fixture.eventId)),
    )

    expect(results.every((result) => result.status === 201)).toBe(true)
    const confirmed = results.filter((result) => result.body.status === 'CONFIRMED')
    const waitlisted = results.filter((result) => result.body.status === 'WAITLISTED')
    expect(confirmed).toHaveLength(10)
    expect(waitlisted).toHaveLength(90)

    const positions = waitlisted.map((result) => result.body.waitlistPosition as number)
    expect(new Set(positions).size).toBe(90)
    expect(Math.min(...positions)).toBe(1)
    expect(Math.max(...positions)).toBe(90)

    const integrity = await integrityOf(database, fixture.eventId)
    expect(integrity).toMatchObject({ confirmedCount: 10, confirmedRows: 10, waitlistedRows: 90 })
  })

  it('rejects without consuming seats when the waitlist is disabled', async () => {
    const fixture = await createEventFixture(database, { capacity: 5, waitlistEnabled: false })
    const participants = await createUsers(database, 30)

    const results = await Promise.all(
      participants.map((participant) => register(api, participant, fixture.eventId)),
    )

    expect(results.filter((result) => result.status === 201)).toHaveLength(5)
    const soldOut = results.filter((result) => result.status === 409)
    expect(soldOut).toHaveLength(25)
    expect(soldOut.every((result) => result.body.code === 'SOLD_OUT')).toBe(true)
    expect(await integrityOf(database, fixture.eventId)).toMatchObject({
      confirmedCount: 5,
      confirmedRows: 5,
    })
  })

  it('never creates a second registration for the same participant, even when requests overlap', async () => {
    const fixture = await createEventFixture(database, { capacity: 3 })
    const [participant] = await createUsers(database, 1)
    if (!participant) throw new Error('fixture user missing')

    const results = await Promise.all(
      Array.from({ length: 8 }, () => register(api, participant, fixture.eventId)),
    )

    const ids = new Set(results.map((result) => result.body.registrationId))
    expect(ids.size).toBe(1)
    expect(results.filter((result) => result.body.transition === 'CREATED')).toHaveLength(1)
    expect(results.filter((result) => result.body.transition === 'UNCHANGED')).toHaveLength(7)
    expect(await integrityOf(database, fixture.eventId)).toMatchObject({
      confirmedCount: 1,
      confirmedRows: 1,
    })
  })

  it('hides draft events and refuses closed ones', async () => {
    const [participant] = await createUsers(database, 1)
    if (!participant) throw new Error('fixture user missing')
    const draft = await createEventFixture(database, { capacity: 3, status: 'DRAFT' })
    const closed = await createEventFixture(database, { capacity: 3, status: 'CLOSED' })

    expect((await register(api, participant, draft.eventId)).status).toBe(404)
    const refused = await register(api, participant, closed.eventId)
    expect(refused.status).toBe(409)
    expect(refused.body.code).toBe('EVENT_CLOSED')
  })
})
