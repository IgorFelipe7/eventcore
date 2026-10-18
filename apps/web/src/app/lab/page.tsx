import { type Metadata } from 'next'
import { PageIntro } from '@/components/section-heading'
import { LabReport } from '@/features/lab/lab-report'
import { findReplayIn, replayPasses, replaysIn } from '@/features/lab/replays'
import { Link } from '@/i18n/link'
import { getI18n } from '@/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.sheets.lab, description: t.lab.metaDescription }
}

export default async function LabPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ scenario?: string; variant?: string }>
}) {
  const [{ scenario, variant: variantId }, { locale, t }] = await Promise.all([
    searchParams,
    getI18n(),
  ])
  const replay = findReplayIn(scenario, locale)
  const variant =
    replay.variants.find((candidate) => candidate.id === variantId) ??
    replay.variants.find((candidate) => !candidate.safe) ??
    replay.variants[0]
  if (!variant) throw new Error(`Replay ${replay.id} has no variants.`)

  return (
    <main id="main">
      <PageIntro mark={t.lab.mark} title={t.lab.title} lead={<p>{t.lab.lead}</p>} />

      <div className="sheet-frame grid grid-cols-12 gap-x-6 gap-y-8">
        <nav aria-label={t.lab.scenarios} className="col-span-12 min-w-0 lg:col-span-3">
          <div className="lg:sticky lg:top-28">
            <p className="label text-ink-3">{t.lab.scenarios}</p>
            <ol className="mt-4 flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] lg:grid lg:overflow-visible lg:pb-0">
              {replaysIn(locale).map((candidate) => {
                const active = candidate.id === replay.id
                const passes = replayPasses(candidate)
                return (
                  <li key={candidate.id} className="shrink-0">
                    <Link
                      href={`/lab?scenario=${candidate.id}`}
                      scroll={false}
                      aria-current={active ? 'page' : undefined}
                      className="grid min-h-11 grid-cols-[2rem_1fr_auto] items-center gap-x-2 rounded-2xl border border-transparent px-3 py-2.5 text-sm text-ink-2 transition-colors hover:bg-[rgb(238_241_246/0.05)] hover:text-ink aria-[current=page]:border-signal/40 aria-[current=page]:bg-signal-wash aria-[current=page]:text-ink"
                    >
                      <span className="font-mono text-xs opacity-70">
                        {String(candidate.order).padStart(2, '0')}
                      </span>
                      <span className="whitespace-nowrap lg:whitespace-normal">
                        {candidate.title}
                      </span>
                      <span
                        aria-label={passes ? t.lab.holds : t.lab.broken}
                        className={`grid size-5 place-items-center rounded-full font-mono text-[0.65rem] ${passes ? 'bg-confirmed-wash text-confirmed' : 'bg-rejected-wash text-rejected'}`}
                      >
                        {passes ? '✓' : '×'}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ol>
            <p className="mt-5 hidden text-xs leading-relaxed text-ink-3 lg:block">
              {t.lab.legend}
            </p>
          </div>
        </nav>
        <div className="col-span-12 min-w-0 lg:col-span-9">
          <LabReport replay={replay} variant={variant} />
        </div>
      </div>
    </main>
  )
}
