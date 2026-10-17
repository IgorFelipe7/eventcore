import { Marked, SectionHeading, SheetBar, TitleBlock, ZoneRuler } from '@/components/sheet'
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
import { getI18n } from '@/i18n/server'

export default async function LandingPage() {
  const { t } = await getI18n()
  const copy = t.landing.fig1
  const sheet = { number: 1, title: t.sheets.landing }

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
              mark={copy.mark}
              title={<Marked text={copy.title} />}
              lead={<p>{copy.lead}</p>}
              stacked
            />
            <dl className="mt-12 grid grid-cols-3 border-t border-ink">
              {copy.facts.map((fact) => (
                <div
                  key={fact.unit}
                  className="border-r border-rule py-4 pr-3 last:border-r-0 [&:not(:first-child)]:pl-3"
                >
                  <dt className="label text-ink-3">{fact.unit}</dt>
                  <dd className="mt-1">
                    <span className="font-display text-6xl font-semibold leading-none tracking-[-0.04em] tabular">
                      {fact.value}
                    </span>
                    <span className="mt-2 block text-xs text-ink-2">{fact.detail}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="col-span-12 lg:col-span-7 lg:pl-6">
            <LastSeatFigure />
            <details className="group mt-3 border border-rule bg-sheet/60">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
                {copy.asText}
                <span aria-hidden className="font-mono transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <ol className="border-t border-rule px-4 py-3 text-sm text-ink-2">
                {LAST_SEAT_SEQUENCE.map((step, index) => (
                  <li key={step.tick} className="grid grid-cols-[2rem_1fr] py-1">
                    <span className="font-mono text-signal">{step.tick}</span>
                    <span>{t.fig1.captions[index]}</span>
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
