import { z } from 'zod'
import { ProblemError } from './problem'

export const encodeCursor = (value: Record<string, string>): string =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')

export const decodeCursor = <T>(cursor: string | undefined, schema: z.ZodType<T>): T | null => {
  if (!cursor) return null
  try {
    const decoded: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    return schema.parse(decoded)
  } catch {
    throw new ProblemError('VALIDATION_FAILED', 'The cursor is not valid.', {
      errors: [
        { path: 'querystring.cursor', message: 'Use the nextCursor value from a previous page.' },
      ],
    })
  }
}

export const TimeIdCursorSchema = z
  .object({ t: z.iso.datetime({ offset: true }), i: z.uuid() })
  .transform(({ t, i }) => ({ at: new Date(t), id: i }))

export const pageWindow = <T>(rows: readonly T[], limit: number) => ({
  items: rows.slice(0, limit),
  hasMore: rows.length > limit,
})
