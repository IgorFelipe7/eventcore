export type ResultTone =
  'confirmed' | 'waitlisted' | 'rejected' | 'cancelled' | 'neutral' | 'signal'

export const toneOf = (result: string, replayed = false): ResultTone => {
  if (replayed) return 'signal'
  if (
    result.startsWith('CONFIRMED') ||
    result.startsWith('DELIVERED') ||
    result.startsWith('CAPACITY ')
  )
    return 'confirmed'
  if (result.startsWith('WAITLISTED') || result.startsWith('RETRY')) return 'waitlisted'
  if (result.startsWith('CANCELLED')) return 'cancelled'
  if (/^(SOLD_OUT|REJECTED|4\d\d|CAPACITY_BELOW)/.test(result)) return 'rejected'
  return 'neutral'
}

export const TONE_FILL: Record<ResultTone, string> = {
  confirmed: 'var(--color-confirmed)',
  waitlisted: 'var(--color-waitlisted)',
  rejected: 'var(--color-rejected)',
  cancelled: 'var(--color-cancelled)',
  neutral: 'var(--color-ink-3)',
  signal: 'var(--color-signal)',
}

export const TONE_TEXT: Record<ResultTone, string> = {
  confirmed: 'text-confirmed',
  waitlisted: 'text-waitlisted',
  rejected: 'text-rejected',
  cancelled: 'text-cancelled',
  neutral: 'text-ink-2',
  signal: 'text-signal',
}
