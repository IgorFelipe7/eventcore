import { type ReactNode } from 'react'

export type TicketTone = 'confirmed' | 'waitlisted' | 'rejected' | 'neutral'

const STUB_TONE: Record<TicketTone, string> = {
  confirmed: 'bg-confirmed text-white',
  waitlisted: 'bg-waitlisted text-white',
  rejected: 'bg-rejected text-white',
  neutral: 'bg-ink text-paper',
}

const NOTCH =
  'radial-gradient(circle at 0 0, transparent 9px, black 9.5px) top left / 51% 51% no-repeat, radial-gradient(circle at 100% 0, transparent 9px, black 9.5px) top right / 51% 51% no-repeat, radial-gradient(circle at 0 100%, transparent 9px, black 9.5px) bottom left / 51% 51% no-repeat, radial-gradient(circle at 100% 100%, transparent 9px, black 9.5px) bottom right / 51% 51% no-repeat'

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
      className="relative flex drop-shadow-[0_1px_0_var(--color-ink)]"
    >
      <div className="min-w-0 flex-1 border border-r-0 border-ink bg-sheet">{children}</div>
      <div aria-hidden className="relative w-0 border-l border-dashed border-ink-3" />
      <div
        className={`flex w-24 shrink-0 flex-col items-center justify-between border border-l-0 border-ink px-2 py-4 sm:w-28 ${STUB_TONE[tone]}`}
        style={{ mask: NOTCH, WebkitMask: NOTCH }}
      >
        <span className="label text-center opacity-80">{stubLabel}</span>
        <span className="font-display text-4xl font-semibold tracking-[-0.03em] tabular">
          {stubValue}
        </span>
        <span className="max-w-full truncate font-mono text-[0.6rem] tracking-[0.08em] opacity-80">
          {serial}
        </span>
      </div>
    </div>
  )
}
