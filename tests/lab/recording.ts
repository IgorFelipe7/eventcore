import { execSync } from 'node:child_process'
import { cpus, platform, release } from 'node:os'
import { performance } from 'node:perf_hooks'
import {
  type LabAttempt,
  type LabCheck,
  type LabEnvironment,
  type LabLatency,
  type LabVariant,
} from '@eventcore/contracts'
import { type DatabaseHandle } from '@eventcore/db'
import { sql } from 'drizzle-orm'
import { integrityOf } from '../support/fixtures'

export interface Stopwatch {
  readonly elapsed: () => number
}

export const startStopwatch = (): Stopwatch => {
  const origin = performance.now()
  return { elapsed: () => Math.round((performance.now() - origin) * 100) / 100 }
}

export interface TimedResponse {
  readonly status: number
  readonly body: Record<string, unknown>
  readonly headers: Record<string, string | string[] | number | undefined>
}

export interface Measured<T> {
  readonly startMs: number
  readonly endMs: number
  readonly value: T
}

export const measure = async <T>(watch: Stopwatch, run: () => Promise<T>): Promise<Measured<T>> => {
  const startMs = watch.elapsed()
  const value = await run()
  return { startMs, endMs: watch.elapsed(), value }
}

export const describeRegistration = (response: TimedResponse): string => {
  if (response.status >= 400) return String(response.body['code'] ?? `HTTP ${response.status}`)
  const status = String(response.body['status'])
  const position = response.body['waitlistPosition']
  return status === 'WAITLISTED' && typeof position === 'number'
    ? `WAITLISTED #${position}`
    : status
}

export const attemptFrom = (
  actor: string,
  kind: LabAttempt['kind'],
  measured: Measured<TimedResponse>,
  decisions: ReadonlyMap<string, number>,
): LabAttempt => {
  const { value } = measured
  const requestId = typeof value.body['requestId'] === 'string' ? value.body['requestId'] : null
  const position = value.body['waitlistPosition']
  return {
    actor,
    kind,
    startMs: measured.startMs,
    endMs: measured.endMs,
    httpStatus: value.status,
    result:
      kind === 'cancel'
        ? String(value.body['transition'] ?? value.body['code'])
        : describeRegistration(value),
    replayed: value.headers['idempotent-replayed'] === 'true',
    decisionIndex: requestId ? (decisions.get(requestId) ?? null) : null,
    position: typeof position === 'number' ? position : null,
  }
}

export const decisionOrder = async (
  handle: DatabaseHandle,
  eventId: string,
): Promise<Map<string, number>> => {
  const { rows } = await handle.db.execute<{ correlation_id: string }>(sql`
    SELECT h.correlation_id, min(h.occurred_at) AS first_at
    FROM registration_events h
    JOIN registrations r ON r.id = h.registration_id
    WHERE r.event_id = ${eventId}
    GROUP BY h.correlation_id
    ORDER BY first_at
  `)
  return new Map(rows.map((row, index) => [row.correlation_id, index + 1]))
}

export const percentile = (sorted: readonly number[], p: number): number => {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index] ?? 0
}

export const latencyOf = (attempts: readonly { startMs: number; endMs: number }[]): LabLatency => {
  const durations = attempts.map((attempt) => attempt.endMs - attempt.startMs).sort((a, b) => a - b)
  const round = (value: number) => Math.round(value * 10) / 10
  return {
    samples: durations.length,
    p50: round(percentile(durations, 50)),
    p95: round(percentile(durations, 95)),
    p99: round(percentile(durations, 99)),
    max: round(durations.at(-1) ?? 0),
  }
}

export const countBy = (attempts: readonly LabAttempt[]): Record<string, number> =>
  attempts.reduce<Record<string, number>>((counts, attempt) => {
    const key = attempt.result.replace(/ #\d+$/, '')
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})

export const capacityChecks = async (
  handle: DatabaseHandle,
  eventId: string,
): Promise<{ checks: LabCheck[]; final: LabVariant['final'] }> => {
  const integrity = await integrityOf(handle, eventId)
  const { rows } = await handle.db.execute<{ duplicates: number }>(sql`
    SELECT count(*)::int AS duplicates FROM (
      SELECT user_id FROM registrations WHERE event_id = ${eventId} GROUP BY user_id HAVING count(*) > 1
    ) d
  `)
  const duplicates = rows[0]?.duplicates ?? 0
  return {
    final: {
      capacity: integrity.capacity,
      confirmedRows: integrity.confirmedRows,
      waitlistedRows: integrity.waitlistedRows,
    },
    checks: [
      {
        id: 'I1',
        label: 'Confirmed seats within capacity',
        passed: integrity.confirmedRows <= integrity.capacity,
        detail: `${integrity.confirmedRows} confirmed for ${integrity.capacity} seat${integrity.capacity === 1 ? '' : 's'}`,
      },
      {
        id: 'I1·P',
        label: 'Counter equals confirmed rows',
        passed: integrity.confirmedCount === integrity.confirmedRows,
        detail: `counter ${integrity.confirmedCount}, rows ${integrity.confirmedRows}`,
      },
      {
        id: 'I2',
        label: 'One registration per participant',
        passed: duplicates === 0,
        detail: `${duplicates} participants with more than one row`,
      },
      {
        id: 'I5·Q',
        label: 'No idle seat while someone waits',
        passed: integrity.waitlistedRows === 0 || integrity.confirmedRows === integrity.capacity,
        detail:
          integrity.confirmedRows > integrity.capacity
            ? `${integrity.waitlistedRows} waiting, no idle seat (overbooked by ${integrity.confirmedRows - integrity.capacity})`
            : `${integrity.waitlistedRows} waiting, ${integrity.capacity - integrity.confirmedRows} seats idle`,
      },
    ],
  }
}

export const readEnvironment = async (
  handle: DatabaseHandle,
  poolSize: number,
): Promise<LabEnvironment> => {
  const { rows } = await handle.db.execute<{ version: string }>(sql`SELECT version()`)
  const postgres = rows[0]?.version.split(' on ')[0] ?? 'PostgreSQL'
  const commit = (() => {
    try {
      return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
    } catch {
      return 'uncommitted'
    }
  })()
  const processors = cpus()
  return {
    recordedAt: new Date().toISOString(),
    commit,
    node: process.version,
    postgres,
    platform: `${platform()} ${release()}`,
    cpu: `${processors[0]?.model.trim() ?? 'unknown CPU'} × ${processors.length}`,
    transport: 'In-process HTTP injection into the real Fastify app (no network hop)',
    poolSize,
  }
}
