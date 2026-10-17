import { EventListResponseSchema, type PublicEvent } from '@eventcore/contracts'
import { type Metadata } from 'next'
import { ApiFailure } from '@/components/api-state'
import { SeatMeter } from '@/components/seat-meter'
import { SectionHeading, SheetBar, TitleBlock } from '@/components/sheet'
import { EventStatusTag } from '@/components/status-tag'
import { callApi } from '@/lib/api'
import { type Dictionary } from '@/i18n/dictionaries'
import { Link } from '@/i18n/link'
import { getI18n } from '@/i18n/server'
import { formatClock, formatDayMonth, formatSnapshot } from '@/lib/format'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.sheets.board, description: t.board.metaDescription }
}

const FILTERS = [
  { value: undefined, key: 'all' },
  { value: 'PUBLISHED', key: 'open' },
  { value: 'CLOSED', key: 'closed' },
] as const

type Filter = (typeof FILTERS)[number]['value']

const availabilityText = (event: PublicEvent, t: Dictionary) => {
  const { available, waitlisted } = event.inventory
  if (event.status !== 'PUBLISHED') return '—'
  if (available > 0) return t.board.left(available)
  return event.waitlistEnabled ? t.board.fullWaiting(waitlisted) : t.board.full
}

export default async function ExplorePage({
  searchParams,
}: {
  readonly searchParams: Promise<{ status?: string }>
}) {
  const [{ status }, { locale, t }] = await Promise.all([searchParams, getI18n()])
  const sheet = { number: 2, title: t.sheets.board }
  const filter: Filter = status === 'PUBLISHED' || status === 'CLOSED' ? status : undefined
  const result = await callApi(`/v1/events?limit=50${filter ? `&status=${filter}` : ''}`, {
    schema: EventListResponseSchema,
  })

  return (
    <main id="main">
      <SheetBar sheet={sheet} />
      <section className="sheet-frame mt-12">
        <SectionHeading mark={t.board.mark} title={t.board.title} lead={<p>{t.board.lead}</p>} />

        <nav aria-label={t.board.filters.label} className="mt-10 flex gap-1 border-b border-ink">
          {FILTERS.map((option) => {
            const active = option.value === filter
            return (
              <Link
                key={option.key}
                href={option.value ? `/explore?status=${option.value}` : '/explore'}
                aria-current={active ? 'page' : undefined}
                className="-mb-px flex min-h-11 items-center border border-transparent px-4 text-sm aria-[current=page]:border-ink aria-[current=page]:border-b-paper aria-[current=page]:bg-paper aria-[current=page]:font-medium hover:text-signal"
              >
                {t.board.filters[option.key]}
              </Link>
            )
          })}
        </nav>

        {!result.ok ? (
          <div className="mt-8">
            <ApiFailure result={result} />
          </div>
        ) : result.data.items.length === 0 ? (
          <p className="mt-8 text-ink-2">{t.board.empty}</p>
        ) : (
          <>
            <ol className="mt-2">
              {result.data.items.map((event) => (
                <li key={event.id} className="border-b border-rule">
                  <Link
                    href={`/events/${event.organization.slug}/${event.slug}`}
                    className="group grid grid-cols-12 items-center gap-x-4 gap-y-3 py-5 hover:bg-sheet md:gap-x-6"
                  >
                    <div className="col-span-3 font-mono md:col-span-1">
                      <p className="text-sm font-medium text-ink">
                        {formatDayMonth(event.startsAt, locale)}
                      </p>
                      <p className="text-xs text-ink-3 tabular">
                        {formatClock(event.startsAt, locale)}
                      </p>
                    </div>
                    <div className="col-span-9 md:col-span-5">
                      <p className="font-display text-xl font-semibold group-hover:text-signal">
                        {event.name}
                      </p>
                      <p className="text-sm text-ink-2">
                        {event.organization.name} · {event.venue}
                      </p>
                    </div>
                    <div className="col-span-8 md:col-span-4">
                      <SeatMeter inventory={event.inventory} />
                      <p className="mt-1.5 font-mono text-xs text-ink-2 tabular">
                        {event.inventory.confirmed}/{event.inventory.capacity} ·{' '}
                        {availabilityText(event, t)}
                      </p>
                    </div>
                    <div className="col-span-4 flex justify-end md:col-span-2">
                      <EventStatusTag status={event.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
            <p className="label mt-4 text-ink-3">
              {t.board.snapshot}{' '}
              {formatSnapshot(result.data.items[0]?.observedAt ?? new Date().toISOString(), locale)}
            </p>
          </>
        )}
      </section>
      <TitleBlock sheet={sheet} />
    </main>
  )
}
