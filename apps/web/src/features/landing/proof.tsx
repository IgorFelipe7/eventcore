import Link from 'next/link'
import { Arrow, ButtonLink } from '@/components/button'
import { SectionHeading } from '@/components/sheet'
import { REPLAYS, replayPasses, rushReplay } from '@/features/lab/replays'
import { formatDateTime } from '@/lib/format'

const rushVariants = () => {
  const rush = rushReplay()
  const naive = rush.variants.find((variant) => !variant.safe)
  const locked = rush.variants.find((variant) => variant.safe)
  if (!naive || !locked) throw new Error('The rush replay must contain both implementations.')
  return { rush, naive, locked }
}

export function BaselineCallout() {
  const { naive } = rushVariants()
  return (
    <Link
      href="/lab?scenario=rush&variant=naive"
      className="group mt-10 grid grid-cols-12 items-center gap-x-4 gap-y-3 border border-rejected bg-rejected-wash/50 p-5 hover:bg-rejected-wash md:gap-x-6"
    >
      <p className="col-span-12 font-display text-6xl font-semibold text-rejected tabular md:col-span-3">
        {naive.final.confirmedRows}
        <span className="text-2xl"> / {naive.final.capacity}</span>
      </p>
      <p className="col-span-12 text-lg text-ink md:col-span-7">
        Recorded, not imagined: a check-then-insert implementation confirmed{' '}
        <strong className="font-semibold">
          {naive.final.confirmedRows} people for {naive.final.capacity} seats
        </strong>{' '}
        when 100 requests arrived together on a real PostgreSQL 18.
      </p>
      <p className="col-span-12 text-sm text-ink-2 group-hover:text-signal md:col-span-2 md:text-right">
        Lab, test 02 <Arrow />
      </p>
    </Link>
  )
}

export function ProofSection() {
  const { rush, locked } = rushVariants()
  const violations = locked.checks.filter((check) => !check.passed).length
  const stats = [
    { label: 'Concurrent requests', value: String(locked.attempts.length) },
    { label: 'Seats', value: String(locked.final.capacity) },
    { label: 'Confirmed', value: String(locked.final.confirmedRows) },
    { label: 'Waitlisted, in order', value: String(locked.final.waitlistedRows) },
    { label: 'Invariant violations', value: String(violations) },
  ]

  return (
    <section aria-labelledby="proof" className="sheet-frame mt-32">
      <SectionHeading
        id="proof"
        mark="§4 · Proof, recorded"
        title="Same load, same database. Exactly ten."
        lead={
          <p>
            The Lab replays runs recorded against PostgreSQL 18 through the real API. These figures
            are read from those files at build time — nothing here is typed in by hand.
          </p>
        }
      />
      <dl className="mt-10 grid grid-cols-2 border-y border-ink sm:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="border-b border-rule px-1 py-5 sm:border-b-0 sm:border-r sm:px-4 sm:last:border-r-0"
          >
            <dt className="label text-ink-3">{stat.label}</dt>
            <dd
              className={`mt-2 font-display text-5xl font-semibold tabular ${stat.label === 'Invariant violations' ? 'text-confirmed' : ''}`}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 font-mono text-xs text-ink-3">
        Recorded {formatDateTime(rush.environment.recordedAt)} · commit {rush.environment.commit} ·{' '}
        {rush.environment.postgres} · {rush.environment.cpu} ·{' '}
        {locked.latency
          ? `caller-observed p95 ${locked.latency.p95} ms with all 100 queued on one row lock`
          : ''}
      </p>

      <div className="mt-12 grid grid-cols-12 gap-x-4 gap-y-6 md:gap-x-6">
        <ol className="col-span-12 grid gap-px border border-ink bg-ink sm:grid-cols-2 md:col-span-8">
          {REPLAYS.map((replay) => (
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
          <p className="text-ink-2">
            Eight scenarios, each tied to the test that asserts it, each with the machine, database
            version and commit it was measured on.
          </p>
          <ButtonLink href="/lab">
            Open the Reliability Lab <Arrow />
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
