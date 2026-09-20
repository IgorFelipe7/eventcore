import { DEMO_PERSONAS } from '@eventcore/contracts'
import { type EventStatus } from '@eventcore/domain'
import { sql } from 'drizzle-orm'
import { type Database, type Executor } from './client'
import { createOrganization, ensureUser } from './repositories/identity'
import { insertEvent } from './repositories/events'
import { insertInventory } from './repositories/inventory'

const DEMO_ORGANIZATIONS = [
  { slug: 'northwind-assembly', name: 'Northwind Assembly' },
  { slug: 'harbor-guild', name: 'Harbor Guild' },
] as const

interface DemoEvent {
  readonly organizationSlug: (typeof DEMO_ORGANIZATIONS)[number]['slug']
  readonly slug: string
  readonly name: string
  readonly description: string
  readonly venue: string
  readonly status: EventStatus
  readonly startsInDays: number
  readonly capacity: number
  readonly confirmedGuests: number
  readonly waitlistedGuests: number
  readonly waitlistEnabled: boolean
}

const DEMO_EVENTS: readonly DemoEvent[] = [
  {
    organizationSlug: 'northwind-assembly',
    slug: 'the-last-seat',
    name: 'The Last Seat: Concurrency in Practice',
    description:
      'A one-seat event built for the demo. Two people can try to take the seat at the same moment; exactly one will be confirmed and the other will be first in line.',
    venue: 'Room 1, Northwind Hall',
    status: 'PUBLISHED',
    startsInDays: 21,
    capacity: 1,
    confirmedGuests: 0,
    waitlistedGuests: 0,
    waitlistEnabled: true,
  },
  {
    organizationSlug: 'northwind-assembly',
    slug: 'row-locks-workshop',
    name: 'Row Locks, Read Committed and You',
    description:
      'A hands-on session on SELECT ... FOR UPDATE, lock ordering and why the inventory row is the serialization point.',
    venue: 'Lab 3, Northwind Hall',
    status: 'PUBLISHED',
    startsInDays: 9,
    capacity: 24,
    confirmedGuests: 21,
    waitlistedGuests: 0,
    waitlistEnabled: true,
  },
  {
    organizationSlug: 'northwind-assembly',
    slug: 'idempotency-office-hours',
    name: 'Idempotency Office Hours',
    description:
      'Bring the retry bug you cannot reproduce. Small group, no waitlist: when it is full, it is full.',
    venue: 'Studio B, Northwind Hall',
    status: 'PUBLISHED',
    startsInDays: 14,
    capacity: 12,
    confirmedGuests: 12,
    waitlistedGuests: 0,
    waitlistEnabled: false,
  },
  {
    organizationSlug: 'northwind-assembly',
    slug: 'incident-review-night',
    name: 'Incident Review Night',
    description:
      'Blameless reviews of real outages. Enrollment has closed; existing seats are kept.',
    venue: 'Auditorium, Northwind Hall',
    status: 'CLOSED',
    startsInDays: 4,
    capacity: 80,
    confirmedGuests: 64,
    waitlistedGuests: 0,
    waitlistEnabled: true,
  },
  {
    organizationSlug: 'northwind-assembly',
    slug: 'schema-migrations-clinic',
    name: 'Schema Migrations Clinic',
    description: 'Expand and contract, without downtime. Still a draft.',
    venue: 'Room 2, Northwind Hall',
    status: 'DRAFT',
    startsInDays: 35,
    capacity: 30,
    confirmedGuests: 0,
    waitlistedGuests: 0,
    waitlistEnabled: true,
  },
  {
    organizationSlug: 'harbor-guild',
    slug: 'outbox-patterns-meetup',
    name: 'Outbox Patterns Meetup',
    description:
      'At-least-once delivery, deduplication keys and dead letters. Sold out, with a live waitlist.',
    venue: 'Pier 7 Warehouse',
    status: 'PUBLISHED',
    startsInDays: 12,
    capacity: 40,
    confirmedGuests: 40,
    waitlistedGuests: 6,
    waitlistEnabled: true,
  },
  {
    organizationSlug: 'harbor-guild',
    slug: 'tenant-isolation-teardown',
    name: 'Tenant Isolation Teardown',
    description: 'We try to read another organization’s data and document every way it fails.',
    venue: 'Pier 7 Warehouse',
    status: 'PUBLISHED',
    startsInDays: 27,
    capacity: 60,
    confirmedGuests: 18,
    waitlistedGuests: 0,
    waitlistEnabled: true,
  },
]

const DAY_MS = 86_400_000

const resetDemoData = async (executor: Executor) => {
  await executor.execute(sql`
    TRUNCATE notification_deliveries, outbox_events, audit_log, idempotency_requests,
      registration_events, registrations, event_inventory, events,
      organization_members, organizations, users
    RESTART IDENTITY CASCADE
  `)
}

const seedGuests = async (
  executor: Executor,
  eventId: string,
  prefix: string,
  confirmed: number,
  waitlisted: number,
) => {
  for (let index = 0; index < confirmed + waitlisted; index += 1) {
    const guest = await ensureUser(
      executor,
      `demo|guest-${prefix}-${index + 1}`,
      `Guest ${String(index + 1).padStart(3, '0')}`,
    )
    const status = index < confirmed ? 'CONFIRMED' : 'WAITLISTED'
    const { rows } = await executor.execute<{ id: string }>(sql`
      INSERT INTO registrations (event_id, user_id, status, queued_at)
      VALUES (${eventId}, ${guest.id}, ${status},
        CASE WHEN ${status}::registration_status = 'WAITLISTED' THEN clock_timestamp() END)
      RETURNING id
    `)
    const registrationId = rows[0]?.id
    if (!registrationId) throw new Error('Seed registration insert failed.')
    await executor.execute(sql`
      INSERT INTO registration_events (registration_id, from_status, to_status, reason, correlation_id)
      VALUES (${registrationId}, NULL, ${status}, 'seed', 'seed')
    `)
  }
  await executor.execute(sql`
    UPDATE event_inventory SET confirmed_count = ${confirmed} WHERE event_id = ${eventId}
  `)
}

export interface SeedSummary {
  readonly organizations: number
  readonly personas: number
  readonly events: number
}

export const seedDemo = async (db: Database, now = new Date()): Promise<SeedSummary> =>
  db.transaction(async (tx) => {
    await resetDemoData(tx)

    const users = new Map<string, string>()
    for (const persona of DEMO_PERSONAS) {
      const user = await ensureUser(tx, persona.externalAuthId, persona.displayName)
      users.set(persona.externalAuthId, user.id)
    }

    const organizations = new Map<string, string>()
    for (const organization of DEMO_ORGANIZATIONS) {
      const admin = DEMO_PERSONAS.find((persona) =>
        persona.memberships.some(
          (membership) =>
            membership.organizationSlug === organization.slug && membership.role === 'ADMIN',
        ),
      )
      const adminId = admin && users.get(admin.externalAuthId)
      if (!adminId) throw new Error(`No admin persona for ${organization.slug}.`)
      const created = await createOrganization(tx, { ...organization, adminUserId: adminId })
      if (!created) throw new Error(`Organization ${organization.slug} already exists.`)
      organizations.set(organization.slug, created.id)
    }

    for (const persona of DEMO_PERSONAS) {
      for (const membership of persona.memberships) {
        if (membership.role === 'ADMIN') continue
        await tx.execute(sql`
          INSERT INTO organization_members (organization_id, user_id, role)
          VALUES (${organizations.get(membership.organizationSlug)}, ${users.get(persona.externalAuthId)}, ${membership.role})
        `)
      }
    }

    for (const event of DEMO_EVENTS) {
      const organizationId = organizations.get(event.organizationSlug)
      if (!organizationId) throw new Error(`Unknown organization ${event.organizationSlug}.`)
      const startsAt = new Date(now.getTime() + event.startsInDays * DAY_MS)
      const eventId = await insertEvent(tx, {
        organizationId,
        slug: event.slug,
        name: event.name,
        description: event.description,
        venue: event.venue,
        status: event.status,
        startsAt,
        enrollmentOpensAt: new Date(now.getTime() - 7 * DAY_MS),
        enrollmentClosesAt: new Date(startsAt.getTime() - DAY_MS),
        waitlistEnabled: event.waitlistEnabled,
      })
      if (!eventId) throw new Error(`Event ${event.slug} already exists.`)
      await insertInventory(tx, eventId, event.capacity)
      await seedGuests(tx, eventId, event.slug, event.confirmedGuests, event.waitlistedGuests)
    }

    return {
      organizations: DEMO_ORGANIZATIONS.length,
      personas: DEMO_PERSONAS.length,
      events: DEMO_EVENTS.length,
    }
  })
