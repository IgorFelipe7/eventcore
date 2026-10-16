import { type Metadata } from 'next'
import Link from 'next/link'
import { Accent, SectionHeading, SheetBar, TitleBlock } from '@/components/sheet'
import { LabReport } from '@/features/lab/lab-report'
import { REPLAYS, findReplay, replayPasses } from '@/features/lab/replays'

export const metadata: Metadata = {
  title: 'Reliability Lab',
  description:
    'Recorded runs against PostgreSQL 18: the last seat, 100 people on 10 seats next to a naive baseline, retries, cancellations, capacity changes, tenant probes and a notification outage.',
}

const sheet = { number: 4, title: 'Reliability Lab' }

export default async function LabPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ scenario?: string; variant?: string }>
}) {
  const { scenario, variant: variantId } = await searchParams
  const replay = findReplay(scenario)
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
          mark="Sheet 04 · Test report"
          title={
            <>
              Recorded runs. Not a simulation, and not a <Accent>promise</Accent>.
            </>
          }
          lead={
            <p>
              Every number on this sheet was produced by <code>pnpm lab:record</code> against a real
              PostgreSQL 18 and the real API. The Lab only replays those files — it never sends
              traffic — and each report says exactly where and how it was measured.
            </p>
          }
        />
      </section>

      <div className="sheet-frame mt-12 grid grid-cols-12 gap-x-4 gap-y-8 md:gap-x-6">
        <nav aria-label="Scenarios" className="col-span-12 lg:col-span-3">
          <p className="label text-ink-3">Scenarios</p>
          <ol className="mt-3 flex gap-1 overflow-x-auto border-t border-ink pb-2 lg:block lg:overflow-visible lg:pb-0">
            {REPLAYS.map((candidate) => {
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
                      aria-label={passes ? 'invariants hold' : 'invariants broken'}
                      className={`font-mono text-xs ${active ? '' : passes ? 'text-confirmed' : 'text-rejected'}`}
                    >
                      {passes ? '✓' : '×'}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
          <p className="mt-4 hidden text-xs text-ink-3 lg:block">
            ✓ means every invariant check passed for EventCore in that recording. The naive baseline
            is shown for contrast and is expected to fail.
          </p>
        </nav>
        <div className="col-span-12 lg:col-span-9">
          <LabReport replay={replay} variant={variant} />
        </div>
      </div>
      <TitleBlock sheet={sheet} />
    </main>
  )
}
