import { type ReactNode } from 'react'

export type TicketTone = 'confirmed' | 'waitlisted' | 'rejected' | 'neutral'

const STUB_TONE: Record<TicketTone, string> = {
  confirmed: 'var(--color-confirmed)',
  waitlisted: 'var(--color-waitlisted)',
  rejected: 'var(--color-rejected)',
  neutral: 'var(--color-ink-3)',
}

const NOTCH =
  'radial-gradient(circle at 0 0, transparent 11px, black 11.5px) top left / 51% 51% no-repeat, radial-gradient(circle at 100% 0, transparent 11px, black 11.5px) top right / 51% 51% no-repeat, radial-gradient(circle at 0 100%, transparent 11px, black 11.5px) bottom left / 51% 51% no-repeat, radial-gradient(circle at 100% 100%, transparent 11px, black 11.5px) bottom right / 51% 51% no-repeat'

export function Ticket({
  tone,
  stubLabel,
  stubValue,
  serial,
  children,
  live = false,
}: {
  readonly tone: TicketTone
  readonly stubLabel: string
  readonly stubValue: ReactNode
  readonly serial: string
  readonly children: ReactNode
  readonly live?: boolean
}) {
  return (
    <div
      role={live ? 'status' : undefined}
      className="animate-rise relative flex drop-shadow-[0_24px_48px_rgb(0_0_0/0.6)]"
      style={{ ['--tone' as string]: STUB_TONE[tone] }}
    >
      <div className="min-w-0 flex-1 overflow-clip rounded-l-[var(--radius-card)] border border-r-0 border-rule bg-sheet">
        {children}
      </div>
      <div
        aria-hidden
        className="relative w-0 border-l-2 border-dashed border-[rgb(238_241_246/0.14)]"
      />
      <div
        className="relative flex w-24 shrink-0 flex-col items-center justify-between overflow-clip rounded-r-[var(--radius-card)] px-2 py-5 text-paper sm:w-28"
        style={{
          mask: NOTCH,
          WebkitMask: NOTCH,
          background:
            'linear-gradient(160deg, color-mix(in oklab, var(--tone), white 25%), var(--tone) 55%, color-mix(in oklab, var(--tone), black 30%))',
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgb(255_255_255/0.45)_45%,transparent_60%)] bg-[length:250%_100%] mix-blend-overlay motion-safe:animate-[sheen_3.2s_ease-in-out_infinite]"
        />
        <span className="label relative text-center opacity-80">{stubLabel}</span>
        <span className="relative font-display text-4xl font-bold tracking-[-0.04em] tabular">
          {stubValue}
        </span>
        <span className="relative max-w-full truncate font-mono text-[0.6rem] tracking-[0.08em] opacity-75">
          {serial}
        </span>
      </div>
    </div>
  )
}
