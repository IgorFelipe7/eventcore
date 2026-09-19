import { z } from 'zod'

export const IdSchema = z.uuid()

export const SlugSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, digits and single hyphens.')

export const TimestampSchema = z.iso.datetime({ offset: true })

export const IdempotencyKeySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, digits, hyphens or underscores.')

export const CursorQuerySchema = z.object({
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const pageOf = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  })

export const InventorySchema = z
  .object({
    capacity: z.number().int().nonnegative(),
    confirmed: z.number().int().nonnegative(),
    available: z.number().int().nonnegative(),
    waitlisted: z.number().int().nonnegative(),
  })
  .meta({ id: 'Inventory' })

export type Inventory = z.infer<typeof InventorySchema>
