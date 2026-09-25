export type PgTimestamp = Date | string

export const asDate = (value: PgTimestamp): Date => {
  if (value instanceof Date) return value
  const parsed = new Date(value.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'))
  if (Number.isNaN(parsed.getTime())) throw new Error(`Unparseable timestamp: ${value}`)
  return parsed
}

export const asNullableDate = (value: PgTimestamp | null): Date | null =>
  value === null ? null : asDate(value)
