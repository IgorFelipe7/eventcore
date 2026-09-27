import {
  ChangeCapacityBodySchema,
  ChangeCapacityResponseSchema,
  CreateEventBodySchema,
  CreateOrganizationBodySchema,
  EventRegistrationListSchema,
  EventRegistrationsQuerySchema,
  EventTransitionBodySchema,
  IdSchema,
  IntegrityReportSchema,
  MembershipSchema,
  OrganizerEventListSchema,
  OrganizerEventSchema,
  ProblemDetailsSchema,
  UpdateEventBodySchema,
} from '@eventcore/contracts'
import {
  type Database,
  createOrganization,
  listEventRegistrations,
  listOrganizationEvents,
  readIntegrity,
} from '@eventcore/db'
import { type Permission } from '@eventcore/domain'
import { type FastifyRequest } from 'fastify'
import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  executeIdempotent,
  fingerprintRequest,
  requireIdempotencyKey,
  sendCommandResponse,
} from '../../application/idempotency'
import { requireMembership } from '../../application/tenancy'
import { requireActor } from '../../auth/authenticate'
import { TimeIdCursorSchema, decodeCursor, encodeCursor, pageWindow } from '../../http/cursor'
import { ProblemError, problemContext } from '../../http/problem'
import { CHANGE_CAPACITY_ACTION, changeCapacity } from '../events/change-capacity'
import {
  type OrganizerContext,
  createEvent,
  getOrganizerEvent,
  transitionEvent,
  updateEvent,
} from '../events/organizer-commands'
import { presentOrganizerEvent } from '../events/presenters'

const OrganizationParams = z.object({ organizationId: IdSchema })
const OrganizationEventParams = OrganizationParams.extend({ eventId: IdSchema })
const security = [{ bearer: [] }]
const problems = { '4xx': ProblemDetailsSchema }

export const organizationRoutes: FastifyPluginAsyncZod<{
  db: Database
  clock: () => Date
  idempotencyTtlSeconds: number
}> = async (app, { db, clock, idempotencyTtlSeconds }) => {
  const organizerContext = async (
    request: FastifyRequest,
    organizationId: string,
    permission: Permission,
  ): Promise<OrganizerContext> => {
    const actor = requireActor(request)
    const role = await requireMembership(db, organizationId, actor.userId, permission)
    return { actor, organizationId, role, requestId: request.id }
  }

  app.post(
    '/v1/organizations',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Create an organization; the caller becomes its first admin',
        security,
        body: CreateOrganizationBodySchema,
        response: { 201: MembershipSchema, ...problems },
      },
    },
    async (request, reply) => {
      const actor = requireActor(request)
      const created = await db.transaction((tx) =>
        createOrganization(tx, { ...request.body, adminUserId: actor.userId }),
      )
      if (!created) throw new ProblemError('SLUG_TAKEN', `"${request.body.slug}" is already taken.`)
      return reply.code(201).send({
        organization: { id: created.id, slug: request.body.slug, name: request.body.name },
        role: 'ADMIN' as const,
      })
    },
  )

  app.get(
    '/v1/organizations/:organizationId/events',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Every event of the organization, drafts included',
        security,
        params: OrganizationParams,
        response: { 200: OrganizerEventListSchema, ...problems },
      },
    },
    async (request) => {
      const { organizationId } = request.params
      await organizerContext(request, organizationId, 'event:read')
      const events = await listOrganizationEvents(db, organizationId)
      return { items: events.map(presentOrganizerEvent) }
    },
  )

  app.post(
    '/v1/organizations/:organizationId/events',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Create a draft event with its capacity',
        security,
        params: OrganizationParams,
        body: CreateEventBodySchema,
        response: { 201: OrganizerEventSchema, ...problems },
      },
    },
    async (request, reply) => {
      const context = await organizerContext(request, request.params.organizationId, 'event:create')
      return reply.code(201).send(await createEvent(db, context, request.body))
    },
  )

  app.get(
    '/v1/organizations/:organizationId/events/:eventId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Read one event of the organization',
        security,
        params: OrganizationEventParams,
        response: { 200: OrganizerEventSchema, ...problems },
      },
    },
    async (request) => {
      const { organizationId, eventId } = request.params
      await organizerContext(request, organizationId, 'event:read')
      return getOrganizerEvent(db, organizationId, eventId)
    },
  )

  app.patch(
    '/v1/organizations/:organizationId/events/:eventId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Update event metadata under the inventory lock',
        security,
        params: OrganizationEventParams,
        body: UpdateEventBodySchema,
        response: { 200: OrganizerEventSchema, ...problems },
      },
    },
    async (request) => {
      const { organizationId, eventId } = request.params
      const context = await organizerContext(request, organizationId, 'event:update')
      return updateEvent(db, context, eventId, request.body)
    },
  )

  app.post(
    '/v1/organizations/:organizationId/events/:eventId/status',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Move an event through DRAFT, PUBLISHED, CLOSED and CANCELLED',
        security,
        params: OrganizationEventParams,
        body: EventTransitionBodySchema,
        response: { 200: OrganizerEventSchema, ...problems },
      },
    },
    async (request) => {
      const { organizationId, eventId } = request.params
      const context = await organizerContext(request, organizationId, 'event:update')
      return transitionEvent(db, context, eventId, request.body.status)
    },
  )

  app.post(
    '/v1/organizations/:organizationId/events/:eventId/capacity',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Change capacity under the inventory lock, promoting from the waitlist',
        description:
          'Idempotent. Refuses to go below confirmed seats. Increasing capacity promotes the head of the queue in the same transaction, in batches of up to 500.',
        security,
        headers: z.object({ 'idempotency-key': z.string().optional() }),
        params: OrganizationEventParams,
        body: ChangeCapacityBodySchema,
        response: { 200: ChangeCapacityResponseSchema, ...problems },
      },
    },
    async (request, reply) => {
      const { organizationId, eventId } = request.params
      const { actor } = await organizerContext(request, organizationId, 'event:change-capacity')
      const key = requireIdempotencyKey(request)
      const context = { actor, organizationId, ...problemContext(request), now: clock() }

      const response = await executeIdempotent(
        db,
        { actorId: actor.userId, action: CHANGE_CAPACITY_ACTION, scopeId: eventId, key },
        fingerprintRequest({ action: CHANGE_CAPACITY_ACTION, scopeId: eventId, body: request.body }),
        idempotencyTtlSeconds,
        (tx) => changeCapacity(tx, context, eventId, request.body.capacity),
      )
      return sendCommandResponse(reply, response)
    },
  )

  app.get(
    '/v1/organizations/:organizationId/events/:eventId/registrations',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Registrations for one event, oldest first',
        security,
        params: OrganizationEventParams,
        querystring: EventRegistrationsQuerySchema,
        response: { 200: EventRegistrationListSchema, ...problems },
      },
    },
    async (request) => {
      const { organizationId, eventId } = request.params
      await organizerContext(request, organizationId, 'registration:list')
      await getOrganizerEvent(db, organizationId, eventId)

      const { status, limit, cursor } = request.query
      const after = decodeCursor(cursor, TimeIdCursorSchema)
      const rows = await listEventRegistrations(db, eventId, {
        status,
        limit: limit + 1,
        after: after && { createdAt: after.at, id: after.id },
      })
      const { items, hasMore } = pageWindow(rows, limit)
      const last = items.at(-1)
      return {
        items: items.map((row) => ({
          registrationId: row.registrationId,
          participant: { id: row.participantId, displayName: row.participantName },
          status: row.status,
          waitlistPosition: row.waitlistPosition,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })),
        nextCursor:
          hasMore && last
            ? encodeCursor({ t: last.createdAt.toISOString(), i: last.registrationId })
            : null,
      }
    },
  )

  app.get(
    '/v1/organizations/:organizationId/integrity',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['organizations'],
        summary: 'Cross-check the confirmed counter against registration rows',
        security,
        params: OrganizationParams,
        response: { 200: IntegrityReportSchema, ...problems },
      },
    },
    async (request) => {
      const { organizationId } = request.params
      await organizerContext(request, organizationId, 'integrity:read')
      const rows = await readIntegrity(db, { organizationId })
      const events = rows.map((row) => ({
        ...row,
        withinCapacity: row.confirmedCount >= 0 && row.confirmedCount <= row.capacity,
        projectionMatches: row.confirmedCount === row.confirmedRows,
        noIdleSeatWhileQueued: row.waitlistedRows === 0 || row.confirmedCount === row.capacity,
      }))
      return {
        checkedAt: new Date().toISOString(),
        events,
        violations: events.filter(
          (event) => !event.withinCapacity || !event.projectionMatches || !event.noIdleSeatWhileQueued,
        ).length,
      }
    },
  )
}
