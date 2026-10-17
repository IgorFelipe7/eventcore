import { randomUUID } from 'node:crypto'
import { MyRegistrationListSchema, PublicEventSchema } from '@eventcore/contracts'
import { isEnrollmentOpen } from '@eventcore/domain'
import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ApiFailure } from '@/components/api-state'
import { SeatMeter } from '@/components/seat-meter'
import { SheetBar, TitleBlock } from '@/components/sheet'
import { EventStatusTag } from '@/components/status-tag'
import { RegistrationPanel } from '@/features/registrations/registration-panel'
import { callApi } from '@/lib/api'
import { type Dictionary } from '@/i18n/dictionaries'
import { Link } from '@/i18n/link'
import { getI18n } from '@/i18n/server'
import { formatDateTime, formatSnapshot } from '@/lib/format'
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
  const [result, { t }] = await Promise.all([loadEvent(await params), getI18n()])
  return result.ok
    ? { title: result.data.name, description: result.data.description }
    : { title: t.sheets.event }
}

const closedReasonFor = (status: string, opensAt: Date, now: Date, t: Dictionary) => {
  if (status === 'CLOSED') return t.event.closed.CLOSED
  if (status === 'CANCELLED') return t.event.closed.CANCELLED
  if (opensAt > now) return t.event.closed.notYet
  return t.event.closed.ended
}

export default async function EventPage({ params }: { readonly params: Promise<Params> }) {
  const resolved = await params
  const [result, session, { locale, t }] = await Promise.all([
    loadEvent(resolved),
    readSession(),
    getI18n(),
  ])

  if (!result.ok && result.kind === 'problem' && result.problem.status === 404) notFound()

  const sheet = { number: 2, title: result.ok ? result.data.name : t.sheets.event }

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
          ← {t.event.back}
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
              { term: t.event.starts, value: formatDateTime(event.startsAt, locale) },
              { term: t.event.venue, value: event.venue },
              { term: t.event.closes, value: formatDateTime(event.enrollmentClosesAt, locale) },
              {
                term: t.event.waitlist,
                value: event.waitlistEnabled ? t.event.waitlistKept : t.event.waitlistNone,
              },
              { term: t.event.capacity, value: t.common.seats(inventory.capacity) },
              { term: t.event.organizer, value: event.organization.name },
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
              {t.event.availability}
            </p>
            <p className="mt-3 font-display text-6xl font-semibold tabular">
              {inventory.available}
              <span className="ml-2 align-middle font-sans text-base font-normal text-ink-2">
                {t.event.left(t.common.seats(inventory.capacity))}
              </span>
            </p>
            <div className="mt-5">
              <SeatMeter inventory={inventory} size="lg" />
            </div>
            <p className="mt-3 font-mono text-xs text-ink-2 tabular">
              {t.event.snapshotLine(
                inventory.confirmed,
                inventory.waitlisted,
                formatSnapshot(event.observedAt, locale),
              )}
            </p>
            <p className="mt-4 border-t border-rule pt-4 text-sm text-ink-2">
              {t.event.disclaimer}
            </p>
            <div className="mt-6">
              {session && session.persona.kind === 'organizer' ? (
                <p className="text-sm text-ink-2">{t.event.organizerNotice}</p>
              ) : (
                <RegistrationPanel
                  eventId={event.id}
                  idempotencyKey={randomUUID()}
                  currentStatus={current?.status ?? null}
                  currentPosition={current?.waitlistPosition ?? null}
                  closedReason={
                    open
                      ? null
                      : closedReasonFor(event.status, new Date(event.enrollmentOpensAt), now, t)
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
