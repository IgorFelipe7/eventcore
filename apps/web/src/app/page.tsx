import { Arrow, ButtonLink } from '@/components/button'
import { SheetBar, TitleBlock, ZoneRuler } from '@/components/sheet'
import { LastSeatFigure } from '@/features/landing/last-seat-figure'
import { LAST_SEAT_SEQUENCE } from '@/features/landing/last-seat-sequence'
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
      <SheetBar sheet={sheet} />

      <section aria-labelledby="hero" className="sheet-frame pt-6">
        <ZoneRuler className="hidden md:grid" />
        <div className="mt-8 grid grid-cols-12 gap-x-4 gap-y-12 md:gap-x-6 lg:mt-14">
          <div className="col-span-12 lg:col-span-5">
            <p className="label text-ink-3">Reservations under contention</p>
            <h1
              id="hero"
              className="mt-5 text-[clamp(2.5rem,1.4rem+3.6vw,4.75rem)] leading-[0.95] tracking-[-0.02em]"
            >
              Two requests. One seat. <span className="text-signal">Exactly one</span> confirmation.
            </h1>
            <p className="measure mt-7 text-lg text-ink-2">
              EventCore is a reservation engine for events with limited seats. Every decision is
              serialized on a single database row, so capacity holds under concurrent load, retries
              never book twice and the waitlist keeps its order.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/lab">
                Open the Reliability Lab <Arrow />
              </ButtonLink>
              <ButtonLink href="#fig-1" variant="secondary">
                Run Fig. 1
              </ButtonLink>
            </div>
            <dl className="mt-12 grid grid-cols-3 border-t border-ink">
              {FACTS.map((fact) => (
                <div
                  key={fact.unit}
                  className="border-r border-rule py-4 pr-3 last:border-r-0 [&:not(:first-child)]:pl-3"
                >
                  <dt className="label text-ink-3">{fact.unit}</dt>
                  <dd className="mt-1">
                    <span className="font-display text-4xl font-semibold tabular">
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
