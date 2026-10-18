'use client'

import { useEffect, useRef, useState } from 'react'
import { CodeBlock } from '@/components/code-block'

export interface AnatomyStep {
  readonly title: string
  readonly detail: string
  readonly lines: readonly number[]
}

export function AnatomyScroller({
  steps,
  code,
  codeTitle,
  stepLabel,
  noSql,
  lockOrder,
}: {
  readonly steps: readonly AnatomyStep[]
  readonly code: string
  readonly codeTitle: string
  readonly stepLabel: string
  readonly noSql: string
  readonly lockOrder: React.ReactNode
}) {
  const [active, setActive] = useState(0)
  const items = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = Number((entry.target as HTMLElement).dataset['step'])
          if (Number.isFinite(index)) setActive(index)
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    for (const item of items.current) if (item) observer.observe(item)
    return () => observer.disconnect()
  }, [])

  const current = steps[active] ?? steps[0]

  return (
    <div className="grid grid-cols-12 gap-x-6 gap-y-10">
      <ol className="col-span-12 lg:col-span-5">
        {steps.map((step, index) => (
          <li
            key={step.title}
            ref={(element) => {
              items.current[index] = element
            }}
            data-step={index}
            data-active={index === active}
            className="group relative flex gap-5 py-7 lg:min-h-[44vh] lg:items-center"
          >
            <span
              aria-hidden
              className="absolute bottom-0 left-[1.1rem] top-0 w-px bg-rule group-first:top-1/2 group-last:bottom-1/2"
            />
            <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full border border-rule bg-paper font-mono text-xs text-ink-3 transition-all duration-500 ease-out-expo group-data-[active=true]:border-signal group-data-[active=true]:bg-signal group-data-[active=true]:text-paper group-data-[active=true]:shadow-[0_0_24px_var(--color-signal)]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <p className="label text-ink-3">
                {stepLabel} {index + 1}
              </p>
              <p className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.03em] text-ink-3 transition-colors duration-500 font-stretch-110% group-data-[active=true]:text-ink">
                {step.title}
              </p>
              <p className="mt-2 max-w-md text-ink-3 transition-colors duration-500 group-data-[active=true]:text-ink-2">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <div className="col-span-12 lg:col-span-7">
        <div className="grid gap-4 lg:sticky lg:top-28">
          {lockOrder}
          <div className="relative">
            <CodeBlock
              code={code}
              language="sql"
              title={codeTitle}
              highlight={current?.lines ?? []}
              wrap
            />
            <span
              aria-live="polite"
              className={`absolute right-4 top-12 rounded-full border border-signal/40 bg-signal-wash px-3 py-1 font-mono text-[0.7rem] text-signal transition-opacity duration-300 ${current && current.lines.length === 0 ? 'opacity-100' : 'opacity-0'}`}
            >
              {noSql}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
