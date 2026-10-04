import { randomUUID } from 'node:crypto'
import { MyRegistrationListSchema, PublicEventSchema } from '@eventcore/contracts'
import { isEnrollmentOpen } from '@eventcore/domain'
import { type Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ApiFailure } from '@/components/api-state'
import { SeatMeter } from '@/components/seat-meter'
import { SheetBar, TitleBlock } from '@/components/sheet'
import { EventStatusTag } from '@/components/status-tag'
import { RegistrationPanel } from '@/features/registrations/registration-panel'
import { callApi } from '@/lib/api'
import { formatDateTime, formatSnapshot, plural } from '@/lib/format'
import { readSession } from '@/lib/session'

interface Params {
  readonly organizationSlug: string
  readonly eventSlug: string
}

const loadEvent = (params: Params) =>
  callApi(`/v1/events/by-slug/${params.organizationSlug}/${params.eventSlug}`, {
    schema: PublicEventSchema,
  })

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<Params>
}): Promise<Metadata> {
  const result = await loadEvent(await params)
  return result.ok
    ? { title: result.data.name, description: result.data.description }
    : { title: 'Event' }
}

const closedReasonFor = (status: string, opensAt: Date, now: Date) => {
  if (status === 'CLOSED') return 'The organizer closed enrollment. Existing seats are kept.'
  if (status === 'CANCELLED') return 'This event was cancelled.'
  if (opensAt > now) return 'Enrollment hasn’t opened yet.'
  return 'Enrollment for this event has ended.'
}

export default async function EventPage({ params }: { readonly params: Promise<Params> }) {
  const resolved = await params
  const [result, session] = await Promise.all([loadEvent(resolved), readSession()])

  if (!result.ok && result.kind === 'problem' && result.problem.status === 404) notFound()

  const sheet = { number: 2, title: result.ok ? result.data.name : 'Event' }

  if (!result.ok) {
    return (
      <main id="main">
        <SheetBar sheet={sheet} />
        <section className="sheet-frame mt-12">
          <ApiFailure result={result} />
        </section>
      </main>
    )
  }

  const event = result.data
  const mine =
    session?.persona.kind === 'participant'
      ? await callApi('/v1/me/registrations', {
          schema: MyRegistrationListSchema,
          token: session.token,
        })
      : null
  const current = mine?.ok
    ? mine.data.items.find((registration) => registration.event.id === event.id)
    : undefined

  const now = new Date()
  const open = isEnrollmentOpen(
    {
      status: event.status,
      enrollmentOpensAt: new Date(event.enrollmentOpensAt),
      enrollmentClosesAt: new Date(event.enrollmentClosesAt),
    },
    now,
  )
  const { inventory } = event

  return (
    <main id="main">
      <SheetBar sheet={sheet} />
      <div className="sheet-frame mt-4">
        <Link
          href="/explore"
          className="label inline-flex min-h-11 items-center text-ink-3 hover:text-signal"
        >
          ← Event board
        </Link>
      </div>
      <section className="sheet-frame mt-4 grid grid-cols-12 gap-x-4 gap-y-12 md:gap-x-6">
        <div className="col-span-12 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-3">
            <EventStatusTag status={event.status} />
            <span className="label text-ink-3">{event.organization.name}</span>
          </div>
          <h1 className="mt-5 text-[clamp(2.25rem,1.5rem+3vw,4rem)] leading-[0.98]">
            {event.name}
          </h1>
          <p className="measure mt-6 text-lg text-ink-2">{event.description}</p>

          <dl className="mt-10 grid grid-cols-2 border-t border-ink sm:grid-cols-3">
            {[
              { term: 'Starts', value: formatDateTime(event.startsAt) },
              { term: 'Venue', value: event.venue },
              { term: 'Enrollment closes', value: formatDateTime(event.enrollmentClosesAt) },
              {
                term: 'Waitlist',
                value: event.waitlistEnabled ? 'Kept, first in first out' : 'None',
              },
              { term: 'Capacity', value: plural(inventory.capacity, 'seat') },
              { term: 'Organizer', value: event.organization.name },
            ].map((entry) => (
              <div key={entry.term} className="border-b border-rule py-4 pr-4">
                <dt className="label text-ink-3">{entry.term}</dt>
                <dd className="mt-1 text-ink">{entry.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside aria-labelledby="availability" className="col-span-12 lg:col-span-5">
          <div className="relative border border-ink bg-sheet p-5 sm:p-6">
            <p id="availability" className="label text-ink-3">
              Availability · snapshot
            </p>
            <p className="mt-3 font-display text-6xl font-semibold tabular">
              {inventory.available}
              <span className="ml-2 align-middle font-sans text-base font-normal text-ink-2">
                of {plural(inventory.capacity, 'seat')} left
              </span>
            </p>
            <div className="mt-5">
              <SeatMeter inventory={inventory} size="lg" />
            </div>
            <p className="mt-3 font-mono text-xs text-ink-2 tabular">
              {inventory.confirmed} confirmed · {inventory.waitlisted} waiting · read at{' '}
              {formatSnapshot(event.observedAt)}
            </p>
            <p className="mt-4 border-t border-rule pt-4 text-sm text-ink-2">
              This number can change before you press the button. Your request is decided by the
              database, under a lock, not by what this page shows.
            </p>
            <div className="mt-6">
              {session && session.persona.kind === 'organizer' ? (
                <p className="text-sm text-ink-2">
                  You’re acting as an organizer. Switch to a participant persona to reserve.
                </p>
              ) : (
                <RegistrationPanel
                  eventId={event.id}
                  idempotencyKey={randomUUID()}
                  currentStatus={current?.status ?? null}
                  currentPosition={current?.waitlistPosition ?? null}
                  closedReason={
                    open
                      ? null
                      : closedReasonFor(event.status, new Date(event.enrollmentOpensAt), now)
                  }
                />
              )}
            </div>
          </div>
        </aside>
      </section>
      <TitleBlock sheet={sheet} />
    </main>
  )
}
