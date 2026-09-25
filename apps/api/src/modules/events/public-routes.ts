import {
  EventListQuerySchema,
  EventListResponseSchema,
  IdSchema,
  ProblemDetailsSchema,
  PublicEventSchema,
  SlugSchema,
} from '@eventcore/contracts'
import {
  type Database,
  findPublicEventById,
  findPublicEventBySlug,
  listPublicEvents,
} from '@eventcore/db'
import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { TimeIdCursorSchema, decodeCursor, encodeCursor, pageWindow } from '../../http/cursor'
import { ProblemError } from '../../http/problem'
import { presentPublicEvent } from './presenters'

export const publicEventRoutes: FastifyPluginAsyncZod<{ db: Database }> = async (app, { db }) => {
  app.get(
    '/v1/events',
    {
      schema: {
        tags: ['events'],
        summary: 'List published and closed events, soonest first',
        querystring: EventListQuerySchema,
        response: { 200: EventListResponseSchema, '4xx': ProblemDetailsSchema },
      },
    },
    async (request) => {
      const { status, limit, cursor } = request.query
      const after = decodeCursor(cursor, TimeIdCursorSchema)
      const rows = await listPublicEvents(db, {
        status,
        limit: limit + 1,
        after: after && { startsAt: after.at, id: after.id },
      })
      const { items, hasMore } = pageWindow(rows, limit)
      const last = items.at(-1)
      return {
        items: items.map(presentPublicEvent),
        nextCursor:
          hasMore && last ? encodeCursor({ t: last.startsAt.toISOString(), i: last.id }) : null,
      }
    },
  )

  app.get(
    '/v1/events/:eventId',
    {
      schema: {
        tags: ['events'],
        summary: 'Read one public event with a point-in-time inventory snapshot',
        params: z.object({ eventId: IdSchema }),
        response: { 200: PublicEventSchema, '4xx': ProblemDetailsSchema },
      },
    },
    async (request) => {
      const event = await findPublicEventById(db, request.params.eventId)
      if (!event) throw new ProblemError('NOT_FOUND', 'No public event with that id.')
      return presentPublicEvent(event)
    },
  )

  app.get(
    '/v1/events/by-slug/:organizationSlug/:eventSlug',
    {
      schema: {
        tags: ['events'],
        summary: 'Resolve a public event from its organization and event slugs',
        params: z.object({ organizationSlug: SlugSchema, eventSlug: SlugSchema }),
        response: { 200: PublicEventSchema, '4xx': ProblemDetailsSchema },
      },
    },
    async (request) => {
      const { organizationSlug, eventSlug } = request.params
      const event = await findPublicEventBySlug(db, organizationSlug, eventSlug)
      if (!event) throw new ProblemError('NOT_FOUND', 'No public event at that address.')
      return presentPublicEvent(event)
    },
  )
}
