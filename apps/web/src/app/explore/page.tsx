import { EventListResponseSchema, type PublicEvent } from '@eventcore/contracts'
import { type Metadata } from 'next'
import { ApiFailure } from '@/components/api-state'
import { SeatMeter } from '@/components/seat-meter'
import { PageIntro } from '@/components/section-heading'
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
  const filter: Filter = status === 'PUBLISHED' || status === 'CLOSED' ? status : undefined
  const result = await callApi(`/v1/events?limit=50${filter ? `&status=${filter}` : ''}`, {
    schema: EventListResponseSchema,
  })

  return (
    <main id="main">
      <PageIntro mark={t.board.mark} title={t.board.title} lead={<p>{t.board.lead}</p>}>
        <nav
          aria-label={t.board.filters.label}
          className="mt-10 inline-flex rounded-full border border-rule bg-[rgb(238_241_246/0.03)] p-1"
        >
          {FILTERS.map((option) => {
            const active = option.value === filter
            return (
              <Link
                key={option.key}
                href={option.value ? `/explore?status=${option.value}` : '/explore'}
                aria-current={active ? 'page' : undefined}
                className="flex min-h-10 items-center rounded-full px-5 text-sm text-ink-2 transition-colors hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:font-medium aria-[current=page]:text-paper"
              >
                {t.board.filters[option.key]}
              </Link>
            )
          })}
        </nav>
      </PageIntro>

      <section className="sheet-frame">
        {!result.ok ? (
          <ApiFailure result={result} />
        ) : result.data.items.length === 0 ? (
          <p className="text-ink-2">{t.board.empty}</p>
        ) : (
          <>
            <ol className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
              {result.data.items.map((event) => (
                <li key={event.id} className="scale-in">
                  <Link
                    href={`/events/${event.organization.slug}/${event.slug}`}
                    data-spotlight
                    className="surface group flex h-full flex-col gap-6 p-6 transition-transform duration-500 ease-out-expo hover:-translate-y-1 sm:p-7"
                  >
                    <div className="flex items-start gap-5">
                      <div className="grid w-16 shrink-0 place-items-center rounded-2xl border border-rule bg-[rgb(238_241_246/0.03)] py-2.5 text-center">
                        <span className="label text-ink-3">
                          {formatDayMonth(event.startsAt, locale).split(' ')[1]}
                        </span>
                        <span className="wide font-display text-3xl font-bold leading-none tracking-[-0.05em]">
                          {formatDayMonth(event.startsAt, locale).split(' ')[0]}
                        </span>
                        <span className="mt-1 font-mono text-[0.65rem] text-ink-3 tabular">
                          {formatClock(event.startsAt, locale)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <p className="text-2xl font-semibold leading-tight tracking-[-0.03em] font-stretch-108%">
                            {event.name}
                          </p>
                          <EventStatusTag status={event.status} />
                        </div>
                        <p className="mt-2 text-sm text-ink-3">
                          {event.organization.name} · {event.venue}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <SeatMeter inventory={event.inventory} />
                      <div className="mt-3 flex items-center justify-between font-mono text-xs text-ink-2 tabular">
                        <span>
                          {event.inventory.confirmed}/{event.inventory.capacity} ·{' '}
                          {availabilityText(event, t)}
                        </span>
                        <span
                          aria-hidden
                          className="text-ink-3 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-ink"
                        >
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
            <p className="label mt-6 flex items-center gap-2 text-ink-3">
              <span aria-hidden className="relative flex size-2">
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-confirmed" />
                <span className="relative size-2 rounded-full bg-confirmed" />
              </span>
              {t.board.snapshot}{' '}
              {formatSnapshot(result.data.items[0]?.observedAt ?? new Date().toISOString(), locale)}
            </p>
          </>
        )}
      </section>
    </main>
  )
}
