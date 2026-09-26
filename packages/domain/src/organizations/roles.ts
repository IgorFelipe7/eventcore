import { DomainError } from '../errors'

export const ORGANIZATION_ROLES = ['ADMIN', 'ORGANIZER'] as const
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number]

const grants = {
  'event:read': ['ADMIN', 'ORGANIZER'],
  'event:create': ['ADMIN', 'ORGANIZER'],
  'event:update': ['ADMIN', 'ORGANIZER'],
  'event:change-capacity': ['ADMIN'],
  'registration:list': ['ADMIN', 'ORGANIZER'],
  'registration:cancel-any': ['ADMIN'],
  'audit:read': ['ADMIN'],
  'integrity:read': ['ADMIN', 'ORGANIZER'],
} as const satisfies Record<string, readonly OrganizationRole[]>

export type Permission = keyof typeof grants

export const PERMISSIONS = Object.keys(grants) as Permission[]

export const hasPermission = (role: OrganizationRole, permission: Permission): boolean =>
  (grants[permission] as readonly OrganizationRole[]).includes(role)

export const assertPermission = (role: OrganizationRole, permission: Permission): void => {
  if (!hasPermission(role, permission)) {
    throw new DomainError('INSUFFICIENT_ROLE', `Role ${role} cannot perform ${permission}.`, {
      role,
      permission,
    })
  }
}
