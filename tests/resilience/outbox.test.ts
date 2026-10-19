import { type App } from '@eventcore/api'
import { outboxStats } from '@eventcore/db'
import {
  type NotificationSink,
  demoMailbox,
  drainOutbox,
  relayOutboxBatch,
} from '@eventcore/worker'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestApi } from '../support/api'
import {
  type TestDatabase,
  createEventFixture,
  createTestDatabase,
  createUsers,
} from '../support/database'
import { register } from '../support/requests'

const relayOptions = { batchSize: 50, maxAttempts: 3, backoff: { baseDelayMs: 0, maxDelayMs: 0 } }

const providerDown: NotificationSink = {
  name: 'provider-down',
  deliver: () => Promise.reject(new Error('ECONNREFUSED provider.example:443')),
}

describe('outbox relay (I7)', () => {
  let database: TestDatabase
  let api: App

  beforeAll(async () => {
    database = await createTestDatabase()
    api = await createTestApi(database)
  })

  beforeEach(async () => {
    await database.db.execute(sql`TRUNCATE notification_deliveries, outbox_events`)
  })

  afterAll(async () => {
    await api.close()
    await database.close()
  })

  const deliveries = async () => {
    const { rows } = await database.db.execute<{ count: number }>(
      sql`SELECT count(*)::int AS count FROM notification_deliveries`,
    )
    return rows[0]?.count ?? 0
  }

  const makeDue = () => database.db.execute(sql`UPDATE outbox_events SET next_attempt_at = now()`)

  it('delivers each committed change once, however many times the relay runs', async () => {
    const fixture = await createEventFixture(database, { capacity: 2 })
    for (const user of await createUsers(database, 3)) await register(api, user, fixture.eventId)

    const first = await relayOutboxBatch(database.db, demoMailbox, relayOptions)
    await makeDue()
    const second = await relayOutboxBatch(database.db, demoMailbox, relayOptions)

    expect(first).toMatchObject({ claimed: 3, delivered: 3 })
    expect(second.claimed).toBe(0)
    expect(await deliveries()).toBe(3)

    const { rows } = await database.db.execute<{ subject: string }>(
      sql`SELECT subject FROM notification_deliveries ORDER BY subject`,
    )
    expect(rows.map((row) => row.subject)).toEqual([
      'You are #1 on the waitlist for Fixture event',
      'You are confirmed for Fixture event',
      'You are confirmed for Fixture event',
    ])
  })

  it('keeps registrations while the provider is down and delivers after it recovers', async () => {
    const fixture = await createEventFixture(database, { capacity: 5 })
    const results = await Promise.all(
      (await createUsers(database, 4)).map((user) => register(api, user, fixture.eventId)),
    )
    expect(results.every((result) => result.body.status === 'CONFIRMED')).toBe(true)

    const outage = await relayOutboxBatch(database.db, providerDown, relayOptions)
    expect(outage).toMatchObject({ claimed: 4, delivered: 0, retried: 4 })
    const { rows } = await database.db.execute<{ attempts: number; last_error: string }>(
      sql`SELECT attempts, last_error FROM outbox_events`,
    )
    expect(rows.every((row) => row.attempts === 1 && row.last_error.includes('ECONNREFUSED'))).toBe(
      true,
    )

    await makeDue()
    const recovery = await relayOutboxBatch(database.db, demoMailbox, relayOptions)
    expect(recovery).toMatchObject({ delivered: 4 })
    expect(await deliveries()).toBe(4)
  })

  it('moves an event to the dead letter state after the last attempt instead of dropping it', async () => {
    const fixture = await createEventFixture(database, { capacity: 1 })
    const [participant] = await createUsers(database, 1)
    await register(api, participant, fixture.eventId)

    for (let attempt = 0; attempt < relayOptions.maxAttempts; attempt += 1) {
      await makeDue()
      await relayOutboxBatch(database.db, providerDown, relayOptions)
    }

    expect(await outboxStats(database.db)).toEqual({ pending: 0, deadLettered: 1, published: 0 })
  })

  it('lets several relays drain the same table without delivering anything twice', async () => {
    const fixture = await createEventFixture(database, { capacity: 100 })
    await Promise.all(
      (await createUsers(database, 60)).map((user) => register(api, user, fixture.eventId)),
    )

    const reports = await Promise.all(
      Array.from({ length: 4 }, () =>
        relayOutboxBatch(database.db, demoMailbox, { ...relayOptions, batchSize: 20 }),
      ),
    )
    let remaining = await outboxStats(database.db)
    while (remaining.pending > 0) {
      await relayOutboxBatch(database.db, demoMailbox, relayOptions)
      remaining = await outboxStats(database.db)
    }

    const claimedInParallel = reports.reduce((sum, report) => sum + report.claimed, 0)
    expect(claimedInParallel).toBeLessThanOrEqual(60)
    expect(await deliveries()).toBe(60)
    expect(remaining).toEqual({ pending: 0, deadLettered: 0, published: 60 })
  })

  it('drains every due row across batches in a single scheduled run', async () => {
    const fixture = await createEventFixture(database, { capacity: 10 })
    for (const user of await createUsers(database, 7)) await register(api, user, fixture.eventId)

    const report = await drainOutbox(database.db, demoMailbox, {
      ...relayOptions,
      batchSize: 3,
      maxBatches: 10,
    })

    expect(report).toEqual({ claimed: 7, delivered: 7, retried: 0, deadLettered: 0, batches: 3 })
    expect(await outboxStats(database.db)).toEqual({ pending: 0, deadLettered: 0, published: 7 })
  })

  it('stops a scheduled run at its batch limit and leaves the rest pending', async () => {
    const fixture = await createEventFixture(database, { capacity: 10 })
    for (const user of await createUsers(database, 5)) await register(api, user, fixture.eventId)

    const report = await drainOutbox(database.db, demoMailbox, {
      ...relayOptions,
      batchSize: 2,
      maxBatches: 2,
    })

    expect(report).toMatchObject({ claimed: 4, delivered: 4, batches: 2 })
    expect(await outboxStats(database.db)).toEqual({ pending: 1, deadLettered: 0, published: 4 })
  })
})
