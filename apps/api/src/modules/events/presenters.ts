import { type Inventory, type OrganizerEvent, type PublicEvent } from '@eventcore/contracts'
import { type EventView } from '@eventcore/db'
import { allowedEventTransitions, seatsAvailable } from '@eventcore/domain'

export const presentInventory = (snapshot: {
  readonly capacity: number
  readonly confirmedCount: number
  readonly waitlisted: number
}): Inventory => ({
  capacity: snapshot.capacity,
  confirmed: snapshot.confirmedCount,
  available: Math.max(0, seatsAvailable(snapshot)),
  waitlisted: snapshot.waitlisted,
})

export const presentPublicEvent = (event: EventView): PublicEvent => ({
  id: event.id,
  slug: event.slug,
  name: event.name,
  description: event.description,
  status: event.status,
  venue: event.venue,
  startsAt: event.startsAt.toISOString(),
  enrollmentOpensAt: event.enrollmentOpensAt.toISOString(),
  enrollmentClosesAt: event.enrollmentClosesAt.toISOString(),
  waitlistEnabled: event.waitlistEnabled,
  organization: event.organization,
  inventory: presentInventory(event),
  observedAt: event.observedAt.toISOString(),
})

export const presentOrganizerEvent = (event: EventView): OrganizerEvent => ({
  ...presentPublicEvent(event),
  createdAt: event.createdAt.toISOString(),
  allowedTransitions: allowedEventTransitions(event.status),
})
