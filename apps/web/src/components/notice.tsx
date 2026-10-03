import { type ReactNode } from 'react'

const tones = {
  info: 'border-l-ink',
  success: 'border-l-confirmed',
  waiting: 'border-l-waitlisted',
  danger: 'border-l-rejected',
  signal: 'border-l-signal',
} as const

export function Notice({
  tone = 'info',
  title,
  children,
  action,
  live = false,
}: {
  readonly tone?: keyof typeof tones
  readonly title: string
  readonly children?: ReactNode
  readonly action?: ReactNode
  readonly live?: boolean
}) {
  return (
    <div
      role={live ? 'status' : undefined}
      className={`border border-l-4 border-rule bg-sheet px-4 py-3.5 ${tones[tone]}`}
    >
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="mt-1 text-sm text-ink-2">{children}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
