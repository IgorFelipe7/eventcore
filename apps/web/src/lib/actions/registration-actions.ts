'use server'

import {
  CancellationResultSchema,
  IdSchema,
  IdempotencyKeySchema,
  RegistrationResultSchema,
} from '@eventcore/contracts'
import { refresh } from 'next/cache'
import { type CommandState } from '@/features/registrations/action-state'
import { type ApiResult, callApi } from '../api'
import { readSession } from '../session'

const readForm = (formData: FormData, field: string, schema: typeof IdSchema) => {
  const parsed = schema.safeParse(formData.get(field))
  if (!parsed.success) throw new Error(`The form is missing a valid ${field}.`)
  return parsed.data
}

const failure = (result: Exclude<ApiResult<unknown>, { ok: true }>, key: string): CommandState =>
  result.kind === 'problem'
    ? {
        kind: 'problem',
        key,
        code: result.problem.code,
        title: result.problem.title,
        detail: result.problem.detail ?? null,
        retryable: result.problem.retryable,
        requestId: result.problem.requestId,
      }
    : { kind: 'unavailable', key }

export async function registerForEventAction(
  _previous: CommandState,
  formData: FormData,
): Promise<CommandState> {
  const session = await readSession()
  if (!session) return { kind: 'needs-persona' }

  const eventId = readForm(formData, 'eventId', IdSchema)
  const key = IdempotencyKeySchema.parse(formData.get('idempotencyKey'))

  const result = await callApi(`/v1/events/${eventId}/registrations`, {
    method: 'POST',
    schema: RegistrationResultSchema,
    token: session.token,
    idempotencyKey: key,
    body: { source: 'web' },
  })
  if (!result.ok) return failure(result, key)

  refresh()
  return {
    kind: 'registered',
    key,
    registrationId: result.data.registrationId,
    status: result.data.status,
    transition: result.data.transition,
    waitlistPosition: result.data.waitlistPosition,
    inventory: result.data.inventory,
    replayed: result.replayed,
    requestId: result.data.requestId,
    answeredRequestId: result.requestId,
  }
}

export async function cancelRegistrationAction(
  _previous: CommandState,
  formData: FormData,
): Promise<CommandState> {
  const session = await readSession()
  if (!session) return { kind: 'needs-persona' }

  const registrationId = readForm(formData, 'registrationId', IdSchema)
  const key = IdempotencyKeySchema.parse(formData.get('idempotencyKey'))

  const result = await callApi(`/v1/registrations/${registrationId}/cancel`, {
    method: 'POST',
    schema: CancellationResultSchema,
    token: session.token,
    idempotencyKey: key,
    body: {},
  })
  if (!result.ok) return failure(result, key)

  refresh()
  return {
    kind: 'cancelled',
    key,
    transition: result.data.transition,
    promoted: result.data.promotedRegistrationId !== null,
    replayed: result.replayed,
    requestId: result.data.requestId,
  }
}
