import { type RegistrationOrigin, type RegistrationStatus } from '@eventcore/domain'
import { sql } from 'drizzle-orm'
import { type Executor } from '../client'

export interface RegistrationRecord {
  readonly id: string
  readonly eventId: string
  readonly userId: string
  readonly organizationId: string
  readonly status: RegistrationStatus
  readonly queuedAt: Date | null
}

interface RegistrationRow extends Record<string, unknown> {
  id: string
  event_id: string
  user_id: string
  organization_id: string
  status: RegistrationStatus
  queued_at: Date | null
}

const toRecord = (row: RegistrationRow): RegistrationRecord => ({
  id: row.id,
  eventId: row.event_id,
  userId: row.user_id,
  organizationId: row.organization_id,
  status: row.status,
  queuedAt: row.queued_at,
})

export const findRegistrationForUpdate = async (
  executor: Executor,
  eventId: string,
  userId: string,
): Promise<RegistrationRecord | null> => {
  const { rows } = await executor.execute<RegistrationRow>(sql`
    SELECT r.id, r.event_id, r.user_id, e.organization_id, r.status, r.queued_at
    FROM registrations r
    JOIN events e ON e.id = r.event_id
    WHERE r.event_id = ${eventId} AND r.user_id = ${userId}
    FOR UPDATE OF r
  `)
  return rows[0] ? toRecord(rows[0]) : null
}

export const findRegistrationById = async (
  executor: Executor,
  registrationId: string,
  options: { readonly forUpdate: boolean },
): Promise<RegistrationRecord | null> => {
  const lock = options.forUpdate ? sql`FOR UPDATE OF r` : sql``
  const { rows } = await executor.execute<RegistrationRow>(sql`
    SELECT r.id, r.event_id, r.user_id, e.organization_id, r.status, r.queued_at
    FROM registrations r
    JOIN events e ON e.id = r.event_id
    WHERE r.id = ${registrationId}
    ${lock}
  `)
  return rows[0] ? toRecord(rows[0]) : null
}

export const insertRegistration = async (
  executor: Executor,
  input: { readonly eventId: string; readonly userId: string; readonly status: RegistrationStatus },
): Promise<string> => {
  const { rows } = await executor.execute<{ id: string }>(sql`
    INSERT INTO registrations (event_id, user_id, status, queued_at)
    VALUES (
      ${input.eventId},
      ${input.userId},
      ${input.status},
      CASE WHEN ${input.status}::registration_status = 'WAITLISTED' THEN clock_timestamp() END
    )
    RETURNING id
  `)
  const [row] = rows
  if (!row) throw new Error('Registration insert returned no row.')
  return row.id
}

export const updateRegistrationStatus = async (
  executor: Executor,
  registrationId: string,
  status: RegistrationStatus,
): Promise<void> => {
  await executor.execute(sql`
    UPDATE registrations
    SET status = ${status},
        queued_at = CASE WHEN ${status}::registration_status = 'WAITLISTED' THEN clock_timestamp() END,
        updated_at = now()
    WHERE id = ${registrationId}
  `)
}

export const countWaitlisted = async (executor: Executor, eventId: string): Promise<number> => {
  const { rows } = await executor.execute<{ count: number }>(sql`
    SELECT count(*)::int AS count
    FROM registrations
    WHERE event_id = ${eventId} AND status = 'WAITLISTED'
  `)
  return rows[0]?.count ?? 0
}

export const lockHeadOfQueue = async (
  executor: Executor,
  eventId: string,
  limit: number,
): Promise<{ id: string; userId: string }[]> => {
  if (limit <= 0) return []
  const { rows } = await executor.execute<{ id: string; user_id: string }>(sql`
    SELECT id, user_id
    FROM registrations
    WHERE event_id = ${eventId} AND status = 'WAITLISTED'
    ORDER BY queued_at, id
    LIMIT ${limit}
    FOR UPDATE
  `)
  return rows.map((row) => ({ id: row.id, userId: row.user_id }))
}

export const waitlistPosition = async (
  executor: Executor,
  registrationId: string,
): Promise<number | null> => {
  const { rows } = await executor.execute<{ position: number | null }>(sql`
    SELECT (
      SELECT count(*)::int
      FROM registrations q
      WHERE q.event_id = r.event_id
        AND q.status = 'WAITLISTED'
        AND (q.queued_at, q.id) <= (r.queued_at, r.id)
    ) AS position
    FROM registrations r
    WHERE r.id = ${registrationId} AND r.status = 'WAITLISTED'
  `)
  return rows[0]?.position ?? null
}

export const appendRegistrationEvent = async (
  executor: Executor,
  input: {
    readonly registrationId: string
    readonly from: RegistrationOrigin
    readonly to: RegistrationStatus
    readonly actorId: string | null
    readonly reason: string
    readonly correlationId: string
  },
): Promise<void> => {
  await executor.execute(sql`
    INSERT INTO registration_events
      (registration_id, from_status, to_status, actor_id, reason, correlation_id, occurred_at)
    VALUES (
      ${input.registrationId},
      ${input.from},
      ${input.to},
      ${input.actorId},
      ${input.reason},
      ${input.correlationId},
      clock_timestamp()
    )
  `)
}
