import { SectionHeading, SheetBar, TitleBlock, ZoneRuler } from '@/components/sheet'
import { HallHero } from '@/features/landing/hall/hall-hero'
import { LastSeatFigure } from '@/features/landing/last-seat-figure'
import { LAST_SEAT_SEQUENCE } from '@/features/landing/last-seat-sequence'
import { LedgerTape } from '@/features/landing/ledger-tape'
import { BaselineCallout, ProofSection } from '@/features/landing/proof'
import {
  AnatomySection,
  FailureSection,
  InvariantSection,
  LimitsSection,
  VerifySection,
} from '@/features/landing/sections'

const sheet = { number: 1, title: 'The last seat' }

const FACTS = [
  { value: '1', unit: 'row lock', detail: 'serializes every decision for an event' },
  { value: '0', unit: 'mocks', detail: 'where a database guarantee is claimed' },
  { value: '8', unit: 'invariants', detail: 'each with an enforcing layer and a test' },
]

export default function LandingPage() {
  return (
    <main id="main">
      <HallHero />
      <LedgerTape />
      <SheetBar sheet={sheet} />

      <section aria-labelledby="statements" className="sheet-frame pt-6">
        <ZoneRuler className="hidden md:grid" />
        <div className="mt-12 grid grid-cols-12 gap-x-4 gap-y-12 md:gap-x-6 lg:mt-16">
          <div className="col-span-12 lg:col-span-5">
            <SectionHeading
              id="statements"
              mark="Fig. 1 · Lights on"
              title="The race you just watched, statement by statement."
              lead={
                <p>
                  Same two requests, same seat — now as the SQL that decides it. Step through it at
                  your own pace; every statement shown is one the code really runs.
                </p>
              }
              stacked
            />
            <dl className="mt-12 grid grid-cols-3 border-t border-ink">
              {FACTS.map((fact) => (
                <div
                  key={fact.unit}
                  className="border-r border-rule py-4 pr-3 last:border-r-0 [&:not(:first-child)]:pl-3"
                >
                  <dt className="label text-ink-3">{fact.unit}</dt>
                  <dd className="mt-1">
                    <span className="font-display text-5xl font-semibold tracking-[-0.03em] tabular">
                      {fact.value}
                    </span>
                    <span className="mt-1 block text-xs text-ink-2">{fact.detail}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="col-span-12 lg:col-span-7 lg:pl-6">
            <LastSeatFigure />
            <details className="group mt-3 border border-rule bg-sheet/60">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
                Read Fig. 1 as text
                <span aria-hidden className="font-mono transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <ol className="border-t border-rule px-4 py-3 text-sm text-ink-2">
                {LAST_SEAT_SEQUENCE.map((step) => (
                  <li key={step.tick} className="grid grid-cols-[2rem_1fr] py-1">
                    <span className="font-mono text-signal">{step.tick}</span>
                    <span>{step.caption}</span>
                  </li>
                ))}
              </ol>
            </details>
          </div>
        </div>
      </section>

      <FailureSection baseline={<BaselineCallout />} />
      <InvariantSection />
      <AnatomySection />
      <ProofSection />
      <LimitsSection />
      <VerifySection />
      <TitleBlock sheet={sheet} />
    </main>
  )
}
