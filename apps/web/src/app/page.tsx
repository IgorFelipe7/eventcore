import { CountUp } from '@/components/count-up'
import { SectionHeading } from '@/components/section-heading'
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

  return (
    <main id="main">
      <HallHero />
      <LedgerTape />

      <section aria-labelledby="statements" className="sheet-frame mt-32">
        <div className="grid grid-cols-12 gap-x-6 gap-y-14">
          <div className="col-span-12 lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <SectionHeading
                id="statements"
                mark={copy.mark}
                title={copy.title}
                lead={<p>{copy.lead}</p>}
              />
              <dl className="mt-10 grid grid-cols-3 gap-3">
                {copy.facts.map((fact) => (
                  <div key={fact.unit} className="surface scale-in p-4">
                    <dt className="label text-ink-3">{fact.unit}</dt>
                    <dd className="mt-3">
                      <CountUp
                        value={Number(fact.value)}
                        className="wide block font-display text-5xl font-bold leading-none tracking-[-0.06em]"
                      />
                      <span className="mt-3 block text-xs leading-relaxed text-ink-2">
                        {fact.detail}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div className="scale-in">
              <LastSeatFigure />
            </div>
            <details className="surface-quiet group mt-3">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-[inherit] px-5 text-sm text-ink-2 transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
                {copy.asText}
                <span
                  aria-hidden
                  className="grid size-6 place-items-center rounded-full border border-rule font-mono transition-transform duration-300 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <ol className="border-t border-rule px-5 py-4 text-sm text-ink-2">
                {LAST_SEAT_SEQUENCE.map((step, index) => (
                  <li key={step.tick} className="grid grid-cols-[2rem_1fr] py-1.5">
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
    </main>
  )
}
