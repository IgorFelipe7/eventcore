import { type Metadata } from 'next'
import { Marked, SectionHeading, SheetBar, TitleBlock } from '@/components/sheet'
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
  const sheet = { number: 4, title: t.sheets.lab }
  const replay = findReplayIn(scenario, locale)
  const variant =
    replay.variants.find((candidate) => candidate.id === variantId) ??
    replay.variants.find((candidate) => !candidate.safe) ??
    replay.variants[0]
  if (!variant) throw new Error(`Replay ${replay.id} has no variants.`)

  return (
    <main id="main">
      <SheetBar sheet={sheet} />
      <section className="sheet-frame mt-12">
        <SectionHeading
          mark={t.lab.mark}
          title={<Marked text={t.lab.title} />}
          lead={<p>{t.lab.lead}</p>}
        />
      </section>

      <div className="sheet-frame mt-12 grid grid-cols-12 gap-x-4 gap-y-8 md:gap-x-6">
        <nav aria-label={t.lab.scenarios} className="col-span-12 lg:col-span-3">
          <p className="label text-ink-3">{t.lab.scenarios}</p>
          <ol className="mt-3 flex gap-1 overflow-x-auto border-t border-ink pb-2 lg:block lg:overflow-visible lg:pb-0">
            {replaysIn(locale).map((candidate) => {
              const active = candidate.id === replay.id
              const passes = replayPasses(candidate)
              return (
                <li key={candidate.id} className="shrink-0 lg:border-b lg:border-rule">
                  <Link
                    href={`/lab?scenario=${candidate.id}`}
                    scroll={false}
                    aria-current={active ? 'page' : undefined}
                    className="grid min-h-11 grid-cols-[2rem_1fr_auto] items-center gap-x-2 px-2 py-2.5 text-sm hover:bg-sheet aria-[current=page]:bg-ink aria-[current=page]:text-paper"
                  >
                    <span className="font-mono text-xs opacity-70">
                      {String(candidate.order).padStart(2, '0')}
                    </span>
                    <span className="whitespace-nowrap lg:whitespace-normal">
                      {candidate.title}
                    </span>
                    <span
                      aria-label={passes ? t.lab.holds : t.lab.broken}
                      className={`font-mono text-xs ${active ? '' : passes ? 'text-confirmed' : 'text-rejected'}`}
                    >
                      {passes ? '✓' : '×'}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
          <p className="mt-4 hidden text-xs text-ink-3 lg:block">{t.lab.legend}</p>
        </nav>
        <div className="col-span-12 lg:col-span-9">
          <LabReport replay={replay} variant={variant} />
        </div>
      </div>
      <TitleBlock sheet={sheet} />
    </main>
  )
}
