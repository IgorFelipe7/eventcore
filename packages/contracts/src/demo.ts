import { type OrganizationRole } from '@eventcore/domain'

export interface DemoPersona {
  readonly externalAuthId: string
  readonly displayName: string
  readonly kind: 'participant' | 'organizer'
  readonly memberships: readonly {
    readonly organizationSlug: string
    readonly role: OrganizationRole
  }[]
}

export const DEMO_PERSONAS = [
  {
    externalAuthId: 'demo|participant-rio',
    displayName: 'Rio (demo participant)',
    kind: 'participant',
    memberships: [],
  },
  {
    externalAuthId: 'demo|participant-sol',
    displayName: 'Sol (demo participant)',
    kind: 'participant',
    memberships: [],
  },
  {
    externalAuthId: 'demo|participant-ivo',
    displayName: 'Ivo (demo participant)',
    kind: 'participant',
    memberships: [],
  },
  {
    externalAuthId: 'demo|organizer-mara',
    displayName: 'Mara (Northwind admin)',
    kind: 'organizer',
    memberships: [{ organizationSlug: 'northwind-assembly', role: 'ADMIN' }],
  },
  {
    externalAuthId: 'demo|organizer-teo',
    displayName: 'Teo (Northwind organizer)',
    kind: 'organizer',
    memberships: [{ organizationSlug: 'northwind-assembly', role: 'ORGANIZER' }],
  },
  {
    externalAuthId: 'demo|organizer-lis',
    displayName: 'Lis (Harbor Guild admin)',
    kind: 'organizer',
    memberships: [{ organizationSlug: 'harbor-guild', role: 'ADMIN' }],
  },
] as const satisfies readonly DemoPersona[]

export type DemoPersonaId = (typeof DEMO_PERSONAS)[number]['externalAuthId']
