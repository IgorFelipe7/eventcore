import { randomUUID } from 'node:crypto'
import {
  AuditPageSchema,
  EventRegistrationListSchema,
  IdSchema,
  IntegrityReportSchema,
} from '@eventcore/contracts'
import { hasPermission } from '@eventcore/domain'
import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ApiFailure } from '@/components/api-state'
import { PersonaRequired } from '@/components/persona-required'
import { SeatMeter } from '@/components/seat-meter'
import { EventStatusTag, RegistrationStatusTag } from '@/components/status-tag'
import { CapacityControl, LifecycleControls } from '@/features/dashboard/event-controls'
import { loadViewer, locateEvent } from '@/features/dashboard/organizer-data'
import { callApi } from '@/lib/api'
import { Link } from '@/i18n/link'
import { getI18n } from '@/i18n/server'
import { formatDateTime, formatSnapshot, shortId } from '@/lib/format'
import { readSession } from '@/lib/session'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.sheets.eventPanel }
}

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
    <section aria-label={title} className={`surface overflow-clip ${className}`}>
      <h2 className="label border-b border-rule px-5 py-3.5 font-mono font-medium text-ink-3">
        {title}
      </h2>
      <div className="p-5">{children}</div>
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

  const [session, { locale, t }] = await Promise.all([readSession(), getI18n()])

  if (!session || session.persona.kind !== 'organizer') {
    return (
      <main id="main">
        <section className="sheet-frame mt-16">
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
        <section className="sheet-frame mt-16">
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
      <div className="sheet-frame pt-10">
        <Link
          href="/dashboard"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-rule px-4 text-sm text-ink-2 transition-colors hover:border-[rgb(238_241_246/0.24)] hover:text-ink"
        >
          <span aria-hidden>←</span> {membership.organization.name}
        </Link>
      </div>
      <header className="sheet-frame mt-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <EventStatusTag status={event.status} />
            <span className="label text-ink-3">
              {t.dashboard.role(t.dashboard.roles[membership.role] ?? membership.role)}
            </span>
          </div>
          <h1 className="mt-4 text-[clamp(2rem,1.4rem+2.5vw,3.5rem)] leading-none">{event.name}</h1>
          <p className="mt-3 text-ink-2">
            {formatDateTime(event.startsAt, locale)} · {event.venue}
          </p>
        </div>
        {event.status !== 'DRAFT' ? (
          <Link
            href={`/events/${event.organization.slug}/${event.slug}`}
            className="min-h-11 text-sm underline hover:text-signal"
          >
            {t.panel.publicSheet} →
          </Link>
        ) : null}
      </header>

      <div className="sheet-frame mt-10 grid grid-cols-12 gap-4 md:gap-6">
        <Panel title={t.panel.inventory} className="col-span-12 lg:col-span-5">
          <p className="wide font-display text-6xl font-bold leading-none tracking-[-0.06em] tabular">
            {event.inventory.confirmed}
            <span className="text-2xl text-ink-3"> / {event.inventory.capacity}</span>
          </p>
          <div className="mt-4">
            <SeatMeter inventory={event.inventory} size="lg" />
          </div>
          <p className="mt-3 font-mono text-xs text-ink-2 tabular">
            {t.panel.inventoryLine(
              event.inventory.available,
              event.inventory.waitlisted,
              formatSnapshot(event.observedAt, locale),
            )}
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
          <Panel title={t.panel.lifecycle}>
            <LifecycleControls
              organizationId={organizationId}
              eventId={eventId}
              transitions={event.allowedTransitions}
            />
          </Panel>
          <Panel title={t.panel.integrity}>
            {check ? (
              <ul className="grid gap-2 text-sm sm:grid-cols-3">
                {[
                  { label: t.panel.integrityItems.withinCapacity, ok: check.withinCapacity },
                  { label: t.panel.integrityItems.projection, ok: check.projectionMatches },
                  { label: t.panel.integrityItems.idle, ok: check.noIdleSeatWhileQueued },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`font-mono ${item.ok ? 'text-confirmed' : 'text-rejected'}`}
                    >
                      {item.ok ? '✓' : '×'}
                    </span>
                    {item.label}
                    <span className="sr-only">{item.ok ? t.common.passes : t.common.fails}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-2">{t.panel.integrityUnavailable}</p>
            )}
            {check ? (
              <p className="mt-3 font-mono text-xs text-ink-3 tabular">
                {t.panel.integrityLine(
                  check.confirmedCount,
                  check.confirmedRows,
                  check.waitlistedRows,
                )}
              </p>
            ) : null}
          </Panel>
        </div>

        <Panel title={t.panel.registrations} className="col-span-12 lg:col-span-7">
          {!registrations.ok ? (
            <ApiFailure result={registrations} />
          ) : registrations.data.items.length === 0 ? (
            <p className="text-sm text-ink-2">{t.panel.nobody}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-rule">
                    <th scope="col" className="label py-2 pr-3 text-ink-3">
                      {t.panel.columns.participant}
                    </th>
                    <th scope="col" className="label py-2 pr-3 text-ink-3">
                      {t.panel.columns.status}
                    </th>
                    <th scope="col" className="label py-2 pr-3 text-right text-ink-3">
                      {t.panel.columns.registered}
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
                        {formatSnapshot(registration.createdAt, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title={t.panel.audit} className="col-span-12 lg:col-span-5">
          {!audit ? (
            <p className="text-sm text-ink-2">{t.panel.auditAdmins}</p>
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
                    {formatSnapshot(entry.createdAt, locale)}
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
    </main>
  )
}
