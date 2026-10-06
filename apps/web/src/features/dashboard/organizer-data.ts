import 'server-only'
import {
  type Membership,
  type OrganizerEvent,
  OrganizerEventListSchema,
  OrganizerEventSchema,
  ViewerSchema,
} from '@eventcore/contracts'
import { type ApiResult, callApi } from '@/lib/api'

export const loadViewer = (token: string) => callApi('/v1/me', { schema: ViewerSchema, token })

export const loadOrganizationEvents = (token: string, organizationId: string) =>
  callApi(`/v1/organizations/${organizationId}/events`, {
    schema: OrganizerEventListSchema,
    token,
  })

export interface LocatedEvent {
  readonly membership: Membership
  readonly event: OrganizerEvent
}

export const locateEvent = async (
  token: string,
  memberships: readonly Membership[],
  eventId: string,
): Promise<LocatedEvent | ApiResult<never> | null> => {
  for (const membership of memberships) {
    const result = await callApi(
      `/v1/organizations/${membership.organization.id}/events/${eventId}`,
      { schema: OrganizerEventSchema, token },
    )
    if (result.ok) return { membership, event: result.data }
    if (result.kind === 'unavailable') return result
  }
  return null
}
