'use client'

import { useEffect } from 'react'

export function SpotlightTracker() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return
    let pending: number | null = null
    let event: PointerEvent | null = null
    const apply = () => {
      pending = null
      if (!event) return
      const target = (event.target as Element | null)?.closest<HTMLElement>('[data-spotlight]')
      if (!target) return
      const rect = target.getBoundingClientRect()
      target.style.setProperty('--spot-x', `${event.clientX - rect.left}px`)
      target.style.setProperty('--spot-y', `${event.clientY - rect.top}px`)
    }
    const onMove = (next: PointerEvent) => {
      event = next
      if (pending === null) pending = requestAnimationFrame(apply)
    }
    document.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      document.removeEventListener('pointermove', onMove)
      if (pending !== null) cancelAnimationFrame(pending)
    }
  }, [])
  return null
}
