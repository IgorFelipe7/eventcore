import { type LabReplay, type LabVariant } from '@eventcore/contracts'
import { CodeBlock } from '@/components/code-block'
import { CropMarks } from '@/components/sheet'
import { EvidenceLink } from '@/features/landing/evidence-link'
import { type Dictionary } from '@/i18n/dictionaries'
import { Link } from '@/i18n/link'
import { getI18n } from '@/i18n/server'
import { formatDateTime } from '@/lib/format'
import { AttemptTimeline } from './attempt-timeline'
import { NIGHT_TEXT, toneOf } from './result-tone'
import { SeatOutcome } from './seat-outcome'

const pad = (value: number) => String(value).padStart(2, '0')

function VariantCard({
  replay,
  variant,
  active,
  t,
}: {
  readonly replay: LabReplay
  readonly variant: LabVariant
  readonly active: boolean
  readonly t: Dictionary
}) {
  const passed = variant.checks.every((check) => check.passed)
  return (
    <Link
      href={`/lab?scenario=${replay.id}&variant=${variant.id}`}
      scroll={false}
      aria-current={active ? 'true' : undefined}
      className={`block border p-4 transition-colors ${
        active ? 'border-ink bg-sheet' : 'border-rule hover:border-ink'
      } ${variant.safe ? '' : 'aria-[current=true]:border-rejected'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="label text-ink-3">{variant.label}</p>
        <span className={`font-mono text-xs ${passed ? 'text-confirmed' : 'text-rejected'}`}>
          {passed ? t.lab.holdsMark : t.lab.brokenMark}
        </span>
      </div>
      <p className="mt-2 font-display text-4xl font-semibold tabular">
        {variant.final.confirmedRows}
        <span className="text-xl text-ink-3"> {t.lab.seats(variant.final.capacity)}</span>
      </p>
      <p className="mt-2 text-sm text-ink-2">{variant.summary}</p>
    </Link>
  )
}

export async function LabReport({
  replay,
  variant,
}: {
  readonly replay: LabReplay
  readonly variant: LabVariant
}) {
  const { locale, t } = await getI18n()
  const { environment } = replay
  const small = variant.attempts.length <= 12

  return (
    <article aria-labelledby="report-title" className="relative border border-ink bg-paper">
      <CropMarks />
      <header className="grid gap-4 border-b border-ink p-5 sm:p-7">
        <p className="label text-ink-3">
          {t.lab.test(
            pad(replay.order),
            formatDateTime(environment.recordedAt, locale),
            environment.commit,
          )}
        </p>
        <h2 id="report-title" className="text-[clamp(1.75rem,1.3rem+1.8vw,2.75rem)] leading-[1.02]">
          {replay.title}
        </h2>
        <dl className="grid gap-4 md:grid-cols-2">
          <div>
            <dt className="label text-ink-3">{t.lab.question}</dt>
            <dd className="mt-1 text-lg text-ink">{replay.question}</dd>
          </div>
          <div>
            <dt className="label text-ink-3">{t.lab.method}</dt>
            <dd className="mt-1 text-ink-2">{replay.setup}</dd>
          </div>
        </dl>
      </header>

      {replay.variants.length > 1 ? (
        <section
          aria-label={t.lab.compare}
          className="grid gap-3 border-b border-ink p-5 sm:grid-cols-2 sm:p-7"
        >
          {replay.variants.map((candidate) => (
            <VariantCard
              key={candidate.id}
              replay={replay}
              variant={candidate}
              active={candidate.id === variant.id}
              t={t}
            />
          ))}
        </section>
      ) : null}

      <section
        aria-labelledby="result"
        className="grid gap-6 border-b border-ink p-5 sm:p-7 lg:grid-cols-[1fr_1fr]"
      >
        <div>
          <h3 id="result" className="label text-ink-3">
            {t.lab.result(variant.label)}
          </h3>
          <p className={`mt-2 text-xl ${variant.safe ? 'text-ink' : 'text-rejected'}`}>
            {variant.summary}
          </p>
          <div className="mt-5">
            <SeatOutcome variant={variant} />
          </div>
        </div>
        <div>
          <h3 className="label text-ink-3">{t.lab.checks}</h3>
          <ul className="mt-3 border-t border-rule">
            {variant.checks.map((check) => (
              <li
                key={check.id}
                className="grid grid-cols-[3.25rem_1.25rem_1fr] gap-x-2 border-b border-rule py-2.5 text-sm"
              >
                <span className="font-mono text-xs leading-5 text-ink-3">{check.id}</span>
                <span
                  aria-hidden
                  className={`font-mono ${check.passed ? 'text-confirmed' : 'text-rejected'}`}
                >
                  {check.passed ? '✓' : '×'}
                </span>
                <span>
                  <span className="text-ink">{check.label}</span>
                  <span className="sr-only">
                    {' · '}
                    {check.passed ? t.common.passes : t.common.fails}
                  </span>
                  <span className="block font-mono text-xs text-ink-3">{check.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="timeline"
        className="border-b border-ink bg-night p-5 text-night-ink sm:p-7"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 id="timeline" className="label text-night-ink">
            {t.lab.timeline(replay.order)}
          </h3>
          <span className="label rounded-xs border border-night-line px-1.5 py-0.5 text-night-muted">
            {t.common.figureKinds.measured}
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-night-muted">{t.lab.timelineNote}</p>
        <div className="mt-5">
          <AttemptTimeline
            key={`${replay.id}-${variant.id}`}
            attempts={variant.attempts}
            unsafe={!variant.safe}
          />
        </div>
        {small ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b border-night-line">
                  <th scope="col" className="label py-2 pr-3 text-night-muted">
                    {t.lab.columns.actor}
                  </th>
                  <th scope="col" className="label py-2 pr-3 text-right text-night-muted">
                    {t.lab.columns.sent}
                  </th>
                  <th scope="col" className="label py-2 pr-3 text-right text-night-muted">
                    {t.lab.columns.answered}
                  </th>
                  <th scope="col" className="label py-2 pr-3 text-night-muted">
                    {t.lab.columns.answer}
                  </th>
                  <th scope="col" className="label py-2 text-right text-night-muted">
                    {t.lab.columns.decision}
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {variant.attempts.map((attempt, index) => (
                  <tr
                    key={`${attempt.actor}-${index}`}
                    className="border-b border-night-line last:border-b-0"
                  >
                    <td className="py-2 pr-3 font-sans text-sm text-night-ink">{attempt.actor}</td>
                    <td className="py-2 pr-3 text-right tabular text-night-muted">
                      {attempt.startMs.toFixed(1)} ms
                    </td>
                    <td className="py-2 pr-3 text-right tabular text-night-muted">
                      {attempt.endMs.toFixed(1)} ms
                    </td>
                    <td
                      className={`py-2 pr-3 ${NIGHT_TEXT[toneOf(attempt.result, attempt.replayed)]}`}
                    >
                      {attempt.httpStatus ? `${attempt.httpStatus} · ` : ''}
                      {attempt.result}
                      {attempt.replayed ? ` · ${t.lab.replayed}` : ''}
                    </td>
                    <td className="py-2 text-right tabular text-night-ink">
                      {attempt.decisionIndex ? `#${attempt.decisionIndex}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section
        aria-labelledby="conditions"
        className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.2fr_1fr]"
      >
        <div>
          <h3 id="conditions" className="label text-ink-3">
            {t.lab.conditions}
          </h3>
          <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-x-4 gap-y-1.5 border-t border-rule pt-3 text-sm">
            {[
              [t.lab.environment.database, environment.postgres],
              [t.lab.environment.runtime, `Node.js ${environment.node}`],
              [t.lab.environment.machine, environment.cpu],
              [t.lab.environment.platform, environment.platform],
              [t.lab.environment.transport, environment.transport],
              [t.lab.environment.pool, t.lab.connections(environment.poolSize)],
              ...(variant.latency
                ? [
                    [
                      t.lab.environment.latency,
                      `p50 ${variant.latency.p50} ms · p95 ${variant.latency.p95} ms · p99 ${variant.latency.p99} ms · max ${variant.latency.max} ms (n=${variant.latency.samples})`,
                    ],
                  ]
                : []),
            ].map(([term, value]) => (
              <div key={term} className="contents">
                <dt className="font-mono text-xs leading-5 text-ink-3">{term}</dt>
                <dd className="text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="label mt-6 text-ink-3">{t.lab.doesNotProve}</h3>
          <ul className="mt-2 grid gap-1.5 text-sm text-ink-2">
            {replay.limits.map((limit) => (
              <li key={limit} className="grid grid-cols-[1rem_1fr]">
                <span aria-hidden className="text-ink-3">
                  –
                </span>
                {limit}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid content-start gap-3">
          <h3 className="label text-ink-3">{t.lab.reproduce}</h3>
          <CodeBlock
            language="shell"
            title={t.common.terminal}
            code={`pnpm db:up\npnpm vitest run ${replay.testFile}\npnpm lab:record`}
            wrap
          />
          <p className="text-sm text-ink-2">
            {t.lab.assertion} <EvidenceLink path={replay.testFile} />.
          </p>
        </div>
      </section>
    </article>
  )
}
