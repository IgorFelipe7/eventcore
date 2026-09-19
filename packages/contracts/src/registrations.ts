import { REGISTRATION_STATUSES } from '@eventcore/domain'
import { z } from 'zod'
import {
  CursorQuerySchema,
  IdSchema,
  InventorySchema,
  SlugSchema,
  TimestampSchema,
  pageOf,
} from './common'

export const RegistrationStatusSchema = z.enum(REGISTRATION_STATUSES)

export const RegistrationTransitionSchema = z.enum(['CREATED', 'REENTERED', 'UNCHANGED'])

export const RegisterBodySchema = z
  .object({ source: z.enum(['web', 'api', 'lab']).default('api') })
  .strict()
  .meta({ id: 'RegisterBody' })

export type RegisterBody = z.infer<typeof RegisterBodySchema>

export const RegistrationResultSchema = z
  .object({
    registrationId: IdSchema,
    eventId: IdSchema,
    status: RegistrationStatusSchema,
    transition: RegistrationTransitionSchema,
    waitlistPosition: z.number().int().positive().nullable(),
    inventory: InventorySchema,
    requestId: z.string(),
  })
  .meta({ id: 'RegistrationResult' })

export type RegistrationResult = z.infer<typeof RegistrationResultSchema>

export const CancellationResultSchema = z
  .object({
    registrationId: IdSchema,
    eventId: IdSchema,
    status: RegistrationStatusSchema,
    transition: z.enum(['CANCELLED', 'UNCHANGED']),
    promotedRegistrationId: IdSchema.nullable(),
    inventory: InventorySchema,
    requestId: z.string(),
  })
  .meta({ id: 'CancellationResult' })

export type CancellationResult = z.infer<typeof CancellationResultSchema>

export const RegistrationHistoryEntrySchema = z.object({
  from: RegistrationStatusSchema.nullable(),
  to: RegistrationStatusSchema,
  reason: z.string(),
  occurredAt: TimestampSchema,
})

export const MyRegistrationSchema = z
  .object({
    registrationId: IdSchema,
    status: RegistrationStatusSchema,
    waitlistPosition: z.number().int().positive().nullable(),
    updatedAt: TimestampSchema,
    event: z.object({
      id: IdSchema,
      slug: SlugSchema,
      name: z.string(),
      startsAt: TimestampSchema,
      venue: z.string(),
      organizationSlug: SlugSchema,
      organizationName: z.string(),
    }),
    history: z.array(RegistrationHistoryEntrySchema),
  })
  .meta({ id: 'MyRegistration' })

export type MyRegistration = z.infer<typeof MyRegistrationSchema>

export const MyRegistrationListSchema = z
  .object({ items: z.array(MyRegistrationSchema) })
  .meta({ id: 'MyRegistrationList' })

export const EventRegistrationsQuerySchema = CursorQuerySchema.extend({
  status: RegistrationStatusSchema.optional(),
})

export const EventRegistrationSchema = z
  .object({
    registrationId: IdSchema,
    participant: z.object({ id: IdSchema, displayName: z.string() }),
    status: RegistrationStatusSchema,
    waitlistPosition: z.number().int().positive().nullable(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .meta({ id: 'EventRegistration' })

export type EventRegistration = z.infer<typeof EventRegistrationSchema>

export const EventRegistrationListSchema = pageOf(EventRegistrationSchema).meta({
  id: 'EventRegistrationList',
})
