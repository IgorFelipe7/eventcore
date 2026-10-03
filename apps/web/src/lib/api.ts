import 'server-only'
import {
  IDEMPOTENCY_KEY_HEADER,
  IDEMPOTENT_REPLAYED_HEADER,
  type ProblemDetails,
  ProblemDetailsSchema,
} from '@eventcore/contracts'
import { type z } from 'zod'
import { serverEnv } from './env'

export type ApiResult<T> =
  | {
      readonly ok: true
      readonly data: T
      readonly replayed: boolean
      readonly requestId: string | null
    }
  | { readonly ok: false; readonly kind: 'problem'; readonly problem: ProblemDetails }
  | { readonly ok: false; readonly kind: 'unavailable'; readonly reason: string }

export interface ApiRequest<T> {
  readonly schema: z.ZodType<T>
  readonly method?: 'GET' | 'POST' | 'PATCH'
  readonly token?: string | null
  readonly body?: unknown
  readonly idempotencyKey?: string
  readonly timeoutMs?: number
}

export const callApi = async <T>(path: string, request: ApiRequest<T>): Promise<ApiResult<T>> => {
  const headers: Record<string, string> = { accept: 'application/json' }
  if (request.token) headers['authorization'] = `Bearer ${request.token}`
  if (request.idempotencyKey) headers[IDEMPOTENCY_KEY_HEADER] = request.idempotencyKey
  if (request.body !== undefined) headers['content-type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(new URL(path, serverEnv().EVENTCORE_API_URL), {
      method: request.method ?? 'GET',
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(request.timeoutMs ?? 5_000),
    })
  } catch (error) {
    return {
      ok: false,
      kind: 'unavailable',
      reason: error instanceof Error ? error.name : 'NetworkError',
    }
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const problem = ProblemDetailsSchema.safeParse(payload)
    return problem.success
      ? { ok: false, kind: 'problem', problem: problem.data }
      : { ok: false, kind: 'unavailable', reason: `HTTP ${response.status}` }
  }

  const parsed = request.schema.safeParse(payload)
  if (!parsed.success) return { ok: false, kind: 'unavailable', reason: 'ContractMismatch' }

  return {
    ok: true,
    data: parsed.data,
    replayed: response.headers.get(IDEMPOTENT_REPLAYED_HEADER) === 'true',
    requestId: response.headers.get('x-request-id'),
  }
}
