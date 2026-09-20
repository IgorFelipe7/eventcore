import { sql } from 'drizzle-orm'
import { type Executor } from '../client'

export interface IdempotencyScope {
  readonly actorId: string
  readonly action: string
  readonly scopeId: string
  readonly key: string
}

export type IdempotencyClaim =
  | { readonly kind: 'claimed'; readonly id: string }
  | { readonly kind: 'replay'; readonly httpStatus: number; readonly responseBody: unknown }
  | { readonly kind: 'conflict' }

export const claimIdempotencyKey = async (
  executor: Executor,
  scope: IdempotencyScope,
  requestHash: string,
  ttlSeconds: number,
): Promise<IdempotencyClaim> => {
  const inserted = await executor.execute<{ id: string }>(sql`
    INSERT INTO idempotency_requests (actor_id, action, scope_id, key, request_hash, expires_at)
    VALUES (
      ${scope.actorId},
      ${scope.action},
      ${scope.scopeId},
      ${scope.key},
      ${requestHash},
      now() + make_interval(secs => ${ttlSeconds})
    )
    ON CONFLICT ON CONSTRAINT idempotency_requests_scope_key DO NOTHING
    RETURNING id
  `)
  const [claimed] = inserted.rows
  if (claimed) return { kind: 'claimed', id: claimed.id }

  const existing = await executor.execute<{
    request_hash: string
    http_status: number | null
    response_body: unknown
  }>(sql`
    SELECT request_hash, http_status, response_body
    FROM idempotency_requests
    WHERE actor_id = ${scope.actorId}
      AND action = ${scope.action}
      AND scope_id = ${scope.scopeId}
      AND key = ${scope.key}
  `)
  const [row] = existing.rows
  if (!row || row.http_status === null) {
    throw new Error('Idempotency record vanished or was committed without a response.')
  }
  if (row.request_hash !== requestHash) return { kind: 'conflict' }
  return { kind: 'replay', httpStatus: row.http_status, responseBody: row.response_body }
}

export const completeIdempotencyKey = async (
  executor: Executor,
  id: string,
  httpStatus: number,
  responseBody: unknown,
): Promise<void> => {
  await executor.execute(sql`
    UPDATE idempotency_requests
    SET http_status = ${httpStatus}, response_body = ${JSON.stringify(responseBody)}::jsonb
    WHERE id = ${id}
  `)
}

export const purgeExpiredIdempotencyKeys = async (
  executor: Executor,
  batchSize: number,
): Promise<number> => {
  const { rowCount } = await executor.execute(sql`
    DELETE FROM idempotency_requests
    WHERE id IN (
      SELECT id FROM idempotency_requests
      WHERE expires_at < now()
      ORDER BY expires_at
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
  `)
  return rowCount ?? 0
}
