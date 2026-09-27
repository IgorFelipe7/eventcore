import { randomUUID } from 'node:crypto'
import { type App } from '@eventcore/api'
import { bearer } from './api'

export interface Participant {
  readonly subject: string
  readonly displayName: string
}

export const register = async (
  api: App,
  participant: Participant,
  eventId: string,
  options: { key?: string | null; body?: Record<string, unknown> } = {},
) => {
  const key = options.key === undefined ? randomUUID() : options.key
  const response = await api.inject({
    method: 'POST',
    url: `/v1/events/${eventId}/registrations`,
    headers: { ...(await bearer(participant)), ...(key ? { 'idempotency-key': key } : {}) },
    payload: options.body ?? {},
  })
  return { status: response.statusCode, body: response.json(), headers: response.headers }
}

export const cancel = async (
  api: App,
  participant: Participant,
  registrationId: string,
  options: { key?: string | null } = {},
) => {
  const key = options.key === undefined ? randomUUID() : options.key
  const response = await api.inject({
    method: 'POST',
    url: `/v1/registrations/${registrationId}/cancel`,
    headers: { ...(await bearer(participant)), ...(key ? { 'idempotency-key': key } : {}) },
    payload: {},
  })
  return { status: response.statusCode, body: response.json(), headers: response.headers }
}

export const changeCapacity = async (
  api: App,
  actor: Participant,
  organizationId: string,
  eventId: string,
  capacity: number,
  options: { key?: string } = {},
) => {
  const response = await api.inject({
    method: 'POST',
    url: `/v1/organizations/${organizationId}/events/${eventId}/capacity`,
    headers: { ...(await bearer(actor)), 'idempotency-key': options.key ?? randomUUID() },
    payload: { capacity },
  })
  return { status: response.statusCode, body: response.json(), headers: response.headers }
}
