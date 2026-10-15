'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  BEATS,
  CAPACITY,
  type Point3,
  beatAt,
  cameraRig,
  contestedLabel,
  contestedSeat,
  momentAt,
  projectPoint,
  queueSlot,
} from './hall-layout'
import { HallDrawing } from './hall-drawing'
import { HallPoster } from './hall-poster'
import { type HallFrame, type HallScene, type ScreenAnchor } from './hall-scene'

type CalloutId = keyof HallFrame

const mix = (night: string, paper: string) =>
  `color-mix(in oklab, var(${night}), var(${paper}) calc(var(--lights, 0) * 100%))`

const HALL_TONES = {
  '--hall-bg': mix('--color-night', '--color-paper'),
  '--hall-fg': mix('--color-night-ink', '--color-ink'),
  '--hall-muted': mix('--color-night-muted', '--color-ink-3'),
  '--hall-faint': mix('--color-night-faint', '--color-ink-3'),
  '--hall-line': mix('--color-night-line', '--color-rule'),
  '--hall-accent': mix('--color-signal-glow', '--color-signal'),
  backgroundColor: 'var(--hall-bg)',
} as React.CSSProperties

const subscribeToMotion = (onChange: () => void) => {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const useReducedMotion = () =>
  useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )

let webglSupport: boolean | undefined

const supportsWebGL = () => {
  if (webglSupport !== undefined) return webglSupport
  try {
    const probe = document.createElement('canvas')
    webglSupport = Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'))
  } catch {
    webglSupport = false
  }
  return webglSupport
}

const subscribeToNothing = () => () => undefined

const useWebGL = () => useSyncExternalStore(subscribeToNothing, supportsWebGL, () => false)

const staticAnchors = (width: number, height: number): HallFrame => {
  const rig = cameraRig(width / height)
  const seat = contestedSeat()
  const at = (point: Point3): ScreenAnchor => ({
    ...projectPoint(point, rig, width, height),
    visible: true,
  })
  return {
    seat: at({ x: seat.x, y: seat.y + 0.93, z: seat.z }),
    a: { x: 0, y: 0, visible: false },
    b: at(queueSlot()),
    queue: at(queueSlot()),
  }
}

function Callout({
  id,
  register,
  tone,
  reach = 44,
  compact = false,
  children,
}: {
  readonly id: CalloutId
  readonly register: (id: CalloutId, element: HTMLDivElement | null) => void
  readonly tone: 'signal' | 'waiting' | 'confirmed' | 'neutral'
  readonly reach?: number
  readonly compact?: boolean
  readonly children: React.ReactNode
}) {
  const color = {
    signal: 'text-signal-glow border-signal-glow/60',
    waiting: 'text-waitlisted-glow border-waitlisted-glow/60',
    confirmed: 'text-confirmed-glow border-confirmed-glow/60',
    neutral: 'text-night-ink border-night-line',
  }[tone]
  const stroke = {
    signal: 'var(--color-signal-glow)',
    waiting: 'var(--color-waitlisted-glow)',
    confirmed: 'var(--color-confirmed-glow)',
    neutral: 'var(--color-night-muted)',
  }[tone]
  const run = Math.round(reach * 0.7)
  return (
    <div
      ref={(element) => register(id, element)}
      data-side="right"
      className={`group pointer-events-none absolute left-0 top-0 opacity-0 transition-opacity duration-300 will-change-transform ${compact ? '' : 'max-sm:hidden'}`}
    >
      <svg
        width={run + 18}
        height={reach}
        className="absolute left-0 group-data-[side=left]:-scale-x-100"
        style={{ top: -reach, transformOrigin: 'left center' }}
        aria-hidden
      >
        <circle cx="3" cy={reach - 3} r="3" fill={stroke} />
        <polyline
          points={`3,${reach - 3} ${run},6 ${run + 18},6`}
          fill="none"
          stroke={stroke}
          strokeWidth="1"
        />
      </svg>
      <div
        className={`absolute left-[var(--run)] whitespace-nowrap border bg-night/80 px-2.5 py-1.5 font-mono text-[0.68rem] uppercase leading-tight tracking-[0.12em] group-data-[side=left]:left-auto group-data-[side=left]:right-[var(--run)] ${color}`}
        style={{ top: -reach - 10, ['--run' as string]: `${run + 18}px` }}
      >
        {children}
      </div>
    </div>
  )
}

export function HallHero() {
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const callouts = useRef(new Map<CalloutId, HTMLDivElement>())
  const ruler = useRef<HTMLDivElement>(null)
  const scene = useRef<HallScene | null>(null)
  const [progress, setProgress] = useState(0)
  const [sceneReady, setSceneReady] = useState(false)
  const reducedMotion = useReducedMotion()
  const webgl = useWebGL()
  const interactive = webgl && !reducedMotion

  const register = (id: CalloutId, element: HTMLDivElement | null) => {
    if (element) callouts.current.set(id, element)
    else callouts.current.delete(id)
  }

  const placeCallouts = (frame: HallFrame) => {
    const width = stage.current?.clientWidth ?? window.innerWidth
    for (const [id, element] of callouts.current) {
      const anchor = frame[id]
      element.style.transform = `translate3d(${anchor.x}px, ${anchor.y}px, 0)`
      element.style.opacity = anchor.visible ? '1' : '0'
      const relative =
        id === 'seat'
          ? anchor.x < width * 0.45
            ? 'right'
            : 'left'
          : anchor.x > width * 0.8
            ? 'left'
            : 'right'
      if (element.dataset['side'] !== relative) element.dataset['side'] = relative
    }
  }

  useEffect(() => {
    const host = stage.current
    if (!host) return

    if (!interactive) {
      const layout = () => placeCallouts(staticAnchors(host.clientWidth, host.clientHeight))
      layout()
      window.addEventListener('resize', layout)
      return () => window.removeEventListener('resize', layout)
    }

    let disposed = false
    let lastProgress = -1
    let visible = true

    const readScroll = () => {
      const element = section.current
      if (!element) return 0
      const rect = element.getBoundingClientRect()
      const travel = rect.height - window.innerHeight
      return travel <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / travel))
    }

    const onScroll = () => {
      const value = readScroll()
      scene.current?.setProgress(value)
      if (ruler.current) ruler.current.style.transform = `scaleY(${value})`
      const lights = Math.min(1, Math.max(0, (value - 0.9) / 0.1))
      section.current?.style.setProperty('--lights', lights.toFixed(3))
      document.documentElement.dataset['scene'] = lights < 0.5 ? 'night' : 'paper'
      const rounded = Math.round(value * 100) / 100
      if (rounded !== lastProgress) {
        lastProgress = rounded
        setProgress(rounded)
      }
    }

    const onPointer = (event: PointerEvent) => {
      scene.current?.setPointer(
        (event.clientX / window.innerWidth) * 2 - 1,
        (event.clientY / window.innerHeight) * 2 - 1,
      )
    }

    const resize = () => scene.current?.resize(host.clientWidth, host.clientHeight)
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting)
      if (visible) scene.current?.start()
      else scene.current?.stop()
    })

    import('./hall-scene').then(({ HallScene }) => {
      if (disposed || !canvas.current) return
      scene.current = new HallScene(canvas.current, placeCallouts)
      resize()
      onScroll()
      scene.current.renderOnce(readScroll())
      if (visible) scene.current.start()
      setSceneReady(true)
    })

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    if (section.current) observer.observe(section.current)

    return () => {
      disposed = true
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      observer.disconnect()
      scene.current?.dispose()
      scene.current = null
      delete document.documentElement.dataset['scene']
    }
  }, [interactive])

  const shown = interactive ? progress : 1
  const beat = beatAt(shown)
  const moment = momentAt(shown)

  return (
    <section
      ref={section}
      aria-labelledby="hero"
      data-interactive={interactive ? 'true' : 'false'}
      className="hall relative -mt-16 h-dvh data-[interactive=true]:h-[240vh]"
    >
      <div ref={stage} className="sticky top-0 h-dvh overflow-hidden" style={HALL_TONES}>
        <HallPoster
          final={!interactive}
          className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${sceneReady ? 'opacity-0' : 'opacity-100'}`}
        />
        <canvas
          ref={canvas}
          aria-hidden
          className="absolute inset-0 h-full w-full transition-opacity duration-700"
          style={{ opacity: sceneReady ? 'calc(1 - var(--lights, 0))' : 0 }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_10%,transparent_40%,rgb(7_9_12/0.75)_100%)]"
          style={{ opacity: 'calc(1 - var(--lights, 0))' }}
        />

        <HallDrawing host={stage} />

        <div className="absolute inset-0" style={{ opacity: 'calc(1 - var(--lights, 0))' }}>
          <Callout
            id="seat"
            register={register}
            tone={moment.a === 'confirmed' ? 'confirmed' : 'signal'}
          >
            <span className="block">{contestedLabel()}</span>
            <span className="block text-night-muted max-sm:hidden">
              capacity {CAPACITY} · confirmed {moment.confirmed}
              {moment.lockHolder ? ` · lock: ${moment.lockHolder}` : ' · lock: free'}
            </span>
          </Callout>
          <Callout id="a" register={register} tone="signal">
            {moment.a === 'arriving' ? 'A · req 7f3c' : 'A · holds the lock'}
          </Callout>
          <Callout
            id="b"
            register={register}
            tone={moment.b === 'arriving' ? 'neutral' : 'waiting'}
          >
            {moment.b === 'arriving'
              ? 'B · req 91ad'
              : moment.b === 'waiting'
                ? 'B · waiting for lock'
                : moment.b === 'holding'
                  ? 'B · re-reads 24 / 24'
                  : 'B · 201 waitlisted #1'}
          </Callout>
        </div>

        <div className="sheet-frame relative flex h-full flex-col pb-8 pt-36 text-[var(--hall-fg)] md:pt-28">
          <div className="flex items-start justify-between gap-6 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--hall-muted)]">
            <p>
              {shown >= 0.95 ? '// Sheet 01 · lights on' : '// Sheet 01 · night'}
              <span className="block text-[var(--hall-muted)]">
                EventCore · reservations under contention
              </span>
            </p>
            <p className="hidden text-right sm:block">
              {'////// Recorded, not imagined'}
              <span className="block text-[var(--hall-muted)]">Every figure links to its test</span>
            </p>
          </div>

          <div className="mt-8 sm:mt-12">
            <h1 id="hero" className="max-w-[9.5em] text-hero font-display font-semibold">
              Two requests. One seat.
              <br />
              <span className="text-[var(--hall-muted)]">Exactly </span>
              <span className="font-accent text-[1.06em] font-normal italic tracking-[-0.01em] text-[var(--hall-accent)]">
                one
              </span>
              <span className="text-[var(--hall-muted)]"> confirmation.</span>
            </h1>
          </div>
          <p className="mt-6 max-w-md text-base text-[var(--hall-muted)] sm:text-lg">
            A reservation engine that serializes every decision on one database row — so capacity
            holds, retries never book twice and the waitlist keeps its order.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/lab"
              className="inline-flex min-h-11 items-center gap-2 rounded-[2px] bg-[var(--hall-fg)] px-4 text-sm font-medium text-[var(--hall-bg)] transition-colors hover:bg-[var(--hall-accent)] hover:text-white"
            >
              Open the Reliability Lab <span aria-hidden>→</span>
            </Link>
            <Link
              href="#fig-1"
              className="inline-flex min-h-11 items-center rounded-[2px] border border-[var(--hall-line)] px-4 text-sm text-[var(--hall-fg)] transition-colors hover:border-[var(--hall-fg)]"
            >
              Read it as SQL
            </Link>
          </div>

          <div className="mt-auto flex items-end justify-between gap-6">
            <div className="max-w-sm" aria-live="polite">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--hall-accent)]">
                {String(beat.index).padStart(2, '0')} / {String(BEATS.length).padStart(2, '0')} ·{' '}
                {beat.title}
              </p>
              <p className="mt-2 text-sm text-[var(--hall-fg)]">
                {interactive ? beat.caption : BEATS.at(-1)?.caption}
              </p>
            </div>
            <div className="hidden items-end gap-3 sm:flex" aria-hidden>
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--hall-muted)]">
                {!interactive
                  ? 'Final state'
                  : shown >= 0.95
                    ? 'Now read it as SQL ↓'
                    : 'Scroll to run the race'}
              </p>
              <div className="relative h-24 w-px bg-[var(--hall-line)]">
                <div
                  ref={ruler}
                  className="absolute inset-0 origin-top bg-[var(--hall-accent)]"
                  style={{ transform: `scaleY(${interactive ? 0 : 1})` }}
                />
                {BEATS.map((entry) => (
                  <span
                    key={entry.index}
                    className="absolute -left-1 h-px w-2 bg-[var(--hall-muted)]"
                    style={{ top: `${entry.from * 100}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div aria-hidden className="mt-6 flex justify-between font-mono text-[var(--hall-faint)]">
            <span>+</span>
            <span>+</span>
            <span className="hidden sm:inline">+</span>
            <span>+</span>
          </div>
        </div>
      </div>
      <ol className="sr-only">
        {BEATS.map((entry) => (
          <li key={entry.index}>
            {entry.title}: {entry.caption}
          </li>
        ))}
      </ol>
    </section>
  )
}
