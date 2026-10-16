'use client'

import { type LabAttempt } from '@eventcore/contracts'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { NIGHT_FILL, NIGHT_TEXT, toneOf } from './result-tone'

const PLAYBACK_MS = 4_000

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const useReducedMotion = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )

export function AttemptTimeline({
  attempts,
  unsafe = false,
}: {
  readonly attempts: readonly LabAttempt[]
  readonly unsafe?: boolean
}) {
  const tone = (result: string, replayed: boolean) =>
    unsafe && result.startsWith('CONFIRMED') ? 'rejected' : toneOf(result, replayed)
  const sorted = useMemo(() => [...attempts].sort((a, b) => a.startMs - b.startMs), [attempts])
  const span = Math.max(1, ...sorted.map((attempt) => attempt.endMs))
  const [playhead, setPlayhead] = useState(span)
  const [playing, setPlaying] = useState(false)
  const frame = useRef<number | null>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!playing) return
    const startedAt = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / PLAYBACK_MS)
      setPlayhead(progress * span)
      if (progress < 1) frame.current = requestAnimationFrame(tick)
      else setPlaying(false)
    }
    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [playing, span])

  const rowHeight = sorted.length > 40 ? 5 : sorted.length > 12 ? 9 : 22
  const gap = sorted.length > 40 ? 1 : 3
  const height = sorted.length * (rowHeight + gap)
  const labelled = sorted.length <= 12
  const done = sorted.filter((attempt) => attempt.endMs <= playhead)
  const tally = done.reduce<Record<string, number>>((counts, attempt) => {
    const key = attempt.replayed ? 'REPLAYED' : attempt.result.replace(/ #\d+$/, '')
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(span * ratio))

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (reducedMotion) {
              setPlayhead(span)
              return
            }
            setPlayhead(0)
            setPlaying(true)
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-[2px] border border-night-ink bg-night-ink px-4 text-sm font-medium text-night hover:border-signal-glow hover:bg-signal-glow hover:text-white"
        >
          <span aria-hidden className="font-mono">
            ▶
          </span>
          Replay the run
        </button>
        <label className="flex min-w-0 flex-1 items-center gap-3">
          <span className="label shrink-0 text-night-muted">Scrub</span>
          <input
            type="range"
            min={0}
            max={span}
            step={span / 400}
            value={playhead}
            onChange={(event) => {
              setPlaying(false)
              setPlayhead(Number(event.target.value))
            }}
            aria-valuetext={`${playhead.toFixed(1)} milliseconds`}
            className="w-full accent-[var(--color-signal-glow)]"
          />
        </label>
        <span className="w-20 text-right font-mono text-sm tabular text-night-ink">
          {playhead.toFixed(0)} ms
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_12rem]">
        <div className="min-w-0">
          <div className="flex">
            {labelled ? <div className="w-36 shrink-0" /> : null}
            <div className="relative flex-1">
              <svg
                viewBox={`0 0 1000 ${height}`}
                preserveAspectRatio="none"
                className="block w-full"
                style={{ height }}
                role="img"
                aria-label={`${sorted.length} attempts over ${span.toFixed(0)} milliseconds`}
              >
                {ticks.map((tick) => (
                  <line
                    key={tick}
                    x1={(tick / span) * 1000}
                    x2={(tick / span) * 1000}
                    y1={0}
                    y2={height}
                    stroke="var(--color-night-line)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {sorted.map((attempt, index) => {
                  const finished = attempt.endMs <= playhead
                  const started = attempt.startMs <= playhead
                  const x = (attempt.startMs / span) * 1000
                  const end = Math.min(attempt.endMs, playhead)
                  const width = Math.max(2, ((end - attempt.startMs) / span) * 1000)
                  return started ? (
                    <rect
                      key={`${attempt.actor}-${index}`}
                      x={x}
                      y={index * (rowHeight + gap)}
                      width={width}
                      height={rowHeight}
                      fill={
                        finished
                          ? NIGHT_FILL[tone(attempt.result, attempt.replayed)]
                          : 'var(--color-night-faint)'
                      }
                      opacity={finished ? 1 : 0.35}
                    />
                  ) : null
                })}
                <line
                  x1={(playhead / span) * 1000}
                  x2={(playhead / span) * 1000}
                  y1={0}
                  y2={height}
                  stroke="var(--color-signal-glow)"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {labelled ? (
                <div className="pointer-events-none absolute inset-y-0 -left-36 w-36">
                  {sorted.map((attempt, index) => (
                    <p
                      key={`${attempt.actor}-label-${index}`}
                      className="absolute truncate pr-2 font-mono text-[0.7rem] leading-none text-night-muted"
                      style={{ top: index * (rowHeight + gap) + rowHeight / 2 - 5, width: '9rem' }}
                    >
                      {attempt.actor}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div
            className={`mt-2 flex justify-between font-mono text-[0.7rem] text-night-muted tabular ${labelled ? 'pl-36' : ''}`}
          >
            {ticks.map((tick) => (
              <span key={tick}>{tick} ms</span>
            ))}
          </div>
        </div>

        <div
          aria-live="polite"
          className="grid content-start gap-1.5 border-l border-night-line pl-4 font-mono text-xs"
        >
          <p className="label mb-1 text-night-muted">Answered so far</p>
          <dl className="grid gap-1.5">
            {Object.entries(tally).length === 0 ? (
              <div className="flex justify-between gap-3">
                <dt className="text-night-muted">Nothing yet</dt>
                <dd className="text-night-muted">—</dd>
              </div>
            ) : (
              Object.entries(tally).map(([result, count]) => (
                <div key={result} className="flex justify-between gap-3">
                  <dt className={NIGHT_TEXT[tone(result, result === 'REPLAYED')]}>{result}</dt>
                  <dd className="tabular text-night-ink">{count}</dd>
                </div>
              ))
            )}
            <div className="mt-2 flex justify-between gap-3 border-t border-night-line pt-2">
              <dt className="text-night-muted">In flight</dt>
              <dd className="tabular text-night-ink">
                {
                  sorted.filter(
                    (attempt) => attempt.startMs <= playhead && attempt.endMs > playhead,
                  ).length
                }
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
