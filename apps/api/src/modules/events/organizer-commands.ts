import { type CreateEventBody, type UpdateEventBody } from '@eventcore/contracts'
import {
  type Database,
  type EventPatch,
  type Transaction,
  findOrganizationEvent,
  insertEvent,
  insertInventory,
  lockInventory,
  readEventRules,
  setEventStatus,
  updateEventFields,
} from '@eventcore/db'
import {
  type EventStatus,
  type OrganizationRole,
  assertEnrollmentSchedule,
  assertEventTransition,
  assertValidCapacity,
} from '@eventcore/domain'
import { type Actor } from '../../auth/authenticate'
import { ProblemError } from '../../http/problem'
import { presentOrganizerEvent } from './presenters'

export interface OrganizerContext {
  readonly actor: Actor
  readonly organizationId: string
  readonly role: OrganizationRole
  readonly requestId: string
}

const readOrganizerEvent = async (db: Database, organizationId: string, eventId: string) => {
  const event = await findOrganizationEvent(db, organizationId, eventId)
  if (!event) throw new ProblemError('NOT_FOUND', 'No event with that id in this organization.')
  return presentOrganizerEvent(event)
}

export const createEvent = async (db: Database, context: OrganizerContext, body: CreateEventBody) => {
  const schedule = {
    startsAt: new Date(body.startsAt),
    enrollmentOpensAt: new Date(body.enrollmentOpensAt),
    enrollmentClosesAt: new Date(body.enrollmentClosesAt),
  }
  assertEnrollmentSchedule(schedule)
  assertValidCapacity(body.capacity)

  const eventId = await db.transaction(async (tx) => {
    const id = await insertEvent(tx, {
      organizationId: context.organizationId,
      slug: body.slug,
      name: body.name,
      description: body.description,
      venue: body.venue,
      waitlistEnabled: body.waitlistEnabled,
      ...schedule,
    })
    if (!id) throw new ProblemError('SLUG_TAKEN', `The slug "${body.slug}" is already used here.`)
    await insertInventory(tx, id, body.capacity)
    return id
  })

  return readOrganizerEvent(db, context.organizationId, eventId)
}

const lockOrganizationEvent = async (
  tx: Transaction,
  organizationId: string,
  eventId: string,
) => {
  const inventory = await lockInventory(tx, eventId)
  const rules = inventory ? await readEventRules(tx, eventId) : null
  if (!inventory || !rules || rules.organizationId !== organizationId) {
    throw new ProblemError('NOT_FOUND', 'No event with that id in this organization.')
  }
  return { inventory, rules }
}

export const updateEvent = async (
  db: Database,
  context: OrganizerContext,
  eventId: string,
  body: UpdateEventBody,
) => {
  await db.transaction(async (tx) => {
    const { rules } = await lockOrganizationEvent(tx, context.organizationId, eventId)
    const patch: EventPatch = {
      name: body.name,
      description: body.description,
      venue: body.venue,
      waitlistEnabled: body.waitlistEnabled,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      enrollmentOpensAt: body.enrollmentOpensAt ? new Date(body.enrollmentOpensAt) : undefined,
      enrollmentClosesAt: body.enrollmentClosesAt ? new Date(body.enrollmentClosesAt) : undefined,
    }
    assertEnrollmentSchedule({
      startsAt: patch.startsAt ?? rules.startsAt,
      enrollmentOpensAt: patch.enrollmentOpensAt ?? rules.enrollmentOpensAt,
      enrollmentClosesAt: patch.enrollmentClosesAt ?? rules.enrollmentClosesAt,
    })
    await updateEventFields(tx, eventId, patch)
  })
  return readOrganizerEvent(db, context.organizationId, eventId)
}

export const transitionEvent = async (
  db: Database,
  context: OrganizerContext,
  eventId: string,
  target: EventStatus,
) => {
  await db.transaction(async (tx) => {
    const { rules } = await lockOrganizationEvent(tx, context.organizationId, eventId)
    assertEventTransition(rules.status, target, context.role)
    await setEventStatus(tx, eventId, target)
  })
  return readOrganizerEvent(db, context.organizationId, eventId)
}

export const getOrganizerEvent = readOrganizerEvent
