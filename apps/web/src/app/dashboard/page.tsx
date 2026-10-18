import { type Metadata } from 'next'
import { ApiFailure } from '@/components/api-state'
import { ButtonLink } from '@/components/button'
import { PersonaRequired } from '@/components/persona-required'
import { SeatMeter } from '@/components/seat-meter'
import { PageIntro } from '@/components/section-heading'
import { EventStatusTag } from '@/components/status-tag'
import { loadOrganizationEvents, loadViewer } from '@/features/dashboard/organizer-data'
import { Link } from '@/i18n/link'
import { getI18n } from '@/i18n/server'
import { formatDateTime } from '@/lib/format'
import { readSession } from '@/lib/session'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.sheets.dashboard }
}

const personaName = (displayName: string) => displayName.split(' (')[0] ?? displayName

export default async function DashboardPage() {
  const [session, { locale, t }] = await Promise.all([readSession(), getI18n()])
  const viewer = session?.persona.kind === 'organizer' ? await loadViewer(session.token) : null
  const organizations =
    session && viewer?.ok
      ? await Promise.all(
          viewer.data.memberships.map(async (membership) => ({
            membership,
            events: await loadOrganizationEvents(session.token, membership.organization.id),
          })),
        )
      : []

  return (
    <main id="main">
      <PageIntro
        mark={
          session
            ? t.persona.actingAsName(personaName(session.persona.displayName))
            : t.dashboard.mark
        }
        title={t.dashboard.title}
        lead={<p>{t.dashboard.lead}</p>}
      />
      <section className="sheet-frame">
        <div className="grid gap-16">
          {!session || session.persona.kind !== 'organizer' ? (
            <PersonaRequired kind="organizer" />
          ) : !viewer?.ok ? (
            viewer ? (
              <ApiFailure result={viewer} />
            ) : null
          ) : (
            organizations.map(({ membership, events }) => (
              <section
                key={membership.organization.id}
                aria-labelledby={membership.organization.id}
              >
                <header className="flex flex-wrap items-end justify-between gap-4 pb-5">
                  <div>
                    <p className="label text-ink-3">
                      {t.dashboard.role(t.dashboard.roles[membership.role] ?? membership.role)}
                    </p>
                    <h2
                      id={membership.organization.id}
                      className="mt-2 text-4xl tracking-[-0.04em]"
                    >
                      {membership.organization.name}
                    </h2>
                  </div>
                  <ButtonLink
                    href={`/dashboard/events/new?organization=${membership.organization.id}`}
                    variant="secondary"
                  >
                    {t.dashboard.newDraft}
                  </ButtonLink>
                </header>
                {!events.ok ? (
                  <div className="mt-4">
                    <ApiFailure result={events} />
                  </div>
                ) : (
                  <ol className="grid gap-3">
                    {events.data.items.map((event) => (
                      <li key={event.id}>
                        <Link
                          href={`/dashboard/events/${event.id}`}
                          data-spotlight
                          className="surface group grid grid-cols-12 items-center gap-x-6 gap-y-3 px-6 py-5 transition-transform duration-300 hover:-translate-y-0.5"
                        >
                          <div className="col-span-12 md:col-span-5">
                            <p className="text-lg font-semibold tracking-[-0.02em] transition-colors group-hover:text-signal">
                              {event.name}
                            </p>
                            <p className="text-sm text-ink-2">
                              {formatDateTime(event.startsAt, locale)}
                            </p>
                          </div>
                          <div className="col-span-8 md:col-span-5">
                            <SeatMeter inventory={event.inventory} />
                            <p className="mt-1.5 font-mono text-xs text-ink-2 tabular">
                              {t.dashboard.meter(
                                event.inventory.confirmed,
                                event.inventory.capacity,
                                event.inventory.waitlisted,
                              )}
                            </p>
                          </div>
                          <div className="col-span-4 flex justify-end md:col-span-2">
                            <EventStatusTag status={event.status} />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
