import { randomUUID } from 'node:crypto'
import { type App } from '@eventcore/api'
import { type MyRegistration } from '@eventcore/contracts'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { bearer, createTestApi } from '../support/api'
import {
  type TestDatabase,
  type TestUser,
  createEventFixture,
  createTestDatabase,
  createUser,
  createUsers,
  integrityOf,
} from '../support/database'
import { cancel, register } from '../support/requests'

describe('waitlist, cancellation and FIFO promotion (I5)', () => {
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

  interface Entry {
    readonly user: TestUser
    readonly registrationId: string
    readonly status: string
  }

  const fillInOrder = async <T extends readonly TestUser[]>(
    eventId: string,
    users: T,
  ): Promise<{ [K in keyof T]: Entry }> => {
    const registrations: Entry[] = []
    for (const user of users) {
      const result = await register(api, user, eventId)
      registrations.push({
        user,
        registrationId: result.body.registrationId,
        status: result.body.status,
      })
    }
    return registrations as { [K in keyof T]: Entry }
  }

  const myRegistration = async (user: TestUser, registrationId: string) => {
    const response = await api.inject({
      method: 'GET',
      url: '/v1/me/registrations',
      headers: await bearer(user),
    })
    const items = response.json<{ items: MyRegistration[] }>().items
    const found = items.find((item) => item.registrationId === registrationId)
    if (!found) throw new Error(`Registration ${registrationId} is not visible to its owner.`)
    return found
  }

  it('promotes the head of the queue in the same transaction as the cancellation', async () => {
    const fixture = await createEventFixture(database, { capacity: 1 })
    const [holder, firstInLine, secondInLine] = await fillInOrder(
      fixture.eventId,
      await createUsers(database, 3),
    )

    const result = await cancel(api, holder.user, holder.registrationId)

    expect(result.body).toMatchObject({
      status: 'CANCELLED',
      transition: 'CANCELLED',
      promotedRegistrationId: firstInLine.registrationId,
      inventory: { capacity: 1, confirmed: 1, available: 0, waitlisted: 1 },
    })
    expect(await myRegistration(firstInLine.user, firstInLine.registrationId)).toMatchObject({
      status: 'CONFIRMED',
      waitlistPosition: null,
    })
    expect(await myRegistration(secondInLine.user, secondInLine.registrationId)).toMatchObject({
      status: 'WAITLISTED',
      waitlistPosition: 1,
    })
  })

  it('never releases a seat twice, with or without the same key', async () => {
    const fixture = await createEventFixture(database, { capacity: 2 })
    const [holder] = await fillInOrder(fixture.eventId, await createUsers(database, 2))
    const key = randomUUID()

    const first = await cancel(api, holder.user, holder.registrationId, { key })
    const replay = await cancel(api, holder.user, holder.registrationId, { key })
    const fresh = await cancel(api, holder.user, holder.registrationId)

    expect(first.body.transition).toBe('CANCELLED')
    expect(replay.headers['idempotent-replayed']).toBe('true')
    expect(replay.body).toEqual(first.body)
    expect(fresh.body.transition).toBe('UNCHANGED')
    expect(await integrityOf(database, fixture.eventId)).toMatchObject({
      confirmedCount: 1,
      confirmedRows: 1,
    })
  })

  it('lets a participant leave the queue without touching confirmed seats', async () => {
    const fixture = await createEventFixture(database, { capacity: 1 })
    const [, leaving, staying] = await fillInOrder(fixture.eventId, await createUsers(database, 3))

    const result = await cancel(api, leaving.user, leaving.registrationId)

    expect(result.body).toMatchObject({
      promotedRegistrationId: null,
      inventory: { confirmed: 1, waitlisted: 1 },
    })
    expect((await myRegistration(staying.user, staying.registrationId)).waitlistPosition).toBe(1)
  })

  it('promotes strictly in arrival order while cancellations and newcomers race', async () => {
    const fixture = await createEventFixture(database, { capacity: 10 })
    const holders: Entry[] = await fillInOrder(fixture.eventId, await createUsers(database, 10))
    const queued: Entry[] = await fillInOrder(fixture.eventId, await createUsers(database, 15))
    expect(queued.every((entry) => entry.status === 'WAITLISTED')).toBe(true)
    const newcomers = await createUsers(database, 20)

    const results = await Promise.all([
      ...holders.map((holder) => cancel(api, holder.user, holder.registrationId)),
      ...newcomers.map((newcomer) => register(api, newcomer, fixture.eventId)),
    ])

    const promoted = results
      .map((result) => result.body.promotedRegistrationId as string | null | undefined)
      .filter((id): id is string => typeof id === 'string')
    expect(new Set(promoted)).toEqual(
      new Set(queued.slice(0, 10).map((entry) => entry.registrationId)),
    )
    expect(
      results.filter(
        (result) => result.body.transition === 'CREATED' && result.body.status === 'CONFIRMED',
      ),
    ).toHaveLength(0)

    const remaining = await Promise.all(
      queued.slice(10).map((entry) => myRegistration(entry.user, entry.registrationId)),
    )
    expect(remaining.map((entry) => entry.waitlistPosition)).toEqual([1, 2, 3, 4, 5])

    expect(await integrityOf(database, fixture.eventId)).toMatchObject({
      capacity: 10,
      confirmedCount: 10,
      confirmedRows: 10,
      waitlistedRows: 25,
    })
  })

  it('sends a returning participant to the back of the queue', async () => {
    const fixture = await createEventFixture(database, { capacity: 1 })
    const [holder, waiting] = await fillInOrder(fixture.eventId, await createUsers(database, 2))

    await cancel(api, holder.user, holder.registrationId)
    const returning = await register(api, holder.user, fixture.eventId)

    expect(returning.body).toMatchObject({
      registrationId: holder.registrationId,
      status: 'WAITLISTED',
      transition: 'REENTERED',
      waitlistPosition: 1,
    })
    expect((await myRegistration(waiting.user, waiting.registrationId)).status).toBe('CONFIRMED')
    const history = (await myRegistration(holder.user, holder.registrationId)).history
    expect(history.map((entry) => entry.reason)).toEqual([
      'participant.registered',
      'participant.cancelled',
      'participant.reentered',
    ])
  })

  it('hides other participants’ registrations and lets organization admins cancel them', async () => {
    const fixture = await createEventFixture(database, { capacity: 3 })
    const [owner] = await fillInOrder(fixture.eventId, await createUsers(database, 1))
    const stranger = await createUser(database)

    const attempt = await cancel(api, stranger, owner.registrationId)
    expect(attempt.status).toBe(404)

    const byAdmin = await cancel(api, fixture.admin, owner.registrationId)
    expect(byAdmin.body.transition).toBe('CANCELLED')
    expect((await myRegistration(owner.user, owner.registrationId)).history.at(-1)?.reason).toBe(
      'organizer.cancelled',
    )
  })
})
