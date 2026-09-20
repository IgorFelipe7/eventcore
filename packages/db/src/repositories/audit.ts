import { sql } from 'drizzle-orm'
import { type Executor } from '../client'

export interface AuditInput {
  readonly organizationId: string
  readonly actorId: string | null
  readonly action: string
  readonly resourceType: string
  readonly resourceId: string
  readonly safeBefore: Record<string, unknown> | null
  readonly safeAfter: Record<string, unknown> | null
  readonly requestId: string
}

const asJson = (value: Record<string, unknown> | null) =>
  value === null ? null : JSON.stringify(value)

export const appendAudit = async (executor: Executor, input: AuditInput): Promise<void> => {
  await executor.execute(sql`
    INSERT INTO audit_log
      (organization_id, actor_id, action, resource_type, resource_id, safe_before, safe_after, request_id)
    VALUES (
      ${input.organizationId},
      ${input.actorId},
      ${input.action},
      ${input.resourceType},
      ${input.resourceId},
      ${asJson(input.safeBefore)}::jsonb,
      ${asJson(input.safeAfter)}::jsonb,
      ${input.requestId}
    )
  `)
}

export interface AuditRecord {
  readonly id: string
  readonly action: string
  readonly resourceType: string
  readonly resourceId: string
  readonly actorId: string | null
  readonly safeBefore: Record<string, unknown> | null
  readonly safeAfter: Record<string, unknown> | null
  readonly requestId: string
  readonly createdAt: Date
}

export const listAudit = async (
  executor: Executor,
  organizationId: string,
  page: { readonly limit: number; readonly after: { createdAt: Date; id: string } | null },
): Promise<AuditRecord[]> => {
  const after = page.after
    ? sql`AND (created_at, id) < (${page.after.createdAt.toISOString()}::timestamptz, ${page.after.id}::uuid)`
    : sql``
  const { rows } = await executor.execute<{
    id: string
    action: string
    resource_type: string
    resource_id: string
    actor_id: string | null
    safe_before: Record<string, unknown> | null
    safe_after: Record<string, unknown> | null
    request_id: string
    created_at: Date
  }>(sql`
    SELECT id, action, resource_type, resource_id, actor_id, safe_before, safe_after, request_id, created_at
    FROM audit_log
    WHERE organization_id = ${organizationId}
    ${after}
    ORDER BY created_at DESC, id DESC
    LIMIT ${page.limit}
  `)
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    actorId: row.actor_id,
    safeBefore: row.safe_before,
    safeAfter: row.safe_after,
    requestId: row.request_id,
    createdAt: row.created_at,
  }))
}
