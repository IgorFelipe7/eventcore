import { hasPermission } from '@eventcore/domain'
import { type Metadata } from 'next'
import { ApiFailure } from '@/components/api-state'
import { PersonaRequired } from '@/components/persona-required'
import { SectionHeading } from '@/components/section-heading'
import { NewEventForm } from '@/features/dashboard/new-event-form'
import { loadViewer } from '@/features/dashboard/organizer-data'
import { getI18n } from '@/i18n/server'
import { readSession } from '@/lib/session'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.sheets.newEvent }
}

const OFFSET = '-03:00'
const DAY_MS = 86_400_000

const localValue = (epochMs: number) => new Date(epochMs - 3 * 3_600_000).toISOString().slice(0, 16)

const defaultSchedule = (zoneLabel: string) => {
  const now = Date.now()
  return {
    offset: OFFSET,
    zoneLabel,
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
  const [{ organization }, session, { t }] = await Promise.all([
    searchParams,
    readSession(),
    getI18n(),
  ])
  const viewer = session?.persona.kind === 'organizer' ? await loadViewer(session.token) : null
  const memberships = viewer?.ok
    ? viewer.data.memberships.filter((membership) => hasPermission(membership.role, 'event:create'))
    : []

  return (
    <main id="main">
      <section className="sheet-frame mt-16 grid grid-cols-12 gap-x-6 gap-y-10">
        <div className="col-span-12 lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <SectionHeading as="h1" mark={t.newEvent.mark} title={t.newEvent.title} />
          </div>
        </div>
        <div className="surface col-span-12 p-6 sm:p-8 lg:col-span-7">
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
              schedule={defaultSchedule(t.newEvent.zone)}
            />
          )}
        </div>
      </section>
    </main>
  )
}
