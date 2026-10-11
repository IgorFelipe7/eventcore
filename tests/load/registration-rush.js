import { check } from 'k6'
import http from 'k6/http'
import { Counter } from 'k6/metrics'

const API = __ENV.API_URL || 'http://localhost:4000'
const EVENT_ID = __ENV.EVENT_ID
const TOKENS = (__ENV.TOKENS || '').split(',').filter(Boolean)

const unexpected = new Counter('unexpected_responses')

export const options = {
  scenarios: {
    rush: {
      executor: 'per-vu-iterations',
      vus: Number(__ENV.VUS || 100),
      iterations: 1,
      maxDuration: '1m',
    },
  },
  thresholds: {
    unexpected_responses: ['count==0'],
    'http_req_duration{expected_response:true}': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
}

export function setup() {
  if (!EVENT_ID || TOKENS.length === 0) {
    throw new Error('Set EVENT_ID and TOKENS (one demo token per virtual user, comma separated).')
  }
}

export default function () {
  const token = TOKENS[(__VU - 1) % TOKENS.length]
  const response = http.post(
    `${API}/v1/events/${EVENT_ID}/registrations`,
    JSON.stringify({ source: 'api' }),
    {
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'idempotency-key': `k6-${__VU}-${__ITER}-${Date.now()}`,
      },
    },
  )
  const expected = check(response, {
    'decided or rejected by business rules': (r) =>
      r.status === 200 || r.status === 201 || r.status === 409,
  })
  if (!expected) unexpected.add(1)
}
