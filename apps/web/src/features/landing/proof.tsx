import { Arrow, ButtonLink } from '@/components/button'
import { CountUp } from '@/components/count-up'
import { SectionHeading } from '@/components/section-heading'
import { replayPasses, replaysIn, rushReplay } from '@/features/lab/replays'
import { Link } from '@/i18n/link'
import { getI18n } from '@/i18n/server'
import { formatDateTime } from '@/lib/format'
import { type FieldCell, RequestField } from './request-field'

const rushVariants = () => {
  const rush = rushReplay()
  const naive = rush.variants.find((variant) => !variant.safe)
  const locked = rush.variants.find((variant) => variant.safe)
  if (!naive || !locked) throw new Error('The rush replay must contain both implementations.')
  return { rush, naive, locked }
}

export async function BaselineCallout() {
  const { t } = await getI18n()
  const { naive } = rushVariants()
  const { confirmedRows, capacity } = naive.final
  return (
    <Link
      href="/lab?scenario=rush&variant=naive"
      data-spotlight
      className="surface scale-in group relative mt-14 grid items-center gap-8 overflow-clip p-6 sm:p-10 lg:grid-cols-[auto_1fr_auto]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-rejected/20 blur-3xl"
      />
      <p className="wide relative font-display text-[clamp(5rem,3rem+7vw,9rem)] font-bold leading-[0.8] tracking-[-0.07em] text-rejected">
        <CountUp value={confirmedRows} />
        <span className="ml-2 text-[0.32em] tracking-[-0.03em] text-ink-3">/ {capacity}</span>
      </p>
      <div className="relative">
        <p className="max-w-xl text-lg text-ink">
          {t.landing.failures.baseline(confirmedRows, capacity)}
        </p>
        <div aria-hidden className="mt-6 flex flex-wrap gap-1">
          {Array.from({ length: confirmedRows }, (_, index) => (
            <span
              key={index}
              className={`size-2.5 rounded-[3px] ${index < capacity ? 'bg-ink/80' : 'bg-rejected/70 shadow-[0_0_8px_rgb(255_107_94/0.5)]'}`}
            />
          ))}
        </div>
      </div>
      <span className="relative inline-flex items-center gap-2 text-sm text-ink-2 transition-colors group-hover:text-ink">
        {t.landing.failures.baselineLink} <Arrow />
      </span>
    </Link>
  )
}

export async function ProofSection() {
  const { locale, t } = await getI18n()
  const copy = t.landing.proof
  const { rush, locked } = rushVariants()
  const violations = locked.checks.filter((check) => !check.passed).length
  const stats = [
    { label: copy.stats.requests, value: locked.attempts.length, tone: 'text-ink' },
    { label: copy.stats.seats, value: locked.final.capacity, tone: 'text-ink' },
    { label: copy.stats.confirmed, value: locked.final.confirmedRows, tone: 'text-confirmed' },
    { label: copy.stats.waitlisted, value: locked.final.waitlistedRows, tone: 'text-waitlisted' },
    { label: copy.stats.violations, value: violations, tone: 'text-ink' },
  ]
  const cells: FieldCell[] = [...locked.attempts]
    .filter((attempt) => attempt.decisionIndex !== null)
    .sort((first, second) => (first.decisionIndex ?? 0) - (second.decisionIndex ?? 0))
    .map((attempt) => ({
      order: attempt.decisionIndex ?? 0,
      confirmed: attempt.result.startsWith('CONFIRMED'),
      answeredMs: attempt.endMs,
      label: `#${attempt.decisionIndex} · ${attempt.actor} · ${attempt.result} · ${Math.round(attempt.endMs - attempt.startMs)} ms`,
    }))

  return (
    <section aria-labelledby="proof" className="sheet-frame mt-40">
      <SectionHeading
        id="proof"
        mark={copy.mark}
        title={copy.title}
        lead={<p>{copy.lead}</p>}
        dot="var(--color-confirmed)"
      />
      <dl className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`surface scale-in p-5 ${index === 0 ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            <dt className="label text-ink-3">{stat.label}</dt>
            <dd
              className={`wide mt-4 font-display text-[clamp(3rem,2rem+2.6vw,4.75rem)] font-bold leading-none tracking-[-0.06em] ${stat.tone}`}
            >
              <CountUp value={stat.value} />
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        <RequestField
          cells={cells}
          caption={copy.field}
          replayLabel={copy.replay}
          confirmedLabel={copy.confirmed}
          waitlistedLabel={copy.waitlisted}
        />
      </div>
      <p className="mt-4 font-mono text-xs leading-relaxed text-ink-3">
        {copy.recorded(
          formatDateTime(rush.environment.recordedAt, locale),
          rush.environment.commit,
          rush.environment.postgres,
          rush.environment.cpu,
        )}
        {locked.latency ? ` · ${copy.latency(locked.latency.p95)}` : ''}
      </p>

      <div className="mt-20 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="max-w-sm text-lg text-ink-2">{copy.scenarios}</p>
          <ButtonLink href="/lab" className="mt-6">
            {copy.cta} <Arrow />
          </ButtonLink>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
          {replaysIn(locale).map((replay) => (
            <li key={replay.id}>
              <Link
                href={`/lab?scenario=${replay.id}`}
                data-spotlight
                className="surface group flex min-h-16 items-center gap-4 px-5 py-4 text-sm transition-transform duration-300 ease-(--ease-out-expo) hover:-translate-y-0.5"
              >
                <span className="font-mono text-xs text-ink-3">
                  {String(replay.order).padStart(2, '0')}
                </span>
                <span className="flex-1 text-ink">{replay.title}</span>
                <span
                  className={`grid size-6 place-items-center rounded-full font-mono text-xs ${replayPasses(replay) ? 'bg-confirmed-wash text-confirmed' : 'bg-rejected-wash text-rejected'}`}
                >
                  {replayPasses(replay) ? '✓' : '×'}
                </span>
                <span
                  aria-hidden
                  className="text-ink-3 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-ink"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
