import { type App } from '@eventcore/api'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApi } from '../support/api'
import {
  type TestDatabase,
  addMember,
  createEventFixture,
  createTestDatabase,
  createUsers,
  integrityOf,
} from '../support/database'
import { changeCapacity, register } from '../support/requests'

describe('capacity changes', () => {
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

  it('promotes from the head of the queue when capacity grows', async () => {
    const fixture = await createEventFixture(database, { capacity: 2 })
    const users = await createUsers(database, 6)
    const registrations: string[] = []
    for (const user of users) {
      registrations.push((await register(api, user, fixture.eventId)).body.registrationId)
    }

    const result = await changeCapacity(
      api,
      fixture.admin,
      fixture.organizationId,
      fixture.eventId,
      5,
    )

    expect(result.status).toBe(200)
    expect(result.body.promotedRegistrationIds).toEqual(registrations.slice(2, 5))
    expect(result.body.inventory).toEqual({
      capacity: 5,
      confirmed: 5,
      available: 0,
      waitlisted: 1,
    })
  })

  it('refuses to shrink below the confirmed seats', async () => {
    const fixture = await createEventFixture(database, { capacity: 3 })
    for (const user of await createUsers(database, 3)) await register(api, user, fixture.eventId)

    const result = await changeCapacity(
      api,
      fixture.admin,
      fixture.organizationId,
      fixture.eventId,
      2,
    )

    expect(result.status).toBe(409)
    expect(result.body.code).toBe('CAPACITY_BELOW_CONFIRMED')
    expect(await integrityOf(database, fixture.eventId)).toMatchObject({ capacity: 3 })
  })

  it('reserves capacity changes for admins', async () => {
    const fixture = await createEventFixture(database, { capacity: 3 })
    const [organizer] = await createUsers(database, 1)
    await addMember(database, fixture.organizationId, organizer.id, 'ORGANIZER')

    const result = await changeCapacity(api, organizer, fixture.organizationId, fixture.eventId, 9)

    expect(result.status).toBe(403)
    expect(result.body.code).toBe('INSUFFICIENT_ROLE')
  })

  it('stays consistent when capacity changes race with a registration rush', async () => {
    const fixture = await createEventFixture(database, { capacity: 5 })
    const participants = await createUsers(database, 60)

    const capacities = [8, 12, 10, 20, 15]
    const results = await Promise.all([
      ...participants.map((participant) => register(api, participant, fixture.eventId)),
      ...capacities.map((capacity) =>
        changeCapacity(api, fixture.admin, fixture.organizationId, fixture.eventId, capacity),
      ),
    ])

    const capacityResults = results.slice(participants.length)
    expect(capacityResults.every((result) => [200, 409].includes(result.status))).toBe(true)

    const integrity = await integrityOf(database, fixture.eventId)
    expect(integrity.confirmedCount).toBeLessThanOrEqual(integrity.capacity)
    expect(integrity.confirmedCount).toBe(integrity.confirmedRows)
    expect(integrity.confirmedRows + integrity.waitlistedRows).toBe(60)
    if (integrity.waitlistedRows > 0) expect(integrity.confirmedCount).toBe(integrity.capacity)
  })

  it('fills every freed seat when more than one promotion batch is waiting', async () => {
    const fixture = await createEventFixture(database, { capacity: 10 })
    const participants = await createUsers(database, 620 as number)
    for (let start = 0; start < participants.length; start += 40) {
      await Promise.all(
        participants
          .slice(start, start + 40)
          .map((participant) => register(api, participant, fixture.eventId)),
      )
    }

    const result = await changeCapacity(
      api,
      fixture.admin,
      fixture.organizationId,
      fixture.eventId,
      1_000,
    )

    expect(result.status).toBe(200)
    expect(result.body.promotedRegistrationIds).toHaveLength(610)
    expect(result.body.inventory).toEqual({
      capacity: 1_000,
      confirmed: 620,
      available: 380,
      waitlisted: 0,
    })
    expect(await integrityOf(database, fixture.eventId)).toMatchObject({
      confirmedCount: 620,
      confirmedRows: 620,
      waitlistedRows: 0,
    })
  })
})
