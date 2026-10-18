import { rushReplay } from '@/features/lab/replays'
import { Link } from '@/i18n/link'
import { getI18n } from '@/i18n/server'

const toneOf = (result: string) =>
  result.startsWith('CONFIRMED') ? 'text-confirmed' : 'text-waitlisted'

export async function LedgerTape() {
  const { t } = await getI18n()
  const replay = rushReplay()
  const locked = replay.variants.find((variant) => variant.safe)
  if (!locked) return null
  const decisions = [...locked.attempts]
    .filter((attempt) => attempt.decisionIndex !== null)
    .sort((a, b) => (a.decisionIndex ?? 0) - (b.decisionIndex ?? 0))
    .slice(0, 40)

  const tape = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center gap-3 pr-3 font-mono text-[0.72rem] tracking-[0.02em]"
    >
      {decisions.map((attempt) => (
        <li
          key={`${hidden ? 'copy' : 'tape'}-${attempt.actor}`}
          className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-rule bg-[rgb(238_241_246/0.025)] px-3.5 py-1.5"
        >
          <span className="text-ink-3">#{String(attempt.decisionIndex).padStart(3, '0')}</span>
          <span className="text-ink">{attempt.actor}</span>
          <span className={toneOf(attempt.result)}>{attempt.result}</span>
          <span className="text-ink-3 tabular">
            {Math.round(attempt.endMs - attempt.startMs)} ms
          </span>
        </li>
      ))}
    </ul>
  )

  return (
    <section
      aria-label={t.ledger.label}
      className="relative overflow-x-clip border-y border-rule bg-paper py-4"
    >
      <div className="flex items-center">
        <Link
          href="/lab?scenario=rush&variant=locked"
          className="relative z-10 ml-3 flex shrink-0 items-center gap-2.5 rounded-full border border-signal/30 bg-signal-wash px-4 py-2 font-mono text-[0.7rem] text-signal transition-colors hover:border-signal sm:ml-6"
        >
          <span aria-hidden className="relative flex size-2">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-signal" />
            <span className="relative size-2 rounded-full bg-signal" />
          </span>
          {t.ledger.replay}
          <span className="hidden text-ink-3 sm:inline">
            {t.ledger.commit(replay.environment.commit)}
          </span>
        </Link>
        <div className="group relative flex min-w-0 flex-1 overflow-clip mask-[linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="flex animate-ledger group-hover:[animation-play-state:paused] motion-reduce:animate-none">
            {tape(false)}
            {tape(true)}
          </div>
        </div>
      </div>
      <p className="sr-only">{t.ledger.description(decisions.length)}</p>
    </section>
  )
}
