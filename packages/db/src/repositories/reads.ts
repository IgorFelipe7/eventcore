import { type RegistrationOrigin, type RegistrationStatus } from '@eventcore/domain'
import { sql } from 'drizzle-orm'
import { type Executor } from '../client'
import { type PgTimestamp, asDate } from '../values'

export interface ParticipantRegistration {
  readonly registrationId: string
  readonly status: RegistrationStatus
  readonly waitlistPosition: number | null
  readonly updatedAt: Date
  readonly event: {
    readonly id: string
    readonly slug: string
    readonly name: string
    readonly startsAt: Date
    readonly venue: string
    readonly organizationSlug: string
    readonly organizationName: string
  }
  readonly history: {
    readonly from: RegistrationOrigin
    readonly to: RegistrationStatus
    readonly reason: string
    readonly occurredAt: Date
  }[]
}

const POSITION = sql`
  CASE WHEN r.status = 'WAITLISTED' THEN (
    SELECT count(*)::int FROM registrations q
    WHERE q.event_id = r.event_id AND q.status = 'WAITLISTED'
      AND (q.queued_at, q.id) <= (r.queued_at, r.id)
  ) END
`

export const listParticipantRegistrations = async (
  executor: Executor,
  userId: string,
): Promise<ParticipantRegistration[]> => {
  const { rows } = await executor.execute<{
    id: string
    status: RegistrationStatus
    position: number | null
    updated_at: PgTimestamp
    event_id: string
    event_slug: string
    event_name: string
    starts_at: PgTimestamp
    venue: string
    organization_slug: string
    organization_name: string
    history: {
      from: RegistrationOrigin
      to: RegistrationStatus
      reason: string
      occurredAt: string
    }[]
  }>(sql`
    SELECT
      r.id, r.status, ${POSITION} AS position, r.updated_at,
      e.id AS event_id, e.slug AS event_slug, e.name AS event_name, e.starts_at, e.venue,
      o.slug AS organization_slug, o.name AS organization_name,
      COALESCE((
        SELECT json_agg(json_build_object(
          'from', h.from_status, 'to', h.to_status, 'reason', h.reason, 'occurredAt', h.occurred_at
        ) ORDER BY h.occurred_at, h.id)
        FROM registration_events h WHERE h.registration_id = r.id
      ), '[]'::json) AS history
    FROM registrations r
    JOIN events e ON e.id = r.event_id
    JOIN organizations o ON o.id = e.organization_id
    WHERE r.user_id = ${userId}
    ORDER BY r.updated_at DESC, r.id DESC
  `)
  return rows.map((row) => ({
    registrationId: row.id,
    status: row.status,
    waitlistPosition: row.position,
    updatedAt: asDate(row.updated_at),
    event: {
      id: row.event_id,
      slug: row.event_slug,
      name: row.event_name,
      startsAt: asDate(row.starts_at),
      venue: row.venue,
      organizationSlug: row.organization_slug,
      organizationName: row.organization_name,
    },
    history: row.history.map((entry) => ({ ...entry, occurredAt: asDate(entry.occurredAt) })),
  }))
}

export interface EventRegistrationRecord {
  readonly registrationId: string
  readonly participantId: string
  readonly participantName: string
  readonly status: RegistrationStatus
  readonly waitlistPosition: number | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

export const listEventRegistrations = async (
  executor: Executor,
  eventId: string,
  page: {
    readonly status: RegistrationStatus | undefined
    readonly limit: number
    readonly after: { readonly createdAt: Date; readonly id: string } | null
  },
): Promise<EventRegistrationRecord[]> => {
  const status = page.status ? sql`AND r.status = ${page.status}` : sql``
  const after = page.after
    ? sql`AND (r.created_at, r.id) > (${page.after.createdAt.toISOString()}::timestamptz, ${page.after.id}::uuid)`
    : sql``
  const { rows } = await executor.execute<{
    id: string
    user_id: string
    display_name: string
    status: RegistrationStatus
    position: number | null
    created_at: PgTimestamp
    updated_at: PgTimestamp
  }>(sql`
    SELECT r.id, r.user_id, u.display_name, r.status, ${POSITION} AS position, r.created_at, r.updated_at
    FROM registrations r
    JOIN users u ON u.id = r.user_id
    WHERE r.event_id = ${eventId} ${status} ${after}
    ORDER BY r.created_at, r.id
    LIMIT ${page.limit}
  `)
  return rows.map((row) => ({
    registrationId: row.id,
    participantId: row.user_id,
    participantName: row.display_name,
    status: row.status,
    waitlistPosition: row.position,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  }))
}

export interface IntegrityRow {
  readonly eventId: string
  readonly capacity: number
  readonly confirmedCount: number
  readonly confirmedRows: number
  readonly waitlistedRows: number
}

export const readIntegrity = async (
  executor: Executor,
  scope: { readonly organizationId: string } | { readonly eventIds: readonly string[] } | 'all',
): Promise<IntegrityRow[]> => {
  const where =
    scope === 'all'
      ? sql`TRUE`
      : 'organizationId' in scope
        ? sql`e.organization_id = ${scope.organizationId}`
        : sql`e.id = ANY(${`{${scope.eventIds.join(',')}}`}::uuid[])`
  const { rows } = await executor.execute<{
    event_id: string
    capacity: number
    confirmed_count: number
    confirmed_rows: number
    waitlisted_rows: number
  }>(sql`
    SELECT
      i.event_id, i.capacity, i.confirmed_count,
      count(r.id) FILTER (WHERE r.status = 'CONFIRMED')::int AS confirmed_rows,
      count(r.id) FILTER (WHERE r.status = 'WAITLISTED')::int AS waitlisted_rows
    FROM event_inventory i
    JOIN events e ON e.id = i.event_id
    LEFT JOIN registrations r ON r.event_id = i.event_id
    WHERE ${where}
    GROUP BY i.event_id, i.capacity, i.confirmed_count
    ORDER BY i.event_id
  `)
  return rows.map((row) => ({
    eventId: row.event_id,
    capacity: row.capacity,
    confirmedCount: row.confirmed_count,
    confirmedRows: row.confirmed_rows,
    waitlistedRows: row.waitlisted_rows,
  }))
}
