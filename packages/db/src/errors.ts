export const PG_ERROR = {
  UNIQUE_VIOLATION: '23505',
  CHECK_VIOLATION: '23514',
  SERIALIZATION_FAILURE: '40001',
  DEADLOCK_DETECTED: '40P01',
  QUERY_CANCELED: '57014',
  ADMIN_SHUTDOWN: '57P01',
  CANNOT_CONNECT_NOW: '57P03',
} as const

const codeOf = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) return undefined
  const direct = (error as { code?: unknown }).code
  if (typeof direct === 'string') return direct
  const cause = (error as { cause?: unknown }).cause
  return cause === undefined ? undefined : codeOf(cause)
}

export const pgErrorCode = codeOf

export const isUniqueViolation = (error: unknown): boolean =>
  codeOf(error) === PG_ERROR.UNIQUE_VIOLATION

export const isSerializationFailure = (error: unknown): boolean => {
  const code = codeOf(error)
  return code === PG_ERROR.SERIALIZATION_FAILURE || code === PG_ERROR.DEADLOCK_DETECTED
}

const UNAVAILABLE_CODES = new Set<string>([
  PG_ERROR.QUERY_CANCELED,
  PG_ERROR.ADMIN_SHUTDOWN,
  PG_ERROR.CANNOT_CONNECT_NOW,
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  '08000',
  '08003',
  '08006',
])

export const isDatabaseUnavailable = (error: unknown): boolean => {
  const code = codeOf(error)
  return code !== undefined && UNAVAILABLE_CODES.has(code)
}
