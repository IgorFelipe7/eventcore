'use client'

import { useCallback, useEffect, useReducer, useRef, useSyncExternalStore } from 'react'
import { CodeBlock } from '@/components/code-block'
import { CropMarks } from '@/components/drawing-marks'
import { useI18n } from '@/i18n/provider'
import {
  CAPACITY,
  LAST_SEAT_SEQUENCE,
  type LaneId,
  type LanePosition,
  type SequenceStep,
} from './last-seat-sequence'

const STEP_INTERVAL_MS = 1_700
const LAST_STEP = LAST_SEAT_SEQUENCE.length - 1

interface PlaybackState {
  readonly step: number
  readonly playing: boolean
}

type PlaybackAction =
  | { readonly type: 'play' }
  | { readonly type: 'pause' }
  | { readonly type: 'tick' }
  | { readonly type: 'go'; readonly step: number }

const playback = (state: PlaybackState, action: PlaybackAction): PlaybackState => {
  switch (action.type) {
    case 'play':
      return { step: state.step >= LAST_STEP ? 0 : state.step, playing: true }
    case 'pause':
      return { ...state, playing: false }
    case 'tick':
      return state.step >= LAST_STEP
        ? { step: LAST_STEP, playing: false }
        : { step: state.step + 1, playing: state.step + 1 < LAST_STEP }
    case 'go':
      return { step: Math.max(0, Math.min(LAST_STEP, action.step)), playing: false }
  }
}

const subscribeToMotionPreference = (onChange: () => void) => {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const usePrefersReducedMotion = () =>
  useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )

const LANE_OFFSET: Record<LanePosition, string> = {
  arriving: '0%',
  waiting: '32%',
  holding: '46%',
  done: '100%',
}

const LANE_SHIFT: Record<LanePosition, string> = {
  arriving: '0%',
  waiting: '-100%',
  holding: '-50%',
  done: '-100%',
}

const REQUEST_LABEL: Record<LaneId, string> = { A: 'req 7f3c', B: 'req 91ad' }

function Lane({ id, step }: { readonly id: LaneId; readonly step: SequenceStep }) {
  const { t } = useI18n()
  const position = step.lanes[id]
  const holding = step.lock === id
  const outcome = step.outcomes[id]
  return (
    <div className="relative h-14">
      <div
        aria-hidden
        className="absolute inset-x-0 top-1/2 border-t border-dashed border-ink-3/50"
      />
      <div
        className="absolute top-1/2 transition-[left,transform] duration-700 ease-(--ease-sheet)"
        style={{
          left: LANE_OFFSET[position],
          transform: `translate(${LANE_SHIFT[position]}, -50%)`,
        }}
      >
        <div
          className={`flex items-center gap-2 whitespace-nowrap rounded-xs border px-2.5 py-1.5 font-mono text-xs transition-colors duration-300 ${
            holding
              ? 'border-signal bg-signal text-white'
              : outcome
                ? 'border-ink bg-ink text-paper'
                : position === 'waiting'
                  ? 'border-waitlisted bg-waitlisted-wash text-waitlisted'
                  : 'border-ink bg-sheet text-ink'
          }`}
        >
          {position === 'waiting' ? (
            <span
              aria-hidden
              className="h-3 w-4 bg-[repeating-linear-gradient(135deg,currentColor_0_1.5px,transparent_1.5px_4px)]"
            />
          ) : null}
          <span className="font-medium">{id}</span>
          <span
            className={holding || outcome || position === 'waiting' ? 'opacity-85' : 'text-ink-3'}
          >
            {outcome ?? (position === 'waiting' ? t.fig1.waitingForLock : REQUEST_LABEL[id])}
          </span>
        </div>
      </div>
    </div>
  )
}

function SeatPlan({ step }: { readonly step: SequenceStep }) {
  const { t } = useI18n()
  const lastSeatTaken = step.confirmed >= CAPACITY
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="label text-ink-3">{t.fig1.seatPlan(CAPACITY)}</p>
        <p className="font-mono text-sm tabular text-ink" aria-live="off">
          <span className="font-medium">{step.confirmed}</span>
          <span className="text-ink-3"> {t.fig1.confirmed(CAPACITY)}</span>
        </p>
      </div>
      <div
        role="img"
        aria-label={t.fig1.seatsConfirmed(step.confirmed, CAPACITY)}
        className="mt-3 grid grid-cols-12 gap-1"
      >
        {Array.from({ length: CAPACITY }, (_, index) => {
          const isLast = index === CAPACITY - 1
          return (
            <span
              key={index}
              className={`relative aspect-square rounded-[1px] border transition-colors duration-500 ${
                !isLast
                  ? 'border-ink bg-ink'
                  : lastSeatTaken
                    ? 'border-ink bg-ink'
                    : 'border-signal bg-signal'
              }`}
            >
              {isLast ? (
                <span
                  className={`absolute inset-0 grid place-items-center font-mono text-[0.625rem] font-medium ${lastSeatTaken ? 'text-paper' : 'text-white'}`}
                >
                  {lastSeatTaken ? 'A' : '24'}
                </span>
              ) : null}
            </span>
          )
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 font-mono text-xs text-ink-2">
        <span className="label text-ink-3">{t.fig1.waitlist}</span>
        {step.queue.length === 0 ? (
          <span className="text-ink-3">{t.fig1.empty}</span>
        ) : (
          step.queue.map((lane, index) => (
            <span
              key={lane}
              className="rounded-xs border border-waitlisted bg-waitlisted-wash px-1.5 py-0.5 text-waitlisted"
            >
              #{index + 1} · {lane}
            </span>
          ))
        )}
      </div>
    </div>
  )
}

function LockBox({ step }: { readonly step: SequenceStep }) {
  const { t } = useI18n()
  return (
    <div
      className={`absolute inset-y-0 left-[46%] w-[26%] -translate-x-1/2 border-x transition-colors duration-300 ${
        step.lock ? 'border-signal bg-signal-wash/70' : 'border-ink-3/50 bg-transparent'
      }`}
    >
      <p
        className={`label absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap ${step.lock ? 'text-signal' : 'text-ink-3'}`}
      >
        {t.fig1.row} {step.lock ? t.fig1.heldBy(step.lock) : t.fig1.free}
      </p>
    </div>
  )
}

export function LastSeatFigure() {
  const { t } = useI18n()
  const [state, dispatch] = useReducer(playback, { step: 0, playing: false })
  const reducedMotion = usePrefersReducedMotion()
  const timer = useRef<number | null>(null)
  const step = LAST_SEAT_SEQUENCE[state.step] ?? LAST_SEAT_SEQUENCE[0]
  if (!step) throw new Error('The sequence is empty.')

  useEffect(() => {
    if (!state.playing) return
    timer.current = window.setTimeout(
      () => dispatch({ type: 'tick' }),
      reducedMotion ? 400 : STEP_INTERVAL_MS,
    )
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [state.playing, state.step, reducedMotion])

  const run = useCallback(() => {
    if (reducedMotion) dispatch({ type: 'go', step: LAST_STEP })
    else dispatch({ type: state.playing ? 'pause' : 'play' })
  }, [reducedMotion, state.playing])

  const runLabel = state.playing
    ? t.fig1.pause
    : state.step >= LAST_STEP
      ? t.fig1.runAgain
      : t.fig1.run

  return (
    <figure
      id="fig-1"
      aria-labelledby="fig-1-caption"
      className="relative border border-ink bg-sheet"
    >
      <CropMarks />
      <div className="grid gap-6 p-4 sm:p-6">
        <SeatPlan step={step} />

        <div className="relative pt-9">
          <LockBox step={step} />
          <div className="relative grid gap-1">
            <Lane id="A" step={step} />
            <Lane id="B" step={step} />
          </div>
        </div>

        <div aria-live="polite" className="min-h-[4.5rem]">
          <p className="text-[0.95rem] text-ink">
            <span className="mr-2 font-mono font-medium text-signal">{step.tick}</span>
            {t.fig1.captions[state.step]}
          </p>
        </div>

        <CodeBlock code={step.statement} language="sql" title={t.fig1.statementTitle} wrap />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={run}
            className="inline-flex min-h-11 items-center gap-2 rounded-xs border border-ink bg-ink px-4 text-sm font-medium text-paper transition-colors hover:border-signal hover:bg-signal"
          >
            <span aria-hidden className="font-mono">
              {state.playing ? '❚❚' : '▶'}
            </span>
            {runLabel}
          </button>
          <div className="flex">
            <button
              type="button"
              onClick={() => dispatch({ type: 'go', step: state.step - 1 })}
              disabled={state.step === 0}
              aria-label={t.fig1.previous}
              className="grid min-h-11 min-w-11 place-items-center border border-ink font-mono text-sm hover:bg-ink hover:text-paper disabled:border-rule disabled:text-ink-3 disabled:hover:bg-transparent"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'go', step: state.step + 1 })}
              disabled={state.step === LAST_STEP}
              aria-label={t.fig1.next}
              className="-ml-px grid min-h-11 min-w-11 place-items-center border border-ink font-mono text-sm hover:bg-ink hover:text-paper disabled:border-rule disabled:text-ink-3 disabled:hover:bg-transparent"
            >
              →
            </button>
          </div>
          <ol aria-label={t.fig1.steps} className="ml-auto flex items-center">
            {LAST_SEAT_SEQUENCE.map((entry, index) => (
              <li key={entry.tick} className="flex items-center">
                {index > 0 ? (
                  <span
                    aria-hidden
                    className={`h-px w-3 sm:w-5 ${index <= state.step ? 'bg-signal' : 'bg-ink-3/50'}`}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'go', step: index })}
                  aria-label={t.fig1.stepLabel(entry.tick, index, t.fig1.captions[index] ?? '')}
                  aria-current={index === state.step ? 'step' : undefined}
                  className={`grid size-8 place-items-center rounded-full border font-mono text-[0.7rem] transition-colors ${
                    index === state.step
                      ? 'border-signal bg-signal text-white'
                      : index < state.step
                        ? 'border-signal text-signal'
                        : 'border-ink-3/60 text-ink-3'
                  }`}
                >
                  {entry.tick}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <figcaption id="fig-1-caption" className="border-t border-ink px-4 py-3 sm:px-6">
        <span className="label mr-3 text-ink">{t.common.figure} 1</span>
        <span className="label mr-3 rounded-xs border border-ink-3/50 px-1.5 py-0.5 text-ink-3">
          {t.common.figureKinds.illustrative}
        </span>
        <span className="text-sm text-ink-2">{t.fig1.caption}</span>
      </figcaption>
    </figure>
  )
}
