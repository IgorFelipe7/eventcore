import { sql } from 'drizzle-orm'
import { type Executor } from '../client'
import { type PgTimestamp, asDate } from '../values'

export interface OutboxInput {
  readonly aggregateType: string
  readonly aggregateId: string
  readonly eventType: string
  readonly schemaVersion?: number
  readonly payload: Record<string, unknown>
}

export const enqueueOutbox = async (executor: Executor, input: OutboxInput): Promise<void> => {
  await executor.execute(sql`
    INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, schema_version, payload)
    VALUES (
      ${input.aggregateType},
      ${input.aggregateId},
      ${input.eventType},
      ${input.schemaVersion ?? 1},
      ${JSON.stringify(input.payload)}::jsonb
    )
  `)
}

export interface PendingOutboxEvent {
  readonly id: string
  readonly aggregateType: string
  readonly aggregateId: string
  readonly eventType: string
  readonly schemaVersion: number
  readonly payload: Record<string, unknown>
  readonly attempts: number
  readonly createdAt: Date
}

export const claimPendingOutbox = async (
  executor: Executor,
  limit: number,
): Promise<PendingOutboxEvent[]> => {
  const { rows } = await executor.execute<{
    id: string
    aggregate_type: string
    aggregate_id: string
    event_type: string
    schema_version: number
    payload: Record<string, unknown>
    attempts: number
    created_at: PgTimestamp
  }>(sql`
    SELECT id, aggregate_type, aggregate_id, event_type, schema_version, payload, attempts, created_at
    FROM outbox_events
    WHERE published_at IS NULL
      AND dead_lettered_at IS NULL
      AND next_attempt_at <= now()
    ORDER BY next_attempt_at, created_at
    LIMIT ${limit}
    FOR UPDATE SKIP LOCKED
  `)
  return rows.map((row) => ({
    id: row.id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    eventType: row.event_type,
    schemaVersion: row.schema_version,
    payload: row.payload,
    attempts: row.attempts,
    createdAt: asDate(row.created_at),
  }))
}

export const markOutboxPublished = async (executor: Executor, id: string): Promise<void> => {
  await executor.execute(sql`
    UPDATE outbox_events
    SET published_at = now(), attempts = attempts + 1, last_error = NULL
    WHERE id = ${id}
  `)
}

export const scheduleOutboxRetry = async (
  executor: Executor,
  id: string,
  delayMs: number,
  error: string,
): Promise<void> => {
  await executor.execute(sql`
    UPDATE outbox_events
    SET attempts = attempts + 1,
        next_attempt_at = now() + make_interval(secs => ${delayMs / 1000}),
        last_error = ${error.slice(0, 500)}
    WHERE id = ${id}
  `)
}

export const deadLetterOutbox = async (
  executor: Executor,
  id: string,
  error: string,
): Promise<void> => {
  await executor.execute(sql`
    UPDATE outbox_events
    SET attempts = attempts + 1, dead_lettered_at = now(), last_error = ${error.slice(0, 500)}
    WHERE id = ${id}
  `)
}

export interface OutboxStats {
  readonly pending: number
  readonly deadLettered: number
  readonly published: number
}

export const outboxStats = async (executor: Executor): Promise<OutboxStats> => {
  const { rows } = await executor.execute<{
    pending: number
    dead_lettered: number
    published: number
  }>(sql`
    SELECT
      count(*) FILTER (WHERE published_at IS NULL AND dead_lettered_at IS NULL)::int AS pending,
      count(*) FILTER (WHERE dead_lettered_at IS NOT NULL)::int AS dead_lettered,
      count(*) FILTER (WHERE published_at IS NOT NULL)::int AS published
    FROM outbox_events
  `)
  const [row] = rows
  return {
    pending: row?.pending ?? 0,
    deadLettered: row?.dead_lettered ?? 0,
    published: row?.published ?? 0,
  }
}
