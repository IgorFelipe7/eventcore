import { type ReactNode } from 'react'

const tones = {
  info: 'var(--color-ink-3)',
  success: 'var(--color-confirmed)',
  waiting: 'var(--color-waitlisted)',
  danger: 'var(--color-rejected)',
  signal: 'var(--color-signal)',
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
      className="surface relative overflow-clip px-5 py-4"
      style={{ ['--tone' as string]: tones[tone] }}
    >
      <span
        aria-hidden
        className="absolute inset-y-4 left-0 w-0.5 rounded-full bg-(--tone) shadow-[0_0_16px_var(--tone)]"
      />
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="mt-1 text-sm text-ink-2">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
