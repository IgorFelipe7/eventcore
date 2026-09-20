import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type TestDatabase,
  createEventFixture,
  createTestDatabase,
  createUsers,
  integrityOf,
} from '../support/database'
import { naiveRegister } from '../support/naive-registration'

describe('baseline: check-then-insert without a lock', () => {
  let database: TestDatabase

  beforeAll(async () => {
    database = await createTestDatabase(60)
  })

  afterAll(async () => {
    await database.close()
  })

  it('overbooks when 60 participants race for 10 seats', async () => {
    const fixture = await createEventFixture(database, { capacity: 10 })
    const participants = await createUsers(database, 60)

    const outcomes = await Promise.all(
      participants.map((participant) => naiveRegister(database, fixture.eventId, participant.id)),
    )

    const integrity = await integrityOf(database, fixture.eventId)
    const confirmed = outcomes.filter((outcome) => outcome === 'CONFIRMED').length

    expect(integrity.confirmedRows).toBe(confirmed)
    expect(integrity.confirmedRows).toBeGreaterThan(integrity.capacity)
  })
})
