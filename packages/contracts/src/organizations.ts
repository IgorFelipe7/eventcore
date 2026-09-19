import { ORGANIZATION_ROLES } from '@eventcore/domain'
import { z } from 'zod'
import { CursorQuerySchema, IdSchema, SlugSchema, TimestampSchema, pageOf } from './common'

export const OrganizationRoleSchema = z.enum(ORGANIZATION_ROLES)

export const CreateOrganizationBodySchema = z
  .object({ slug: SlugSchema, name: z.string().trim().min(2).max(120) })
  .meta({ id: 'CreateOrganizationBody' })

export const MembershipSchema = z
  .object({
    organization: z.object({ id: IdSchema, slug: SlugSchema, name: z.string() }),
    role: OrganizationRoleSchema,
  })
  .meta({ id: 'Membership' })

export type Membership = z.infer<typeof MembershipSchema>

export const MembershipListSchema = z
  .object({ items: z.array(MembershipSchema) })
  .meta({ id: 'MembershipList' })

export const ViewerSchema = z
  .object({
    id: IdSchema,
    displayName: z.string(),
    memberships: z.array(MembershipSchema),
  })
  .meta({ id: 'Viewer' })

export type Viewer = z.infer<typeof ViewerSchema>

export const AuditQuerySchema = CursorQuerySchema

export const AuditEntrySchema = z
  .object({
    id: IdSchema,
    action: z.string(),
    resourceType: z.string(),
    resourceId: IdSchema,
    actorId: IdSchema.nullable(),
    safeBefore: z.record(z.string(), z.unknown()).nullable(),
    safeAfter: z.record(z.string(), z.unknown()).nullable(),
    requestId: z.string(),
    createdAt: TimestampSchema,
  })
  .meta({ id: 'AuditEntry' })

export type AuditEntry = z.infer<typeof AuditEntrySchema>

export const AuditPageSchema = pageOf(AuditEntrySchema).meta({ id: 'AuditPage' })

export const IntegrityReportSchema = z
  .object({
    checkedAt: TimestampSchema,
    events: z.array(
      z.object({
        eventId: IdSchema,
        capacity: z.number().int(),
        confirmedCount: z.number().int(),
        confirmedRows: z.number().int(),
        waitlistedRows: z.number().int(),
        withinCapacity: z.boolean(),
        projectionMatches: z.boolean(),
        noIdleSeatWhileQueued: z.boolean(),
      }),
    ),
    violations: z.number().int().nonnegative(),
  })
  .meta({ id: 'IntegrityReport' })

export type IntegrityReport = z.infer<typeof IntegrityReportSchema>
