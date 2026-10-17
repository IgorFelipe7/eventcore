import { Arrow, ButtonLink } from '@/components/button'
import { Marked, SectionHeading } from '@/components/sheet'
import { replayPasses, replaysIn, rushReplay } from '@/features/lab/replays'
import { Link } from '@/i18n/link'
import { getI18n } from '@/i18n/server'
import { formatDateTime } from '@/lib/format'

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
  return (
    <Link
      href="/lab?scenario=rush&variant=naive"
      className="group mt-10 grid grid-cols-12 items-center gap-x-4 gap-y-3 border border-rejected bg-rejected-wash/50 p-5 transition-colors hover:bg-rejected-wash md:gap-x-6"
    >
      <p className="col-span-12 font-display text-7xl font-semibold leading-none tracking-[-0.03em] text-rejected tabular md:col-span-3">
        {naive.final.confirmedRows}
        <span className="text-2xl tracking-normal"> / {naive.final.capacity}</span>
      </p>
      <p className="col-span-12 text-lg text-ink md:col-span-7">
        {t.landing.failures.baseline(naive.final.confirmedRows, naive.final.capacity)}
      </p>
      <p className="col-span-12 text-sm text-ink-2 group-hover:text-signal md:col-span-2 md:text-right">
        {t.landing.failures.baselineLink} <Arrow />
      </p>
    </Link>
  )
}

export async function ProofSection() {
  const { locale, t } = await getI18n()
  const copy = t.landing.proof
  const { rush, locked } = rushVariants()
  const violations = locked.checks.filter((check) => !check.passed).length
  const stats = [
    { label: copy.stats.requests, value: locked.attempts.length, tone: '' },
    { label: copy.stats.seats, value: locked.final.capacity, tone: '' },
    { label: copy.stats.confirmed, value: locked.final.confirmedRows, tone: '' },
    { label: copy.stats.waitlisted, value: locked.final.waitlistedRows, tone: '' },
    { label: copy.stats.violations, value: violations, tone: 'text-confirmed' },
  ]

  return (
    <section aria-labelledby="proof" className="sheet-frame mt-32">
      <SectionHeading
        id="proof"
        index="4"
        mark={copy.mark}
        title={<Marked text={copy.title} />}
        lead={<p>{copy.lead}</p>}
      />
      <dl className="mt-10 grid grid-cols-2 border-y border-ink sm:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="border-b border-rule px-1 py-5 sm:border-b-0 sm:border-r sm:px-4 sm:last:border-r-0"
          >
            <dt className="label text-ink-3">{stat.label}</dt>
            <dd
              className={`mt-2 font-display text-[clamp(2.75rem,2rem+2.4vw,4.5rem)] font-semibold leading-none tracking-[-0.035em] tabular ${stat.tone}`}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 font-mono text-xs text-ink-3">
        {copy.recorded(
          formatDateTime(rush.environment.recordedAt, locale),
          rush.environment.commit,
          rush.environment.postgres,
          rush.environment.cpu,
        )}
        {locked.latency ? ` · ${copy.latency(locked.latency.p95)}` : ''}
      </p>

      <div className="mt-12 grid grid-cols-12 gap-x-4 gap-y-6 md:gap-x-6">
        <ol className="col-span-12 grid gap-px border border-ink bg-ink sm:grid-cols-2 md:col-span-8">
          {replaysIn(locale).map((replay) => (
            <li key={replay.id} className="bg-sheet">
              <Link
                href={`/lab?scenario=${replay.id}`}
                className="grid min-h-14 grid-cols-[2rem_1fr_auto] items-center gap-x-3 px-4 py-3 text-sm hover:bg-paper hover:text-signal"
              >
                <span className="font-mono text-xs text-ink-3">
                  {String(replay.order).padStart(2, '0')}
                </span>
                <span>{replay.title}</span>
                <span
                  className={`font-mono ${replayPasses(replay) ? 'text-confirmed' : 'text-rejected'}`}
                >
                  {replayPasses(replay) ? '✓' : '×'}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="col-span-12 grid content-start gap-4 md:col-span-4">
          <p className="text-ink-2">{copy.scenarios}</p>
          <ButtonLink href="/lab">
            {copy.cta} <Arrow />
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
