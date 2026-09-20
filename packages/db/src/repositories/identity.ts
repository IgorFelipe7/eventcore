import { type OrganizationRole } from '@eventcore/domain'
import { sql } from 'drizzle-orm'
import { type Executor } from '../client'

export const ensureUser = async (
  executor: Executor,
  externalAuthId: string,
  displayName: string,
): Promise<{ id: string; displayName: string }> => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const row = await tryEnsureUser(executor, externalAuthId, displayName)
    if (row) return row
  }
  throw new Error('User upsert returned no row after a concurrent insert.')
}

const tryEnsureUser = async (
  executor: Executor,
  externalAuthId: string,
  displayName: string,
): Promise<{ id: string; displayName: string } | null> => {
  const { rows } = await executor.execute<{ id: string; display_name: string }>(sql`
    WITH inserted AS (
      INSERT INTO users (external_auth_id, display_name)
      VALUES (${externalAuthId}, ${displayName})
      ON CONFLICT (external_auth_id) DO NOTHING
      RETURNING id, display_name
    )
    SELECT id, display_name FROM inserted
    UNION ALL
    SELECT id, display_name FROM users WHERE external_auth_id = ${externalAuthId}
    LIMIT 1
  `)
  const [row] = rows
  return row ? { id: row.id, displayName: row.display_name } : null
}

export interface MembershipRecord {
  readonly organization: { readonly id: string; readonly slug: string; readonly name: string }
  readonly role: OrganizationRole
}

export const findMembership = async (
  executor: Executor,
  organizationId: string,
  userId: string,
): Promise<OrganizationRole | null> => {
  const { rows } = await executor.execute<{ role: OrganizationRole }>(sql`
    SELECT role FROM organization_members
    WHERE organization_id = ${organizationId} AND user_id = ${userId}
  `)
  return rows[0]?.role ?? null
}

export const listMemberships = async (
  executor: Executor,
  userId: string,
): Promise<MembershipRecord[]> => {
  const { rows } = await executor.execute<{
    id: string
    slug: string
    name: string
    role: OrganizationRole
  }>(sql`
    SELECT o.id, o.slug, o.name, m.role
    FROM organization_members m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.user_id = ${userId}
    ORDER BY o.name
  `)
  return rows.map((row) => ({
    organization: { id: row.id, slug: row.slug, name: row.name },
    role: row.role,
  }))
}

export const createOrganization = async (
  executor: Executor,
  input: { readonly slug: string; readonly name: string; readonly adminUserId: string },
): Promise<{ id: string } | null> => {
  const { rows } = await executor.execute<{ id: string }>(sql`
    INSERT INTO organizations (slug, name)
    VALUES (${input.slug}, ${input.name})
    ON CONFLICT (slug) DO NOTHING
    RETURNING id
  `)
  const [row] = rows
  if (!row) return null
  await executor.execute(sql`
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (${row.id}, ${input.adminUserId}, 'ADMIN')
  `)
  return row
}
