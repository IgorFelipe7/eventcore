import { rushReplay } from '@/features/lab/replays'
import { Link } from '@/i18n/link'
import { getI18n } from '@/i18n/server'

const toneOf = (result: string) =>
  result.startsWith('CONFIRMED') ? 'text-confirmed-glow' : 'text-waitlisted-glow'

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
      className="flex shrink-0 items-center gap-8 pr-8 font-mono text-[0.72rem] uppercase tracking-[0.1em]"
    >
      {decisions.map((attempt) => (
        <li
          key={`${hidden ? 'copy' : 'tape'}-${attempt.actor}`}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <span className="text-night-muted">
            #{String(attempt.decisionIndex).padStart(3, '0')}
          </span>
          <span className="text-night-ink">{attempt.actor}</span>
          <span className={toneOf(attempt.result)}>{attempt.result}</span>
          <span className="text-night-muted tabular">
            {Math.round(attempt.endMs - attempt.startMs)} ms
          </span>
        </li>
      ))}
    </ul>
  )

  return (
    <section
      aria-label={t.ledger.label}
      className="relative border-y border-night-line bg-night text-night-ink"
    >
      <div className="flex items-stretch">
        <Link
          href="/lab?scenario=rush&variant=locked"
          className="relative z-10 flex shrink-0 flex-col justify-center gap-0.5 border-r border-night-line bg-night px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-night-muted hover:text-signal-glow sm:px-6"
        >
          <span className="text-signal-glow">● {t.ledger.replay}</span>
          <span>{t.ledger.commit(replay.environment.commit)}</span>
        </Link>
        <div className="group relative flex overflow-hidden py-3.5 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
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
