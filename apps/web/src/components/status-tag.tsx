'use client'

import { type EventStatus, type RegistrationStatus } from '@eventcore/domain'
import { useI18n } from '@/i18n/provider'

const registrationStyles: Record<RegistrationStatus, { glyph: string; tone: string }> = {
  CONFIRMED: { glyph: '●', tone: 'text-confirmed bg-confirmed-wash' },
  WAITLISTED: { glyph: '◐', tone: 'text-waitlisted bg-waitlisted-wash' },
  REJECTED: { glyph: '×', tone: 'text-rejected bg-rejected-wash' },
  CANCELLED: { glyph: '○', tone: 'text-cancelled bg-rule-soft' },
}

const eventStyles: Record<EventStatus, { glyph: string; tone: string }> = {
  DRAFT: { glyph: '◇', tone: 'text-ink-2 bg-rule-soft' },
  PUBLISHED: { glyph: '◆', tone: 'text-confirmed bg-confirmed-wash' },
  CLOSED: { glyph: '■', tone: 'text-ink-2 bg-rule-soft' },
  CANCELLED: { glyph: '×', tone: 'text-rejected bg-rejected-wash' },
}

const base =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-current/20 px-2.5 py-0.5 font-mono text-xs font-medium tabular'

export function RegistrationStatusTag({
  status,
  position,
}: {
  readonly status: RegistrationStatus
  readonly position?: number | null
}) {
  const { t } = useI18n()
  const style = registrationStyles[status]
  return (
    <span className={`${base} ${style.tone}`}>
      <span aria-hidden>{style.glyph}</span>
      {t.status.registration[status]}
      {status === 'WAITLISTED' && position ? <span> #{position}</span> : null}
    </span>
  )
}

export function EventStatusTag({ status }: { readonly status: EventStatus }) {
  const { t } = useI18n()
  const style = eventStyles[status]
  return (
    <span className={`${base} ${style.tone}`}>
      <span aria-hidden>{style.glyph}</span>
      {t.status.event[status]}
    </span>
  )
}
