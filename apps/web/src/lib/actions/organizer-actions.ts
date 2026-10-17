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
import { getI18n } from '@/i18n/server'
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

const fieldErrors = (
  errors: readonly { path: string; message: string }[] | undefined,
  fallback: string | null,
) =>
  Object.fromEntries(
    (errors ?? []).map((error) => [
      error.path.split('.').at(-1) ?? error.path,
      fallback ?? error.message,
    ]),
  )

const problemState = async (
  problem: {
    code: string
    title: string
    detail?: string | undefined
    errors?: readonly { path: string; message: string }[] | undefined
  },
  withFields: boolean,
): Promise<OrganizerFormState> => {
  const { locale, t } = await getI18n()
  const translated = t.api.problems[problem.code]
  return {
    kind: 'error',
    message: translated ?? problem.detail ?? problem.title,
    fields: withFields
      ? fieldErrors(problem.errors, locale === 'en' ? null : t.newEvent.invalidField)
      : {},
  }
}

const unavailable = async (): Promise<OrganizerFormState> => {
  const { t } = await getI18n()
  return { kind: 'error', message: t.panel.unavailable, fields: {} }
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
    return result.kind === 'problem' ? problemState(result.problem, true) : unavailable()
  }
  const { href } = await getI18n()
  redirect(href(`/dashboard/events/${result.data.id}`))
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
    return result.kind === 'problem' ? problemState(result.problem, false) : unavailable()
  }
  refresh()
  const { t } = await getI18n()
  return {
    kind: 'done',
    message: t.panel.moved(t.status.eventLower[result.data.status] ?? result.data.status),
  }
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
    return result.kind === 'problem' ? problemState(result.problem, true) : unavailable()
  }
  refresh()
  const { t } = await getI18n()
  return {
    kind: 'done',
    message: t.panel.capacityNow(
      result.data.inventory.capacity,
      result.data.promotedRegistrationIds.length,
      result.replayed,
    ),
  }
}
