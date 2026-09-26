import { type DatabaseHandle, createDatabase, readIntegrity } from '@eventcore/db'
import { createIsolatedDatabase } from '@eventcore/db/testing'
import { sql } from 'drizzle-orm'
import { inject } from 'vitest'

export interface TestDatabase extends DatabaseHandle {
  readonly url: string
}

export const createTestDatabase = async (maxConnections = 40): Promise<TestDatabase> => {
  const url = await createIsolatedDatabase(inject('databaseAdminUrl'))
  return { ...createDatabase(url, { maxConnections, applicationName: 'eventcore-tests' }), url }
}

export interface EventFixture {
  readonly organizationId: string
  readonly organizationSlug: string
  readonly eventId: string
  readonly adminId: string
  readonly admin: TestUser
}

let sequence = 0
const unique = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(sequence += 1)}`

export const createUser = async (
  handle: DatabaseHandle,
  name = unique('user'),
): Promise<TestUser> => {
  const { rows } = await handle.db.execute<{ id: string }>(sql`
    INSERT INTO users (external_auth_id, display_name) VALUES (${`demo|test-${name}`}, ${name}) RETURNING id
  `)
  const [row] = rows
  if (!row) throw new Error('User fixture insert failed.')
  return { id: row.id, subject: `demo|test-${name}`, displayName: name }
}

export interface TestUser {
  readonly id: string
  readonly subject: string
  readonly displayName: string
}

type Tuple<T, N extends number, R extends T[] = []> = R['length'] extends N
  ? R
  : Tuple<T, N, [T, ...R]>

export const createUsers = async <N extends number>(
  handle: DatabaseHandle,
  count: N,
): Promise<Tuple<TestUser, N>> =>
  (await Promise.all(
    Array.from({ length: count }, (_, index) => createUser(handle, unique(`p${index}`))),
  )) as Tuple<TestUser, N>

export const createEventFixture = async (
  handle: DatabaseHandle,
  options: { capacity: number; waitlistEnabled?: boolean; status?: string },
): Promise<EventFixture> => {
  const admin = await createUser(handle, unique('admin'))
  const organizationSlug = unique('org')
  const { rows: orgRows } = await handle.db.execute<{ id: string }>(sql`
    INSERT INTO organizations (slug, name) VALUES (${organizationSlug}, ${organizationSlug}) RETURNING id
  `)
  const organizationId = orgRows[0]?.id
  if (!organizationId) throw new Error('Organization fixture insert failed.')
  await handle.db.execute(sql`
    INSERT INTO organization_members (organization_id, user_id, role) VALUES (${organizationId}, ${admin.id}, 'ADMIN')
  `)
  const { rows } = await handle.db.execute<{ id: string }>(sql`
    INSERT INTO events (organization_id, slug, name, venue, status, starts_at, enrollment_opens_at, enrollment_closes_at, waitlist_enabled)
    VALUES (${organizationId}, ${unique('event')}, 'Fixture event', 'Fixture hall', ${options.status ?? 'PUBLISHED'},
      now() + interval '30 days', now() - interval '1 day', now() + interval '29 days', ${options.waitlistEnabled ?? true})
    RETURNING id
  `)
  const eventId = rows[0]?.id
  if (!eventId) throw new Error('Event fixture insert failed.')
  await handle.db.execute(sql`
    INSERT INTO event_inventory (event_id, capacity) VALUES (${eventId}, ${options.capacity})
  `)
  return { organizationId, organizationSlug, eventId, adminId: admin.id, admin }
}

export const integrityOf = async (handle: DatabaseHandle, eventId: string) => {
  const [row] = await readIntegrity(handle.db, { eventIds: [eventId] })
  if (!row) throw new Error(`No inventory for ${eventId}.`)
  return row
}

export const addMember = async (
  handle: DatabaseHandle,
  organizationId: string,
  userId: string,
  role: 'ADMIN' | 'ORGANIZER',
) => {
  await handle.db.execute(sql`
    INSERT INTO organization_members (organization_id, user_id, role) VALUES (${organizationId}, ${userId}, ${role})
  `)
}
