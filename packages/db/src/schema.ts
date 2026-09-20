import { EVENT_STATUSES, ORGANIZATION_ROLES, REGISTRATION_STATUSES } from '@eventcore/domain'
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

const id = () =>
  uuid('id')
    .primaryKey()
    .default(sql`uuidv7()`)
const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })
const createdAt = () => timestamptz('created_at').notNull().defaultNow()

export const eventStatus = pgEnum('event_status', EVENT_STATUSES)
export const registrationStatus = pgEnum('registration_status', REGISTRATION_STATUSES)
export const organizationRole = pgEnum('organization_role', ORGANIZATION_ROLES)

export const users = pgTable('users', {
  id: id(),
  externalAuthId: text('external_auth_id').notNull().unique(),
  displayName: text('display_name').notNull(),
  createdAt: createdAt(),
})

export const organizations = pgTable('organizations', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdAt: createdAt(),
})

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: id(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: organizationRole('role').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique('organization_members_organization_user_key').on(table.organizationId, table.userId),
    index('organization_members_user_idx').on(table.userId),
  ],
)

export const events = pgTable(
  'events',
  {
    id: id(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    venue: text('venue').notNull(),
    status: eventStatus('status').notNull().default('DRAFT'),
    startsAt: timestamptz('starts_at').notNull(),
    enrollmentOpensAt: timestamptz('enrollment_opens_at').notNull(),
    enrollmentClosesAt: timestamptz('enrollment_closes_at').notNull(),
    waitlistEnabled: boolean('waitlist_enabled').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [
    unique('events_organization_slug_key').on(table.organizationId, table.slug),
    index('events_organization_starts_at_idx').on(table.organizationId, table.startsAt),
    index('events_public_listing_idx').on(table.status, table.startsAt, table.id),
    check(
      'events_enrollment_window_check',
      sql`${table.enrollmentOpensAt} < ${table.enrollmentClosesAt} AND ${table.enrollmentClosesAt} <= ${table.startsAt}`,
    ),
  ],
)

export const eventInventory = pgTable(
  'event_inventory',
  {
    eventId: uuid('event_id')
      .primaryKey()
      .references(() => events.id),
    capacity: integer('capacity').notNull(),
    confirmedCount: integer('confirmed_count').notNull().default(0),
    version: integer('version').notNull().default(0),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [
    check('event_inventory_capacity_check', sql`${table.capacity} >= 0`),
    check('event_inventory_confirmed_count_check', sql`${table.confirmedCount} >= 0`),
    check(
      'event_inventory_within_capacity_check',
      sql`${table.confirmedCount} <= ${table.capacity}`,
    ),
  ],
)

export const registrations = pgTable(
  'registrations',
  {
    id: id(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    status: registrationStatus('status').notNull(),
    queuedAt: timestamptz('queued_at'),
    createdAt: createdAt(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (table) => [
    unique('registrations_event_user_key').on(table.eventId, table.userId),
    index('registrations_queue_idx').on(table.eventId, table.status, table.queuedAt, table.id),
    index('registrations_user_idx').on(table.userId, table.updatedAt),
    check(
      'registrations_queued_at_check',
      sql`(${table.status} = 'WAITLISTED') = (${table.queuedAt} IS NOT NULL)`,
    ),
  ],
)

export const registrationEvents = pgTable(
  'registration_events',
  {
    id: id(),
    registrationId: uuid('registration_id')
      .notNull()
      .references(() => registrations.id),
    fromStatus: registrationStatus('from_status'),
    toStatus: registrationStatus('to_status').notNull(),
    actorId: uuid('actor_id').references(() => users.id),
    reason: text('reason').notNull(),
    correlationId: text('correlation_id').notNull(),
    occurredAt: timestamptz('occurred_at').notNull().defaultNow(),
  },
  (table) => [
    index('registration_events_registration_idx').on(table.registrationId, table.occurredAt),
  ],
)

export const idempotencyRequests = pgTable(
  'idempotency_requests',
  {
    id: id(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    action: text('action').notNull(),
    scopeId: uuid('scope_id').notNull(),
    key: text('key').notNull(),
    requestHash: text('request_hash').notNull(),
    httpStatus: integer('http_status'),
    responseBody: jsonb('response_body'),
    createdAt: createdAt(),
    expiresAt: timestamptz('expires_at').notNull(),
  },
  (table) => [
    unique('idempotency_requests_scope_key').on(
      table.actorId,
      table.action,
      table.scopeId,
      table.key,
    ),
    index('idempotency_requests_expires_at_idx').on(table.expiresAt),
  ],
)

export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    actorId: uuid('actor_id').references(() => users.id),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id').notNull(),
    safeBefore: jsonb('safe_before'),
    safeAfter: jsonb('safe_after'),
    requestId: text('request_id').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('audit_log_organization_created_idx').on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
)

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: id(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    eventType: text('event_type').notNull(),
    schemaVersion: integer('schema_version').notNull().default(1),
    payload: jsonb('payload').notNull(),
    createdAt: createdAt(),
    publishedAt: timestamptz('published_at'),
    deadLetteredAt: timestamptz('dead_lettered_at'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamptz('next_attempt_at').notNull().defaultNow(),
    lastError: text('last_error'),
  },
  (table) => [
    index('outbox_events_pending_idx')
      .on(table.nextAttemptAt, table.createdAt)
      .where(sql`${table.publishedAt} IS NULL AND ${table.deadLetteredAt} IS NULL`),
  ],
)

export const notificationDeliveries = pgTable('notification_deliveries', {
  id: id(),
  outboxEventId: uuid('outbox_event_id')
    .notNull()
    .unique()
    .references(() => outboxEvents.id),
  recipientUserId: uuid('recipient_user_id')
    .notNull()
    .references(() => users.id),
  template: text('template').notNull(),
  subject: text('subject').notNull(),
  deliveredAt: timestamptz('delivered_at').notNull().defaultNow(),
})
