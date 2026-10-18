'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Keyword } from '@/components/headline'
import { Link } from '@/i18n/link'
import { useI18n } from '@/i18n/provider'
import {
  BEAT_STARTS,
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
import { HallPoster } from './hall-poster'
import { type HallFrame, type HallScene, type ScreenAnchor } from './hall-scene'

type CalloutId = keyof HallFrame

const HEADER_HEIGHT = 64

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
    webglSupport = Boolean(probe.getContext('webgl2'))
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

const stageKey = (value: number) => {
  const moment = momentAt(value)
  return `${beatAt(value)}|${moment.lockHolder}|${moment.confirmed}|${moment.a}|${moment.b}|${value >= 0.95}`
}

const pad = (value: number) => String(value).padStart(2, '0')

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
        className={`absolute left-(--run) whitespace-nowrap rounded-lg border bg-night/85 px-2.5 py-1.5 font-mono backdrop-blur-sm text-[0.68rem] uppercase leading-tight tracking-[0.12em] group-data-[side=left]:left-auto group-data-[side=left]:right-(--run) ${color}`}
        style={{ top: -reach - 10, ['--run' as string]: `${run + 18}px` }}
      >
        {children}
      </div>
    </div>
  )
}

export function HallHero() {
  const { t } = useI18n()
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const callouts = useRef(new Map<CalloutId, HTMLDivElement>())
  const ruler = useRef<HTMLDivElement>(null)
  const stageWidth = useRef(0)
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
    const width = stageWidth.current || window.innerWidth
    for (const [id, element] of callouts.current) {
      const anchor = frame[id]
      element.style.transform = `translate3d(${anchor.x}px, ${anchor.y}px, 0)`
      element.style.opacity = anchor.visible ? '1' : '0'
      const relative =
        id === 'seat'
          ? anchor.x < width * 0.45 || frame.queue.visible
            ? 'right'
            : 'left'
          : anchor.x > width * 0.8
            ? 'left'
            : 'right'
      if (element.dataset['side'] !== relative) element.dataset['side'] = relative
    }
  }

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')
    const element = section.current
    if (!header || !element) return
    let pending: number | null = null
    const update = () => {
      pending = null
      const bottom = element.getBoundingClientRect().bottom
      const scene = bottom > HEADER_HEIGHT ? 'night' : 'paper'
      if (header.dataset['scene'] !== scene) header.dataset['scene'] = scene
    }
    const schedule = () => {
      if (pending === null) pending = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      if (pending !== null) cancelAnimationFrame(pending)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      delete header.dataset['scene']
    }
  }, [])

  useEffect(() => {
    const host = stage.current
    if (!host) return

    if (!interactive) {
      const layout = () => {
        stageWidth.current = host.clientWidth
        placeCallouts(staticAnchors(host.clientWidth, host.clientHeight))
      }
      layout()
      window.addEventListener('resize', layout)
      return () => window.removeEventListener('resize', layout)
    }

    let disposed = false
    let lastKey = ''
    let visible = true
    let pending: number | null = null
    let sectionTop = 0
    let travel = 1

    const measure = () => {
      const element = section.current
      if (!element) return
      sectionTop = element.getBoundingClientRect().top + window.scrollY
      travel = element.offsetHeight - window.innerHeight
      stageWidth.current = host.clientWidth
    }

    const readScroll = () =>
      travel <= 0 ? 1 : Math.min(1, Math.max(0, (window.scrollY - sectionTop) / travel))

    const apply = () => {
      pending = null
      const value = readScroll()
      scene.current?.setProgress(value)
      if (ruler.current) ruler.current.style.transform = `scaleX(${value})`
      const key = stageKey(value)
      if (key !== lastKey) {
        lastKey = key
        setProgress(value)
      }
    }

    const onScroll = () => {
      if (pending === null) pending = requestAnimationFrame(apply)
    }

    const onPointer = (event: PointerEvent) => {
      scene.current?.setPointer(
        (event.clientX / window.innerWidth) * 2 - 1,
        (event.clientY / window.innerHeight) * 2 - 1,
      )
    }

    const resize = () => {
      measure()
      scene.current?.resize(host.clientWidth, host.clientHeight)
      apply()
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting)
      if (visible) scene.current?.start()
      else scene.current?.stop()
    })

    import('./hall-scene').then(({ HallScene }) => {
      if (disposed || !canvas.current) return
      scene.current = new HallScene(canvas.current, placeCallouts)
      resize()
      apply()
      scene.current.renderOnce(readScroll())
      if (visible) scene.current.start()
      setSceneReady(true)
    })

    measure()
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    if (section.current) observer.observe(section.current)

    return () => {
      disposed = true
      if (pending !== null) cancelAnimationFrame(pending)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      observer.disconnect()
      scene.current?.dispose()
      scene.current = null
    }
  }, [interactive])

  const shown = interactive ? progress : 1
  const beatIndex = beatAt(shown)
  const beat = t.hero.beats[beatIndex] ?? t.hero.beats[0]
  const finalBeat = t.hero.beats.at(-1)
  const moment = momentAt(shown)

  return (
    <section
      ref={section}
      aria-labelledby="hero"
      data-interactive={interactive ? 'true' : 'false'}
      className="hall relative -mt-[7.75rem] h-dvh data-[interactive=true]:h-[230vh] md:-mt-[4.25rem]"
    >
      <div ref={stage} className="sticky top-0 h-dvh overflow-clip bg-night">
        <HallPoster
          final={!interactive}
          className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${sceneReady ? 'opacity-0' : 'opacity-100'}`}
        />
        <canvas
          ref={canvas}
          aria-hidden
          className={`absolute inset-0 h-full w-full ${sceneReady ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(7_9_12/0.92)_0%,rgb(7_9_12/0.5)_30%,transparent_56%),radial-gradient(90%_70%_at_70%_40%,transparent_45%,rgb(7_9_12/0.7)_100%)]"
        />

        <div className="absolute inset-0">
          <Callout
            id="seat"
            register={register}
            tone={moment.a === 'confirmed' ? 'confirmed' : 'signal'}
          >
            <span className="block">{contestedLabel(t.hero.seat)}</span>
            <span className="block text-night-muted max-sm:hidden">
              {t.hero.seatState(CAPACITY, moment.confirmed, moment.lockHolder)}
            </span>
          </Callout>
          <Callout id="a" register={register} tone="signal">
            {moment.a === 'arriving' ? t.hero.a.arriving : t.hero.a.holding}
          </Callout>
          <Callout
            id="b"
            register={register}
            tone={moment.b === 'arriving' ? 'neutral' : 'waiting'}
          >
            {t.hero.b[moment.b]}
          </Callout>
        </div>

        <div className="sheet-frame relative flex h-full flex-col pb-10 pt-36 text-night-ink md:pt-28">
          <div className="grid grid-cols-12 items-start gap-x-6 gap-y-5 font-mono text-[0.68rem] uppercase tracking-[0.14em]">
            <p className="col-span-12 text-night-muted sm:col-span-6">
              <span className="text-night-ink">{t.hero.sheetNight}</span>
              <span className="mt-1 block">{t.hero.subject}</span>
            </p>
            <div
              className="col-span-12 w-full max-w-sm sm:col-span-6 sm:justify-self-end"
              aria-live="polite"
            >
              <p className="flex items-baseline justify-between gap-4 text-signal-glow">
                <span>
                  {pad(beatIndex + 1)} / {pad(BEAT_STARTS.length)} · {beat?.title}
                </span>
                <span aria-hidden className="text-night-muted max-sm:hidden">
                  {!interactive
                    ? t.hero.finalState
                    : shown >= 0.95
                      ? t.hero.finished
                      : t.hero.scroll}
                </span>
              </p>
              <div aria-hidden className="relative mt-2.5 h-px w-full bg-night-line">
                <div
                  ref={ruler}
                  className="absolute inset-0 origin-left bg-signal-glow"
                  style={{ transform: `scaleX(${interactive ? 0 : 1})` }}
                />
                {BEAT_STARTS.map((start) => (
                  <span
                    key={start}
                    className="absolute -top-1 h-2 w-px bg-night-muted"
                    style={{ left: `${start * 100}%` }}
                  />
                ))}
              </div>
              <p className="mt-3 font-sans text-sm normal-case tracking-normal text-night-ink">
                {interactive ? beat?.caption : finalBeat?.caption}
              </p>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-12 items-end gap-x-6 gap-y-7">
            <h1
              id="hero"
              className="col-span-12 text-hero font-display font-semibold lg:col-span-8"
            >
              <span className="block">{t.hero.titleLead}</span>
              <span className="block text-night-muted">
                {t.hero.titleBefore} <Keyword>{t.hero.titleKeyword}</Keyword> {t.hero.titleAfter}
              </span>
            </h1>
            <div className="col-span-12 grid gap-6 lg:col-span-4 lg:pb-3">
              <p className="max-w-md text-base text-night-muted sm:text-lg">{t.hero.lead}</p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/lab"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-night-ink px-6 shadow-[0_8px_32px_-8px_rgb(125_139_255/0.7)] text-sm font-medium text-night transition-colors hover:bg-signal-glow hover:text-white"
                >
                  {t.hero.primary} <span aria-hidden>→</span>
                </Link>
                <a
                  href="#fig-1"
                  className="inline-flex min-h-12 items-center rounded-full border border-night-line bg-[rgb(238_241_246/0.04)] px-6 backdrop-blur-md text-sm text-night-ink transition-colors hover:border-night-ink"
                >
                  {t.hero.secondary}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ol className="sr-only">
        {t.hero.beats.map((entry) => (
          <li key={entry.title}>
            {entry.title}: {entry.caption}
          </li>
        ))}
      </ol>
    </section>
  )
}
