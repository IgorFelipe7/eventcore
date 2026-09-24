import { randomUUID } from 'node:crypto'
import { type IncomingMessage } from 'node:http'
import { REQUEST_ID_HEADER } from '@eventcore/contracts'

const ACCEPTED_REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/

export const generateRequestId = (request: IncomingMessage): string => {
  const incoming = request.headers[REQUEST_ID_HEADER]
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming
  return candidate && ACCEPTED_REQUEST_ID.test(candidate) ? candidate : randomUUID()
}
