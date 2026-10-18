'use client'

import { useEffect, useRef, useState } from 'react'

export interface FieldCell {
  readonly order: number
  readonly confirmed: boolean
  readonly answeredMs: number
  readonly label: string
}

const PLAYBACK_MS = 2_600

type Phase = 'settled' | 'armed' | 'playing'

export function RequestField({
  cells,
  caption,
  replayLabel,
  confirmedLabel,
  waitlistedLabel,
}: {
  readonly cells: readonly FieldCell[]
  readonly caption: string
  readonly replayLabel: string
  readonly confirmedLabel: string
  readonly waitlistedLabel: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const clock = useRef<HTMLSpanElement>(null)
  const confirmedCount = useRef<HTMLSpanElement>(null)
  const waitlistedCount = useRef<HTMLSpanElement>(null)
  const [phase, setPhase] = useState<Phase>('settled')
  const [run, setRun] = useState(0)
  const span = Math.max(1, ...cells.map((cell) => cell.answeredMs))
  const totalConfirmed = cells.filter((cell) => cell.confirmed).length

  useEffect(() => {
    const element = host.current
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame: number | null = null
    const sorted = [...cells].sort((first, second) => first.answeredMs - second.answeredMs)

    const play = () => {
      setPhase('armed')
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          setPhase('playing')
          const started = performance.now()
          const tick = (now: number) => {
            const progress = Math.min(1, (now - started) / PLAYBACK_MS)
            const at = progress * span
            let confirmed = 0
            let answered = 0
            for (const cell of sorted) {
              if (cell.answeredMs > at) break
              answered += 1
              if (cell.confirmed) confirmed += 1
            }
            if (clock.current) clock.current.textContent = `${Math.round(at)} ms`
            if (confirmedCount.current) confirmedCount.current.textContent = String(confirmed)
            if (waitlistedCount.current) {
              waitlistedCount.current.textContent = String(answered - confirmed)
            }
            if (progress < 1) frame = requestAnimationFrame(tick)
          }
          frame = requestAnimationFrame(tick)
        })
      })
    }

    if (run > 0) {
      play()
      return () => {
        if (frame !== null) cancelAnimationFrame(frame)
      }
    }
    if (element.getBoundingClientRect().top < window.innerHeight * 0.9) return
    frame = requestAnimationFrame(() => setPhase('armed'))
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        play()
      },
      { rootMargin: '0px 0px -25% 0px' },
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [run, span, cells])

  return (
    <div ref={host} className="surface overflow-clip p-5 sm:p-7" data-phase={phase}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-sm text-ink-2">{caption}</p>
        <button
          type="button"
          onClick={() => setRun((value) => value + 1)}
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-rule px-4 text-sm text-ink transition-colors hover:border-signal hover:text-signal"
        >
          <span aria-hidden>↻</span>
          {replayLabel}
        </button>
      </div>
      <div
        role="img"
        aria-label={`${totalConfirmed} ${confirmedLabel}, ${cells.length - totalConfirmed} ${waitlistedLabel}`}
        className="group mt-8 grid grid-cols-10 gap-1.5 sm:grid-cols-25 lg:grid-cols-50 lg:gap-1"
        data-phase={phase}
      >
        {cells.map((cell) => (
          <span
            key={cell.order}
            title={cell.label}
            style={{
              transitionDelay:
                phase === 'playing'
                  ? `${Math.round((cell.answeredMs / span) * PLAYBACK_MS)}ms`
                  : '0ms',
            }}
            className={`aspect-square rounded-[30%] border transition-[background-color,border-color,box-shadow,transform] duration-500 ease-out-expo group-data-[phase=armed]:scale-90 group-data-[phase=armed]:border-rule group-data-[phase=armed]:bg-transparent group-data-[phase=armed]:shadow-none group-data-[phase=armed]:duration-0 ${
              cell.confirmed
                ? 'border-confirmed bg-confirmed shadow-[0_0_18px_rgb(61_214_140/0.55)]'
                : 'border-waitlisted/50 bg-waitlisted/25'
            }`}
          />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 font-mono text-sm tabular">
        <span className="flex items-center gap-2 text-ink">
          <span
            aria-hidden
            className="size-2.5 rounded-full bg-confirmed shadow-[0_0_10px_var(--color-confirmed)]"
          />
          <span ref={confirmedCount}>{totalConfirmed}</span> {confirmedLabel}
        </span>
        <span className="flex items-center gap-2 text-ink">
          <span aria-hidden className="size-2.5 rounded-full bg-waitlisted/60" />
          <span ref={waitlistedCount}>{cells.length - totalConfirmed}</span> {waitlistedLabel}
        </span>
        <span ref={clock} className="ml-auto text-ink-3">
          {Math.round(span)} ms
        </span>
      </div>
    </div>
  )
}
