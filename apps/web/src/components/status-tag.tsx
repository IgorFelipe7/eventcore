import { type EventStatus, type RegistrationStatus } from '@eventcore/domain'

const registrationStyles: Record<
  RegistrationStatus,
  { glyph: string; label: string; tone: string }
> = {
  CONFIRMED: { glyph: '●', label: 'Confirmed', tone: 'text-confirmed bg-confirmed-wash' },
  WAITLISTED: { glyph: '◐', label: 'Waitlisted', tone: 'text-waitlisted bg-waitlisted-wash' },
  REJECTED: { glyph: '×', label: 'Rejected', tone: 'text-rejected bg-rejected-wash' },
  CANCELLED: { glyph: '○', label: 'Cancelled', tone: 'text-cancelled bg-rule-soft' },
}

const eventStyles: Record<EventStatus, { glyph: string; label: string; tone: string }> = {
  DRAFT: { glyph: '◇', label: 'Draft', tone: 'text-ink-2 bg-rule-soft' },
  PUBLISHED: { glyph: '◆', label: 'Open', tone: 'text-confirmed bg-confirmed-wash' },
  CLOSED: { glyph: '■', label: 'Closed', tone: 'text-ink-2 bg-rule-soft' },
  CANCELLED: { glyph: '×', label: 'Cancelled', tone: 'text-rejected bg-rejected-wash' },
}

const base =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] px-2 py-0.5 font-mono text-xs font-medium tabular'

export function RegistrationStatusTag({
  status,
  position,
}: {
  readonly status: RegistrationStatus
  readonly position?: number | null
}) {
  const style = registrationStyles[status]
  return (
    <span className={`${base} ${style.tone}`}>
      <span aria-hidden>{style.glyph}</span>
      {style.label}
      {status === 'WAITLISTED' && position ? <span>#{position}</span> : null}
    </span>
  )
}

export function EventStatusTag({ status }: { readonly status: EventStatus }) {
  const style = eventStyles[status]
  return (
    <span className={`${base} ${style.tone}`}>
      <span aria-hidden>{style.glyph}</span>
      {style.label}
    </span>
  )
}
