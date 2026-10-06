'use server'

import {
  ChangeCapacityResponseSchema,
  IdSchema,
  IdempotencyKeySchema,
  OrganizerEventSchema,
} from '@eventcore/contracts'
import { EVENT_STATUSES } from '@eventcore/domain'
import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { callApi } from '../api'
import { readSession } from '../session'

export type OrganizerFormState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'done'; readonly message: string }
  | {
      readonly kind: 'error'
      readonly message: string
      readonly fields: Readonly<Record<string, string>>
    }

const fieldErrors = (errors: readonly { path: string; message: string }[] | undefined) =>
  Object.fromEntries(
    (errors ?? []).map((error) => [error.path.split('.').at(-1) ?? error.path, error.message]),
  )

const unavailable: OrganizerFormState = {
  kind: 'error',
  message: 'The API didn’t answer. Nothing was changed that you can’t safely retry.',
  fields: {},
}

const requireToken = async () => {
  const session = await readSession()
  if (!session || session.persona.kind !== 'organizer') {
    throw new Error('Act as an organizer persona first.')
  }
  return session.token
}

const localToIso = (value: FormDataEntryValue | null, offset: string) =>
  typeof value === 'string' && value ? new Date(`${value}:00${offset}`).toISOString() : ''

export async function createEventAction(
  _previous: OrganizerFormState,
  formData: FormData,
): Promise<OrganizerFormState> {
  const token = await requireToken()
  const organizationId = IdSchema.parse(formData.get('organizationId'))
  const offset = z
    .string()
    .regex(/^[+-]\d{2}:\d{2}$/)
    .catch('-03:00')
    .parse(formData.get('timezoneOffset'))

  const result = await callApi(`/v1/organizations/${organizationId}/events`, {
    method: 'POST',
    schema: OrganizerEventSchema,
    token,
    body: {
      slug: String(formData.get('slug') ?? '').trim(),
      name: String(formData.get('name') ?? ''),
      description: String(formData.get('description') ?? ''),
      venue: String(formData.get('venue') ?? ''),
      capacity: Number(formData.get('capacity')),
      waitlistEnabled: formData.get('waitlistEnabled') === 'on',
      startsAt: localToIso(formData.get('startsAt'), offset),
      enrollmentOpensAt: localToIso(formData.get('enrollmentOpensAt'), offset),
      enrollmentClosesAt: localToIso(formData.get('enrollmentClosesAt'), offset),
    },
  })

  if (!result.ok) {
    return result.kind === 'problem'
      ? {
          kind: 'error',
          message: result.problem.detail ?? result.problem.title,
          fields: fieldErrors(result.problem.errors),
        }
      : unavailable
  }
  redirect(`/dashboard/events/${result.data.id}`)
}

export async function transitionEventAction(
  _previous: OrganizerFormState,
  formData: FormData,
): Promise<OrganizerFormState> {
  const token = await requireToken()
  const organizationId = IdSchema.parse(formData.get('organizationId'))
  const eventId = IdSchema.parse(formData.get('eventId'))
  const status = z.enum(EVENT_STATUSES).parse(formData.get('status'))

  const result = await callApi(`/v1/organizations/${organizationId}/events/${eventId}/status`, {
    method: 'POST',
    schema: OrganizerEventSchema,
    token,
    body: { status },
  })
  if (!result.ok) {
    return result.kind === 'problem'
      ? { kind: 'error', message: result.problem.detail ?? result.problem.title, fields: {} }
      : unavailable
  }
  refresh()
  return { kind: 'done', message: `Moved to ${result.data.status.toLowerCase()}.` }
}

export async function changeCapacityAction(
  _previous: OrganizerFormState,
  formData: FormData,
): Promise<OrganizerFormState> {
  const token = await requireToken()
  const organizationId = IdSchema.parse(formData.get('organizationId'))
  const eventId = IdSchema.parse(formData.get('eventId'))
  const key = IdempotencyKeySchema.parse(formData.get('idempotencyKey'))

  const result = await callApi(`/v1/organizations/${organizationId}/events/${eventId}/capacity`, {
    method: 'POST',
    schema: ChangeCapacityResponseSchema,
    token,
    idempotencyKey: key,
    body: { capacity: Number(formData.get('capacity')) },
  })
  if (!result.ok) {
    return result.kind === 'problem'
      ? {
          kind: 'error',
          message: result.problem.detail ?? result.problem.title,
          fields: fieldErrors(result.problem.errors),
        }
      : unavailable
  }
  refresh()
  const promoted = result.data.promotedRegistrationIds.length
  return {
    kind: 'done',
    message: `Capacity is now ${result.data.inventory.capacity}.${promoted > 0 ? ` ${promoted} promoted from the waitlist in the same transaction.` : ''}${result.replayed ? ' (replayed)' : ''}`,
  }
}
