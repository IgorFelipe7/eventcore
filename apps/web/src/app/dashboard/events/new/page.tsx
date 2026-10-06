import { hasPermission } from '@eventcore/domain'
import { type Metadata } from 'next'
import { ApiFailure } from '@/components/api-state'
import { PersonaRequired } from '@/components/persona-required'
import { SectionHeading, SheetBar, TitleBlock } from '@/components/sheet'
import { NewEventForm } from '@/features/dashboard/new-event-form'
import { loadViewer } from '@/features/dashboard/organizer-data'
import { readSession } from '@/lib/session'

export const metadata: Metadata = { title: 'New event' }

const sheet = { number: 5, title: 'New draft event' }

const OFFSET = '-03:00'
const DAY_MS = 86_400_000

const localValue = (epochMs: number) => new Date(epochMs - 3 * 3_600_000).toISOString().slice(0, 16)

const defaultSchedule = () => {
  const now = Date.now()
  return {
    offset: OFFSET,
    zoneLabel: 'Times in UTC−03:00',
    opens: localValue(now),
    closes: localValue(now + 13 * DAY_MS),
    starts: localValue(now + 14 * DAY_MS),
  }
}

export default async function NewEventPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ organization?: string }>
}) {
  const [{ organization }, session] = await Promise.all([searchParams, readSession()])
  const viewer = session?.persona.kind === 'organizer' ? await loadViewer(session.token) : null
  const memberships = viewer?.ok
    ? viewer.data.memberships.filter((membership) => hasPermission(membership.role, 'event:create'))
    : []

  return (
    <main id="main">
      <SheetBar sheet={sheet} />
      <section className="sheet-frame mt-12 grid grid-cols-12 gap-x-4 gap-y-10 md:gap-x-6">
        <div className="col-span-12 lg:col-span-4">
          <SectionHeading mark="Draft" title="Define the seats before anyone can take one." />
        </div>
        <div className="col-span-12 lg:col-span-8">
          {!session || session.persona.kind !== 'organizer' ? (
            <PersonaRequired kind="organizer" />
          ) : !viewer?.ok ? (
            viewer ? (
              <ApiFailure result={viewer} />
            ) : null
          ) : (
            <NewEventForm
              memberships={memberships}
              defaultOrganizationId={organization}
              schedule={defaultSchedule()}
            />
          )}
        </div>
      </section>
      <TitleBlock sheet={sheet} />
    </main>
  )
}
