import { EVENT_STATUSES, MAX_CAPACITY } from '@eventcore/domain'
import { z } from 'zod'
import {
  CursorQuerySchema,
  IdSchema,
  InventorySchema,
  SlugSchema,
  TimestampSchema,
  pageOf,
} from './common'

export const EventStatusSchema = z.enum(EVENT_STATUSES)

export const PublicEventSchema = z
  .object({
    id: IdSchema,
    slug: SlugSchema,
    name: z.string(),
    description: z.string(),
    status: EventStatusSchema,
    venue: z.string(),
    startsAt: TimestampSchema,
    enrollmentOpensAt: TimestampSchema,
    enrollmentClosesAt: TimestampSchema,
    waitlistEnabled: z.boolean(),
    organization: z.object({ id: IdSchema, slug: SlugSchema, name: z.string() }),
    inventory: InventorySchema,
    observedAt: TimestampSchema,
  })
  .meta({ id: 'PublicEvent' })

export type PublicEvent = z.infer<typeof PublicEventSchema>

export const EventListQuerySchema = CursorQuerySchema.extend({
  status: z.enum(['PUBLISHED', 'CLOSED']).optional(),
})

export const EventListResponseSchema = pageOf(PublicEventSchema).meta({ id: 'EventList' })
export type EventListResponse = z.infer<typeof EventListResponseSchema>

const EventFieldsSchema = z.object({
  slug: SlugSchema,
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2_000),
  venue: z.string().trim().min(2).max(160),
  startsAt: TimestampSchema,
  enrollmentOpensAt: TimestampSchema,
  enrollmentClosesAt: TimestampSchema,
  waitlistEnabled: z.boolean(),
})

export const CreateEventBodySchema = EventFieldsSchema.extend({
  description: EventFieldsSchema.shape.description.default(''),
  waitlistEnabled: EventFieldsSchema.shape.waitlistEnabled.default(true),
  capacity: z.number().int().min(0).max(MAX_CAPACITY),
}).meta({ id: 'CreateEventBody' })

export type CreateEventBody = z.infer<typeof CreateEventBodySchema>

export const UpdateEventBodySchema = EventFieldsSchema.omit({ slug: true })
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update.')
  .meta({ id: 'UpdateEventBody' })

export type UpdateEventBody = z.infer<typeof UpdateEventBodySchema>

export const ChangeCapacityBodySchema = z
  .object({ capacity: z.number().int().min(0).max(MAX_CAPACITY) })
  .meta({ id: 'ChangeCapacityBody' })

export const ChangeCapacityResponseSchema = z
  .object({
    eventId: IdSchema,
    inventory: InventorySchema,
    promotedRegistrationIds: z.array(IdSchema),
    requestId: z.string(),
  })
  .meta({ id: 'ChangeCapacityResponse' })

export type ChangeCapacityResponse = z.infer<typeof ChangeCapacityResponseSchema>

export const EventTransitionBodySchema = z
  .object({ status: EventStatusSchema })
  .meta({ id: 'EventTransitionBody' })

export const OrganizerEventSchema = PublicEventSchema.extend({
  createdAt: TimestampSchema,
  allowedTransitions: z.array(EventStatusSchema),
}).meta({ id: 'OrganizerEvent' })

export type OrganizerEvent = z.infer<typeof OrganizerEventSchema>

export const OrganizerEventListSchema = z
  .object({ items: z.array(OrganizerEventSchema) })
  .meta({ id: 'OrganizerEventList' })
