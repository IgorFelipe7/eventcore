'use client'

import { useEffect, useRef } from 'react'

const DURATION_MS = 1_400

export function CountUp({
  value,
  className = '',
}: {
  readonly value: number
  readonly className?: string
}) {
  const element = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const target = element.current
    if (!target || value === 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (target.getBoundingClientRect().top < window.innerHeight * 0.95) return
    let frame: number | null = null
    target.textContent = '0'
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        const started = performance.now()
        const tick = (now: number) => {
          const progress = Math.min(1, (now - started) / DURATION_MS)
          target.textContent = String(Math.round(value * (1 - (1 - progress) ** 4)))
          if (progress < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      },
      { rootMargin: '0px 0px -15% 0px' },
    )
    observer.observe(target)
    return () => {
      observer.disconnect()
      if (frame !== null) cancelAnimationFrame(frame)
      target.textContent = String(value)
    }
  }, [value])

  return (
    <span ref={element} className={className}>
      {value}
    </span>
  )
}
