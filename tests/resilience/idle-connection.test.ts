import { type DatabaseHandle, createDatabase } from '@eventcore/db'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { type TestDatabase, createTestDatabase } from '../support/database'

describe('idle database connections', () => {
  let database: TestDatabase
  let observed: DatabaseHandle
  const onIdleError = vi.fn()

  beforeAll(async () => {
    database = await createTestDatabase(4)
    observed = createDatabase(database.url, { maxConnections: 1, onIdleError })
  })

  afterAll(async () => {
    await observed.close()
    await database.close()
  })

  it('survives the server closing an idle connection and reconnects on the next query', async () => {
    const { rows } = await observed.db.execute<{ pid: number }>(sql`SELECT pg_backend_pid() AS pid`)
    const pid = rows[0]?.pid

    await database.db.execute(sql`SELECT pg_terminate_backend(${pid}::int)`)
    await vi.waitFor(() => expect(onIdleError).toHaveBeenCalledOnce())

    expect(onIdleError.mock.calls[0]?.[0]).toMatchObject({ code: '57P01' })
    const after = await observed.db.execute<{ pid: number }>(sql`SELECT pg_backend_pid() AS pid`)
    expect(after.rows[0]?.pid).not.toBe(pid)
  })
})
