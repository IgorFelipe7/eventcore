'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'

export function Reveal({
  children,
  delay = 0,
}: {
  readonly children: ReactNode
  readonly delay?: number
}) {
  const element = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'static' | 'waiting' | 'shown'>('static')

  useEffect(() => {
    const target = element.current
    if (!target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (target.getBoundingClientRect().top < window.innerHeight * 0.9) return
    setState('waiting')
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setState('shown')
        observer.disconnect()
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={element}
      data-reveal={state}
      style={{ animationDelay: `${delay}ms` }}
      className="data-[reveal=waiting]:opacity-0 data-[reveal=shown]:animate-rise"
    >
      {children}
    </div>
  )
}
