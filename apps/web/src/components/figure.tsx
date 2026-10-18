import { type ReactNode } from 'react'
import { getI18n } from '@/i18n/server'

export async function Figure({
  number,
  caption,
  kind,
  children,
  className = '',
}: {
  readonly number: string
  readonly caption: ReactNode
  readonly kind: 'illustrative' | 'measured' | 'schematic'
  readonly children: ReactNode
  readonly className?: string
}) {
  const { t } = await getI18n()
  return (
    <figure className={`surface overflow-clip ${className}`}>
      {children}
      <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-rule px-5 py-4">
        <span className="label text-ink">
          {t.common.figure} {number}
        </span>
        <span className="label rounded-full border border-rule px-2 py-0.5 text-ink-3">
          {t.common.figureKinds[kind]}
        </span>
        <span className="text-sm text-ink-2">{caption}</span>
      </figcaption>
    </figure>
  )
}
