'use client'

import { useEffect, useRef, useState } from 'react'

const CHARACTER_MS = 22
const LINE_PAUSE_MS = 420

export function Terminal({
  lines,
  title,
}: {
  readonly lines: readonly string[]
  readonly title: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const total = lines.reduce((sum, line) => sum + line.length, 0)
  const [typed, setTyped] = useState(total)

  useEffect(() => {
    const element = host.current
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (element.getBoundingClientRect().top < window.innerHeight * 0.9) return
    let timer: number | null = null
    const reset = requestAnimationFrame(() => setTyped(0))
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        let count = 0
        let lineEnd = lines[0]?.length ?? 0
        let line = 0
        const step = () => {
          count += 1
          setTyped(count)
          if (count >= total) return
          const pause = count === lineEnd
          if (pause) {
            line += 1
            lineEnd += lines[line]?.length ?? 0
          }
          timer = window.setTimeout(step, pause ? LINE_PAUSE_MS : CHARACTER_MS)
        }
        timer = window.setTimeout(step, 300)
      },
      { rootMargin: '0px 0px -20% 0px' },
    )
    observer.observe(element)
    return () => {
      cancelAnimationFrame(reset)
      observer.disconnect()
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [lines, total])

  const offsets = lines.map((_, index) =>
    lines.slice(0, index).reduce((sum, line) => sum + line.length, 0),
  )
  return (
    <div ref={host} className="surface overflow-clip text-left">
      <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
        <span className="label text-ink-2">{title}</span>
        <span className="label rounded-full border border-rule px-2 py-0.5 text-ink-3">shell</span>
      </div>
      <pre className="sr-only">{lines.join('\n')}</pre>
      <pre
        aria-hidden
        className="overflow-x-auto px-5 py-4 font-mono text-[0.8125rem] leading-7 text-ink-2"
      >
        {lines.map((line, index) => {
          const remaining = typed - (offsets[index] ?? 0)
          const visible = line.slice(0, Math.max(0, remaining))
          const done = remaining >= line.length
          const typing = remaining > 0 && !done
          return (
            <span key={index} className="block min-h-7">
              <span className="select-none text-signal">$ </span>
              <span className="text-ink">{visible}</span>
              {typing || (index === lines.length - 1 && done) ? (
                <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-caret bg-signal" />
              ) : null}
            </span>
          )
        })}
      </pre>
    </div>
  )
}
