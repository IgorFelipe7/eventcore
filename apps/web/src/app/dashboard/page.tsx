import { type Metadata } from 'next'
import Link from 'next/link'
import { ApiFailure } from '@/components/api-state'
import { ButtonLink } from '@/components/button'
import { PersonaRequired } from '@/components/persona-required'
import { SeatMeter } from '@/components/seat-meter'
import { SectionHeading, SheetBar, TitleBlock } from '@/components/sheet'
import { EventStatusTag } from '@/components/status-tag'
import { loadOrganizationEvents, loadViewer } from '@/features/dashboard/organizer-data'
import { formatDateTime } from '@/lib/format'
import { readSession } from '@/lib/session'

export const metadata: Metadata = { title: 'Organizer dashboard' }

const sheet = { number: 5, title: 'Organizer dashboard' }

export default async function DashboardPage() {
  const session = await readSession()
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
      <SheetBar sheet={sheet} />
      <section className="sheet-frame mt-12">
        <SectionHeading
          mark={session ? `Acting as ${session.persona.displayName}` : 'Organizer'}
          title="Only the organizations you belong to. Nothing else exists."
          lead={
            <p>
              Every request below carries your token, and the API resolves your role for the
              organization in the path before it reads anything.
            </p>
          }
        />

        <div className="mt-10 grid gap-14">
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
                <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-3">
                  <div>
                    <p className="label text-ink-3">Your role · {membership.role}</p>
                    <h2
                      id={membership.organization.id}
                      className="mt-1 font-display text-3xl font-semibold"
                    >
                      {membership.organization.name}
                    </h2>
                  </div>
                  <ButtonLink
                    href={`/dashboard/events/new?organization=${membership.organization.id}`}
                    variant="secondary"
                  >
                    New draft event
                  </ButtonLink>
                </header>
                {!events.ok ? (
                  <div className="mt-4">
                    <ApiFailure result={events} />
                  </div>
                ) : (
                  <ol>
                    {events.data.items.map((event) => (
                      <li key={event.id} className="border-b border-rule">
                        <Link
                          href={`/dashboard/events/${event.id}`}
                          className="group grid grid-cols-12 items-center gap-x-4 gap-y-3 py-4 hover:bg-sheet md:gap-x-6"
                        >
                          <div className="col-span-12 md:col-span-5">
                            <p className="font-display text-lg font-semibold group-hover:text-signal">
                              {event.name}
                            </p>
                            <p className="text-sm text-ink-2">{formatDateTime(event.startsAt)}</p>
                          </div>
                          <div className="col-span-8 md:col-span-5">
                            <SeatMeter inventory={event.inventory} />
                            <p className="mt-1.5 font-mono text-xs text-ink-2 tabular">
                              {event.inventory.confirmed}/{event.inventory.capacity} confirmed ·{' '}
                              {event.inventory.waitlisted} waiting
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
      <TitleBlock sheet={sheet} />
    </main>
  )
}
