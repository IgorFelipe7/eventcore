import { randomUUID } from 'node:crypto'
import {
  AuditPageSchema,
  EventRegistrationListSchema,
  IdSchema,
  IntegrityReportSchema,
} from '@eventcore/contracts'
import { hasPermission } from '@eventcore/domain'
import { type Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ApiFailure } from '@/components/api-state'
import { PersonaRequired } from '@/components/persona-required'
import { SeatMeter } from '@/components/seat-meter'
import { SheetBar, TitleBlock } from '@/components/sheet'
import { EventStatusTag, RegistrationStatusTag } from '@/components/status-tag'
import { CapacityControl, LifecycleControls } from '@/features/dashboard/event-controls'
import { loadViewer, locateEvent } from '@/features/dashboard/organizer-data'
import { callApi } from '@/lib/api'
import { formatDateTime, formatSnapshot, shortId } from '@/lib/format'
import { readSession } from '@/lib/session'

export const metadata: Metadata = { title: 'Event panel' }

function Panel({
  title,
  children,
  className = '',
}: {
  readonly title: string
  readonly children: React.ReactNode
  readonly className?: string
}) {
  return (
    <section aria-label={title} className={`border border-ink bg-sheet ${className}`}>
      <h2 className="label border-b border-ink px-4 py-2.5 font-mono font-medium text-ink-3">
        {title}
      </h2>
      <div className="p-4">{children}</div>
    </section>
  )
}

export default async function EventPanelPage({
  params,
}: {
  readonly params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  if (!IdSchema.safeParse(eventId).success) notFound()

  const session = await readSession()
  const sheet = { number: 5, title: 'Event panel' }

  if (!session || session.persona.kind !== 'organizer') {
    return (
      <main id="main">
        <SheetBar sheet={sheet} />
        <section className="sheet-frame mt-12">
          <PersonaRequired kind="organizer" />
        </section>
      </main>
    )
  }

  const viewer = await loadViewer(session.token)
  const located = viewer.ok
    ? await locateEvent(session.token, viewer.data.memberships, eventId)
    : viewer
  if (located === null) notFound()
  if ('ok' in located) {
    return (
      <main id="main">
        <SheetBar sheet={sheet} />
        <section className="sheet-frame mt-12">
          {!located.ok ? <ApiFailure result={located} /> : null}
        </section>
      </main>
    )
  }

  const { membership, event } = located
  const organizationId = membership.organization.id
  const isAdmin = hasPermission(membership.role, 'audit:read')
  const [registrations, integrity, audit] = await Promise.all([
    callApi(`/v1/organizations/${organizationId}/events/${eventId}/registrations?limit=100`, {
      schema: EventRegistrationListSchema,
      token: session.token,
    }),
    callApi(`/v1/organizations/${organizationId}/integrity`, {
      schema: IntegrityReportSchema,
      token: session.token,
    }),
    isAdmin
      ? callApi(`/v1/organizations/${organizationId}/audit?limit=12`, {
          schema: AuditPageSchema,
          token: session.token,
        })
      : null,
  ])
  const check = integrity.ok
    ? integrity.data.events.find((row) => row.eventId === eventId)
    : undefined

  return (
    <main id="main">
      <SheetBar sheet={{ number: 5, title: event.name }} />
      <div className="sheet-frame mt-4">
        <Link
          href="/dashboard"
          className="label inline-flex min-h-11 items-center text-ink-3 hover:text-signal"
        >
          ← {membership.organization.name}
        </Link>
      </div>
      <header className="sheet-frame mt-2 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <EventStatusTag status={event.status} />
            <span className="label text-ink-3">Your role · {membership.role}</span>
          </div>
          <h1 className="mt-4 text-[clamp(2rem,1.4rem+2.5vw,3.5rem)] leading-none">{event.name}</h1>
          <p className="mt-3 text-ink-2">
            {formatDateTime(event.startsAt)} · {event.venue}
          </p>
        </div>
        {event.status !== 'DRAFT' ? (
          <Link
            href={`/events/${event.organization.slug}/${event.slug}`}
            className="min-h-11 text-sm underline hover:text-signal"
          >
            Public sheet →
          </Link>
        ) : null}
      </header>

      <div className="sheet-frame mt-10 grid grid-cols-12 gap-4 md:gap-6">
        <Panel title="Inventory" className="col-span-12 lg:col-span-5">
          <p className="font-display text-5xl font-semibold tabular">
            {event.inventory.confirmed}
            <span className="text-2xl text-ink-3"> / {event.inventory.capacity}</span>
          </p>
          <div className="mt-4">
            <SeatMeter inventory={event.inventory} size="lg" />
          </div>
          <p className="mt-3 font-mono text-xs text-ink-2 tabular">
            {event.inventory.available} available · {event.inventory.waitlisted} waiting · read at{' '}
            {formatSnapshot(event.observedAt)}
          </p>
          <div className="mt-6 border-t border-rule pt-5">
            <CapacityControl
              organizationId={organizationId}
              eventId={eventId}
              capacity={event.inventory.capacity}
              confirmed={event.inventory.confirmed}
              idempotencyKey={randomUUID()}
              allowed={hasPermission(membership.role, 'event:change-capacity')}
            />
          </div>
        </Panel>

        <div className="col-span-12 grid content-start gap-4 md:gap-6 lg:col-span-7">
          <Panel title="Lifecycle">
            <LifecycleControls
              organizationId={organizationId}
              eventId={eventId}
              transitions={event.allowedTransitions}
            />
          </Panel>
          <Panel title="Integrity check">
            {check ? (
              <ul className="grid gap-2 text-sm sm:grid-cols-3">
                {[
                  { label: 'Within capacity', ok: check.withinCapacity },
                  { label: 'Counter matches rows', ok: check.projectionMatches },
                  { label: 'No idle seat while queued', ok: check.noIdleSeatWhileQueued },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`font-mono ${item.ok ? 'text-confirmed' : 'text-rejected'}`}
                    >
                      {item.ok ? '✓' : '×'}
                    </span>
                    {item.label}
                    <span className="sr-only">{item.ok ? 'passes' : 'fails'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-2">Integrity report unavailable.</p>
            )}
            {check ? (
              <p className="mt-3 font-mono text-xs text-ink-3 tabular">
                counter {check.confirmedCount} · confirmed rows {check.confirmedRows} · waitlisted
                rows {check.waitlistedRows}
              </p>
            ) : null}
          </Panel>
        </div>

        <Panel title="Registrations" className="col-span-12 lg:col-span-7">
          {!registrations.ok ? (
            <ApiFailure result={registrations} />
          ) : registrations.data.items.length === 0 ? (
            <p className="text-sm text-ink-2">Nobody has registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink">
                    <th scope="col" className="label py-2 pr-3 text-ink-3">
                      Participant
                    </th>
                    <th scope="col" className="label py-2 pr-3 text-ink-3">
                      Status
                    </th>
                    <th scope="col" className="label py-2 pr-3 text-right text-ink-3">
                      Registered
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.data.items.map((registration) => (
                    <tr
                      key={registration.registrationId}
                      className="border-b border-rule last:border-b-0"
                    >
                      <td className="py-2.5 pr-3">{registration.participant.displayName}</td>
                      <td className="py-2.5 pr-3">
                        <RegistrationStatusTag
                          status={registration.status}
                          position={registration.waitlistPosition}
                        />
                      </td>
                      <td className="py-2.5 text-right font-mono text-xs text-ink-2 tabular">
                        {formatSnapshot(registration.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Audit trail · latest" className="col-span-12 lg:col-span-5">
          {!audit ? (
            <p className="text-sm text-ink-2">The audit trail is visible to admins only.</p>
          ) : !audit.ok ? (
            <ApiFailure result={audit} />
          ) : (
            <ol className="grid gap-2.5">
              {audit.data.items.map((entry) => (
                <li
                  key={entry.id}
                  className="grid grid-cols-[1fr_auto] gap-x-3 border-b border-rule pb-2.5 last:border-b-0"
                >
                  <span className="font-mono text-xs text-ink">{entry.action}</span>
                  <span className="font-mono text-xs text-ink-3 tabular">
                    {formatSnapshot(entry.createdAt)}
                  </span>
                  <span className="col-span-2 font-mono text-[0.7rem] text-ink-3">
                    {entry.resourceType} …{shortId(entry.resourceId)} · req …
                    {shortId(entry.requestId)}
                    {entry.safeAfter && 'status' in entry.safeAfter
                      ? ` · → ${String(entry.safeAfter['status'])}`
                      : ''}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
      <TitleBlock sheet={sheet} />
    </main>
  )
}
