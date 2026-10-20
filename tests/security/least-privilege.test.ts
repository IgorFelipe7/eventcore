import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type App } from '@eventcore/api'
import { type DatabaseHandle, createDatabase, pgErrorCode } from '@eventcore/db'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApi } from '../support/api'
import {
  type TestDatabase,
  createEventFixture,
  createTestDatabase,
  createUsers,
} from '../support/database'
import { register } from '../support/requests'

const ROLE = 'eventcore_app'
const PASSWORD = 'least-privilege-test-password'
const GRANTS = readFileSync(
  fileURLToPath(new URL('../../infra/postgres/app-role.sql', import.meta.url)),
  'utf8',
)
const INSUFFICIENT_PRIVILEGE = '42501'

const rejectionCode = async (statement: Promise<unknown>) => {
  try {
    await statement
    return 'succeeded'
  } catch (error) {
    return pgErrorCode(error)
  }
}

describe('least-privilege application role', () => {
  let owner: TestDatabase
  let application: DatabaseHandle
  let api: App

  beforeAll(async () => {
    owner = await createTestDatabase(4)
    await owner.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${ROLE}') THEN
          CREATE ROLE ${ROLE} LOGIN PASSWORD '${PASSWORD}';
        ELSE
          ALTER ROLE ${ROLE} LOGIN PASSWORD '${PASSWORD}';
        END IF;
      END
      $$
    `)
    await owner.pool.query(GRANTS)

    const url = new URL(owner.url)
    url.username = ROLE
    url.password = PASSWORD
    application = createDatabase(url.toString(), { maxConnections: 4 })
    api = await createTestApi({ db: application.db, url: url.toString() })
  })

  afterAll(async () => {
    await api.close()
    await application.close()
    await owner.close()
  })

  it('serves a registration end to end with data privileges only', async () => {
    const fixture = await createEventFixture(owner, { capacity: 1 })
    const [participant] = await createUsers(owner, 1)

    const response = await register(api, participant, fixture.eventId)

    expect(response.status).toBe(201)
    expect(response.body.status).toBe('CONFIRMED')
    const { rows } = await owner.db.execute<{ count: number }>(
      sql`SELECT count(*)::int AS count FROM outbox_events`,
    )
    expect(rows[0]?.count).toBeGreaterThan(0)
  })

  it('cannot change the schema or wipe tables', async () => {
    expect(await rejectionCode(application.db.execute(sql`CREATE TABLE intruder (id int)`))).toBe(
      INSUFFICIENT_PRIVILEGE,
    )
    expect(await rejectionCode(application.db.execute(sql`DROP TABLE registrations`))).toBe(
      INSUFFICIENT_PRIVILEGE,
    )
    expect(await rejectionCode(application.db.execute(sql`TRUNCATE audit_log`))).toBe(
      INSUFFICIENT_PRIVILEGE,
    )
    expect(
      await rejectionCode(
        application.db.execute(sql`ALTER TABLE registrations DROP CONSTRAINT IF EXISTS anything`),
      ),
    ).toBe(INSUFFICIENT_PRIVILEGE)
  })
})
