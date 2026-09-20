import { type EventStatus } from '@eventcore/domain'
import { type SQL, sql } from 'drizzle-orm'
import { type Executor } from '../client'

export interface EventView {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly description: string
  readonly venue: string
  readonly status: EventStatus
  readonly startsAt: Date
  readonly enrollmentOpensAt: Date
  readonly enrollmentClosesAt: Date
  readonly waitlistEnabled: boolean
  readonly createdAt: Date
  readonly organization: { readonly id: string; readonly slug: string; readonly name: string }
  readonly capacity: number
  readonly confirmedCount: number
  readonly waitlisted: number
  readonly observedAt: Date
}

interface EventViewRow extends Record<string, unknown> {
  id: string
  slug: string
  name: string
  description: string
  venue: string
  status: EventStatus
  starts_at: Date
  enrollment_opens_at: Date
  enrollment_closes_at: Date
  waitlist_enabled: boolean
  created_at: Date
  organization_id: string
  organization_slug: string
  organization_name: string
  capacity: number
  confirmed_count: number
  waitlisted: number
  observed_at: Date
}

const toView = (row: EventViewRow): EventView => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description,
  venue: row.venue,
  status: row.status,
  startsAt: row.starts_at,
  enrollmentOpensAt: row.enrollment_opens_at,
  enrollmentClosesAt: row.enrollment_closes_at,
  waitlistEnabled: row.waitlist_enabled,
  createdAt: row.created_at,
  organization: {
    id: row.organization_id,
    slug: row.organization_slug,
    name: row.organization_name,
  },
  capacity: row.capacity,
  confirmedCount: row.confirmed_count,
  waitlisted: row.waitlisted,
  observedAt: row.observed_at,
})

const selectEventViews = (where: SQL, tail: SQL = sql``) => sql`
  SELECT
    e.id, e.slug, e.name, e.description, e.venue, e.status, e.starts_at,
    e.enrollment_opens_at, e.enrollment_closes_at, e.waitlist_enabled, e.created_at,
    o.id AS organization_id, o.slug AS organization_slug, o.name AS organization_name,
    i.capacity, i.confirmed_count,
    (
      SELECT count(*)::int FROM registrations r
      WHERE r.event_id = e.id AND r.status = 'WAITLISTED'
    ) AS waitlisted,
    clock_timestamp() AS observed_at
  FROM events e
  JOIN organizations o ON o.id = e.organization_id
  JOIN event_inventory i ON i.event_id = e.id
  WHERE ${where}
  ${tail}
`

const PUBLIC_STATUSES = sql`e.status IN ('PUBLISHED', 'CLOSED', 'CANCELLED')`

export const listPublicEvents = async (
  executor: Executor,
  page: {
    readonly status: 'PUBLISHED' | 'CLOSED' | undefined
    readonly limit: number
    readonly after: { readonly startsAt: Date; readonly id: string } | null
  },
): Promise<EventView[]> => {
  const status = page.status
    ? sql`e.status = ${page.status}`
    : sql`e.status IN ('PUBLISHED', 'CLOSED')`
  const after = page.after
    ? sql`AND (e.starts_at, e.id) > (${page.after.startsAt.toISOString()}::timestamptz, ${page.after.id}::uuid)`
    : sql``
  const { rows } = await executor.execute<EventViewRow>(
    selectEventViews(sql`${status} ${after}`, sql`ORDER BY e.starts_at, e.id LIMIT ${page.limit}`),
  )
  return rows.map(toView)
}

export const findPublicEventById = async (
  executor: Executor,
  eventId: string,
): Promise<EventView | null> => {
  const { rows } = await executor.execute<EventViewRow>(
    selectEventViews(sql`e.id = ${eventId} AND ${PUBLIC_STATUSES}`),
  )
  return rows[0] ? toView(rows[0]) : null
}

export const findPublicEventBySlug = async (
  executor: Executor,
  organizationSlug: string,
  eventSlug: string,
): Promise<EventView | null> => {
  const { rows } = await executor.execute<EventViewRow>(
    selectEventViews(
      sql`o.slug = ${organizationSlug} AND e.slug = ${eventSlug} AND ${PUBLIC_STATUSES}`,
    ),
  )
  return rows[0] ? toView(rows[0]) : null
}

export const listOrganizationEvents = async (
  executor: Executor,
  organizationId: string,
): Promise<EventView[]> => {
  const { rows } = await executor.execute<EventViewRow>(
    selectEventViews(sql`e.organization_id = ${organizationId}`, sql`ORDER BY e.starts_at, e.id`),
  )
  return rows.map(toView)
}

export const findOrganizationEvent = async (
  executor: Executor,
  organizationId: string,
  eventId: string,
): Promise<EventView | null> => {
  const { rows } = await executor.execute<EventViewRow>(
    selectEventViews(sql`e.organization_id = ${organizationId} AND e.id = ${eventId}`),
  )
  return rows[0] ? toView(rows[0]) : null
}

export interface EventRules {
  readonly id: string
  readonly organizationId: string
  readonly status: EventStatus
  readonly startsAt: Date
  readonly enrollmentOpensAt: Date
  readonly enrollmentClosesAt: Date
  readonly waitlistEnabled: boolean
}

export const readEventRules = async (
  executor: Executor,
  eventId: string,
): Promise<EventRules | null> => {
  const { rows } = await executor.execute<{
    id: string
    organization_id: string
    status: EventStatus
    starts_at: Date
    enrollment_opens_at: Date
    enrollment_closes_at: Date
    waitlist_enabled: boolean
  }>(sql`
    SELECT id, organization_id, status, starts_at, enrollment_opens_at, enrollment_closes_at, waitlist_enabled
    FROM events
    WHERE id = ${eventId}
  `)
  const [row] = rows
  return row
    ? {
        id: row.id,
        organizationId: row.organization_id,
        status: row.status,
        startsAt: row.starts_at,
        enrollmentOpensAt: row.enrollment_opens_at,
        enrollmentClosesAt: row.enrollment_closes_at,
        waitlistEnabled: row.waitlist_enabled,
      }
    : null
}

export interface NewEvent {
  readonly organizationId: string
  readonly slug: string
  readonly name: string
  readonly description: string
  readonly venue: string
  readonly startsAt: Date
  readonly enrollmentOpensAt: Date
  readonly enrollmentClosesAt: Date
  readonly waitlistEnabled: boolean
  readonly status?: EventStatus
}

export const insertEvent = async (executor: Executor, input: NewEvent): Promise<string | null> => {
  const { rows } = await executor.execute<{ id: string }>(sql`
    INSERT INTO events
      (organization_id, slug, name, description, venue, status, starts_at,
       enrollment_opens_at, enrollment_closes_at, waitlist_enabled)
    VALUES (
      ${input.organizationId}, ${input.slug}, ${input.name}, ${input.description}, ${input.venue},
      ${input.status ?? 'DRAFT'}, ${input.startsAt.toISOString()}::timestamptz,
      ${input.enrollmentOpensAt.toISOString()}::timestamptz,
      ${input.enrollmentClosesAt.toISOString()}::timestamptz, ${input.waitlistEnabled}
    )
    ON CONFLICT ON CONSTRAINT events_organization_slug_key DO NOTHING
    RETURNING id
  `)
  return rows[0]?.id ?? null
}

export interface EventPatch {
  readonly name?: string | undefined
  readonly description?: string | undefined
  readonly venue?: string | undefined
  readonly startsAt?: Date | undefined
  readonly enrollmentOpensAt?: Date | undefined
  readonly enrollmentClosesAt?: Date | undefined
  readonly waitlistEnabled?: boolean | undefined
}

export const updateEventFields = async (
  executor: Executor,
  eventId: string,
  patch: EventPatch,
): Promise<void> => {
  const iso = (value: Date | undefined) => value?.toISOString() ?? null
  await executor.execute(sql`
    UPDATE events SET
      name = COALESCE(${patch.name ?? null}, name),
      description = COALESCE(${patch.description ?? null}, description),
      venue = COALESCE(${patch.venue ?? null}, venue),
      starts_at = COALESCE(${iso(patch.startsAt)}::timestamptz, starts_at),
      enrollment_opens_at = COALESCE(${iso(patch.enrollmentOpensAt)}::timestamptz, enrollment_opens_at),
      enrollment_closes_at = COALESCE(${iso(patch.enrollmentClosesAt)}::timestamptz, enrollment_closes_at),
      waitlist_enabled = COALESCE(${patch.waitlistEnabled ?? null}::boolean, waitlist_enabled),
      updated_at = now()
    WHERE id = ${eventId}
  `)
}

export const setEventStatus = async (
  executor: Executor,
  eventId: string,
  status: EventStatus,
): Promise<void> => {
  await executor.execute(sql`
    UPDATE events SET status = ${status}, updated_at = now() WHERE id = ${eventId}
  `)
}
