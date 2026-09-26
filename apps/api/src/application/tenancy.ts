import { type Database, findMembership } from '@eventcore/db'
import { type OrganizationRole, type Permission, hasPermission } from '@eventcore/domain'
import { ProblemError } from '../http/problem'

export const requireMembership = async (
  db: Database,
  organizationId: string,
  userId: string,
  permission: Permission,
): Promise<OrganizationRole> => {
  const role = await findMembership(db, organizationId, userId)
  if (!role) throw new ProblemError('FORBIDDEN_TENANT')
  if (!hasPermission(role, permission)) {
    throw new ProblemError('INSUFFICIENT_ROLE', `The ${role} role cannot ${permission}.`)
  }
  return role
}
