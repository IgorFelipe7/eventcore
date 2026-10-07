import { randomUUID } from 'node:crypto'
import { type App } from '@eventcore/api'
import { type LabAttempt, type LabEnvironment, type LabReplay } from '@eventcore/contracts'
import { type DatabaseHandle } from '@eventcore/db'
import { type NotificationSink, demoMailbox, relayOutboxBatch } from '@eventcore/worker'
import { sql } from 'drizzle-orm'
import { bearer } from '../support/api'
import { createEventFixture, createUsers } from '../support/fixtures'
import { naiveRegister } from '../support/naive-registration'
import { cancel, changeCapacity, register } from '../support/requests'
import {
  attemptFrom,
  capacityChecks,
  countBy,
  decisionOrder,
  latencyOf,
  measure,
  startStopwatch,
} from './recording'

export interface ScenarioContext {
  readonly handle: DatabaseHandle
  readonly api: App
  readonly environment: LabEnvironment
}

const label = (prefix: string, index: number) => `${prefix}${String(index + 1).padStart(3, '0')}`

export const lastSeat = async ({
  handle,
  api,
  environment,
}: ScenarioContext): Promise<LabReplay> => {
  const fixture = await createEventFixture(handle, { capacity: 1 })
  const [first, second] = await createUsers(handle, 2)
  const watch = startStopwatch()
  const responses = await Promise.all(
    [first, second].map((user) => measure(watch, () => register(api, user, fixture.eventId))),
  )
  const decisions = await decisionOrder(handle, fixture.eventId)
  const attempts = responses.map((response, index) =>
    attemptFrom(index === 0 ? 'A' : 'B', 'register', response, decisions),
  )
  const { checks, final } = await capacityChecks(handle, fixture.eventId)

  const rounds = 30
  let perfectRounds = 0
  for (let round = 0; round < rounds; round += 1) {
    const event = await createEventFixture(handle, { capacity: 1 })
    const [left, right] = await createUsers(handle, 2)
    const results = await Promise.all(
      [left, right].map((user) => register(api, user, event.eventId)),
    )
    const statuses = results.map((result) => result.body['status']).sort()
    if (statuses[0] === 'CONFIRMED' && statuses[1] === 'WAITLISTED') perfectRounds += 1
  }

  return {
    id: 'last-seat',
    order: 1,
    title: 'Two people, one seat',
    question: 'When two requests reach the last seat at the same moment, does exactly one get it?',
    setup:
      'Capacity 1, waitlist on. Two participants send their registration concurrently, then the same race is repeated on 30 fresh events.',
    testFile: 'tests/concurrency/last-seat.test.ts',
    environment,
    variants: [
      {
        id: 'locked',
        label: 'EventCore',
        summary: 'One request confirms, the other is first in line — in every one of the 31 races.',
        safe: true,
        attempts,
        outcome: countBy(attempts),
        checks: [
          ...checks,
          {
            id: 'R30',
            label: 'Repeated races',
            passed: perfectRounds === rounds,
            detail: `${perfectRounds} of ${rounds} extra rounds ended with exactly one confirmation`,
          },
        ],
        latency: latencyOf(attempts),
        final,
      },
    ],
    limits: [
      'Two requests is the smallest possible race; it proves correctness, not throughput.',
      'Both requests share one Node.js process and one connection pool.',
    ],
  }
}

export const rush = async ({ handle, api, environment }: ScenarioContext): Promise<LabReplay> => {
  const participants = 100
  const capacity = 10

  const naiveEvent = await createEventFixture(handle, { capacity })
  const naiveUsers = await createUsers(handle, participants)
  const naiveWatch = startStopwatch()
  const naive = await Promise.all(
    naiveUsers.map((user) =>
      measure(naiveWatch, () => naiveRegister(handle, naiveEvent.eventId, user.id)),
    ),
  )
  const naiveAttempts: LabAttempt[] = naive.map((measured, index) => ({
    actor: label('P', index),
    kind: 'register',
    startMs: measured.startMs,
    endMs: measured.endMs,
    httpStatus: null,
    result: measured.value,
    replayed: false,
    decisionIndex: null,
    position: null,
  }))
  const naiveIntegrity = await capacityChecks(handle, naiveEvent.eventId)

  const lockedEvent = await createEventFixture(handle, { capacity })
  const lockedUsers = await createUsers(handle, participants)
  const watch = startStopwatch()
  const locked = await Promise.all(
    lockedUsers.map((user) => measure(watch, () => register(api, user, lockedEvent.eventId))),
  )
  const decisions = await decisionOrder(handle, lockedEvent.eventId)
  const lockedAttempts = locked.map((measured, index) =>
    attemptFrom(label('P', index), 'register', measured, decisions),
  )
  const lockedIntegrity = await capacityChecks(handle, lockedEvent.eventId)

  return {
    id: 'rush',
    order: 2,
    title: 'One hundred people, ten seats',
    question: 'Under a burst of 100 concurrent registrations for 10 seats, how many are confirmed?',
    setup:
      'Capacity 10, waitlist on, 100 distinct participants sent concurrently. The baseline runs the same load through a check-then-insert implementation with no lock, directly against the same database.',
    testFile: 'tests/concurrency/naive-baseline.test.ts',
    environment,
    variants: [
      {
        id: 'naive',
        label: 'Naive baseline',
        summary: `Read the count, then insert: ${naiveIntegrity.final.confirmedRows} people confirmed for ${capacity} seats.`,
        safe: false,
        attempts: naiveAttempts,
        outcome: countBy(naiveAttempts),
        checks: naiveIntegrity.checks,
        latency: latencyOf(naiveAttempts),
        final: naiveIntegrity.final,
      },
      {
        id: 'locked',
        label: 'EventCore',
        summary: `${lockedIntegrity.final.confirmedRows} confirmed, ${lockedIntegrity.final.waitlistedRows} waitlisted in a gapless order.`,
        safe: true,
        attempts: lockedAttempts,
        outcome: countBy(lockedAttempts),
        checks: lockedIntegrity.checks,
        latency: latencyOf(lockedAttempts),
        final: lockedIntegrity.final,
      },
    ],
    limits: [
      'The baseline bypasses HTTP, so its timings are not comparable with the locked run — only its outcome is.',
      'Latency is measured by the caller and includes waiting for the pool and for the inventory lock.',
      'One machine, one database, one event. This says nothing about throughput across many events.',
    ],
  }
}

export const doubleClick = async ({
  handle,
  api,
  environment,
}: ScenarioContext): Promise<LabReplay> => {
  const fixture = await createEventFixture(handle, { capacity: 5 })
  const [participant] = await createUsers(handle, 1)
  const key = randomUUID()
  const watch = startStopwatch()
  const responses = await Promise.all(
    Array.from({ length: 10 }, () =>
      measure(watch, () => register(api, participant, fixture.eventId, { key })),
    ),
  )
  const decisions = await decisionOrder(handle, fixture.eventId)
  const attempts = responses.map((response, index) =>
    attemptFrom(`click ${index + 1}`, 'register', response, decisions),
  )
  const { checks, final } = await capacityChecks(handle, fixture.eventId)
  const bodies = new Set(responses.map((response) => JSON.stringify(response.value.body)))

  return {
    id: 'double-click',
    order: 3,
    title: 'Ten clicks, one intent',
    question:
      'If the same request is sent ten times at once with one idempotency key, how many effects happen?',
    setup:
      'Capacity 5. One participant fires ten identical requests concurrently with the same Idempotency-Key.',
    testFile: 'tests/http/idempotency.test.ts',
    environment,
    variants: [
      {
        id: 'locked',
        label: 'EventCore',
        summary: `One decision, ${attempts.filter((attempt) => attempt.replayed).length} replays of it, ${bodies.size} distinct answer.`,
        safe: true,
        attempts,
        outcome: countBy(attempts),
        checks: [
          ...checks,
          {
            id: 'I3',
            label: 'Identical answers',
            passed: bodies.size === 1,
            detail: `${bodies.size} distinct response bodies across ${attempts.length} requests`,
          },
        ],
        latency: latencyOf(attempts),
        final,
      },
    ],
    limits: [
      'The replays wait on the unique index until the first transaction commits; that wait is part of their latency.',
    ],
  }
}

export const lostResponse = async ({
  handle,
  api,
  environment,
}: ScenarioContext): Promise<LabReplay> => {
  const fixture = await createEventFixture(handle, { capacity: 1 })
  const [first, second] = await createUsers(handle, 2)
  const key = randomUUID()
  const watch = startStopwatch()
  const original = await measure(watch, () => register(api, first, fixture.eventId, { key }))
  const competitor = await measure(watch, () => register(api, second, fixture.eventId))
  const retry = await measure(watch, () => register(api, first, fixture.eventId, { key }))
  const decisions = await decisionOrder(handle, fixture.eventId)
  const attempts = [
    attemptFrom('A · response lost', 'register', original, decisions),
    attemptFrom('B', 'register', competitor, decisions),
    attemptFrom('A · retry, same key', 'retry', retry, decisions),
  ]
  const { checks, final } = await capacityChecks(handle, fixture.eventId)
  const identical = JSON.stringify(original.value.body) === JSON.stringify(retry.value.body)

  return {
    id: 'lost-response',
    order: 4,
    title: 'The answer that never arrived',
    question: 'If the server commits but the client never hears back, what does the retry get?',
    setup:
      'Capacity 1. A registers and the client pretends it lost the response; B takes the queue spot; A retries with the same key.',
    testFile: 'tests/http/idempotency.test.ts',
    environment,
    variants: [
      {
        id: 'locked',
        label: 'EventCore',
        summary:
          'The retry is answered from the stored response: the original confirmation, not a new decision.',
        safe: true,
        attempts,
        outcome: countBy(attempts),
        checks: [
          ...checks,
          {
            id: 'I3·R',
            label: 'Retry replays the original',
            passed: identical && attempts[2]?.replayed === true,
            detail: identical ? 'Byte-identical body, Idempotent-Replayed: true' : 'Bodies differ',
          },
        ],
        latency: latencyOf(attempts),
        final,
      },
    ],
    limits: ['The lost response is simulated by ignoring it; no network failure is injected.'],
  }
}

export const cancellationRace = async ({
  handle,
  api,
  environment,
}: ScenarioContext): Promise<LabReplay> => {
  const fixture = await createEventFixture(handle, { capacity: 10 })
  const holders = await createUsers(handle, 10)
  const queued = await createUsers(handle, 15)
  const holderRegistrations: string[] = []
  for (const holder of holders) {
    holderRegistrations.push(
      String((await register(api, holder, fixture.eventId)).body['registrationId']),
    )
  }
  const queuedRegistrations: string[] = []
  for (const user of queued) {
    queuedRegistrations.push(
      String((await register(api, user, fixture.eventId)).body['registrationId']),
    )
  }
  const newcomers = await createUsers(handle, 20)

  const watch = startStopwatch()
  const [cancellations, arrivals] = await Promise.all([
    Promise.all(
      holders.map((holder, index) =>
        measure(watch, () => cancel(api, holder, holderRegistrations[index] ?? '')),
      ),
    ),
    Promise.all(
      newcomers.map((newcomer) => measure(watch, () => register(api, newcomer, fixture.eventId))),
    ),
  ])
  const decisions = await decisionOrder(handle, fixture.eventId)
  const attempts = [
    ...cancellations.map((measured, index) =>
      attemptFrom(label('H', index), 'cancel', measured, decisions),
    ),
    ...arrivals.map((measured, index) =>
      attemptFrom(label('N', index), 'register', measured, decisions),
    ),
  ].sort((a, b) => a.startMs - b.startMs)

  const promoted = new Set(
    cancellations
      .map((measured) => measured.value.body['promotedRegistrationId'])
      .filter((id): id is string => typeof id === 'string'),
  )
  const expected = queuedRegistrations.slice(0, 10)
  const fifo = expected.every((id) => promoted.has(id)) && promoted.size === expected.length
  const overtook = arrivals.filter(
    (measured) => measured.value.body['status'] === 'CONFIRMED',
  ).length
  const { checks, final } = await capacityChecks(handle, fixture.eventId)

  return {
    id: 'cancellation-race',
    order: 5,
    title: 'Ten leave, twenty arrive',
    question: 'When seats are released while newcomers keep arriving, who gets them?',
    setup:
      'Capacity 10, all taken, 15 already queued in a known order. Ten holders cancel while 20 newcomers register, all concurrently.',
    testFile: 'tests/concurrency/waitlist.test.ts',
    environment,
    variants: [
      {
        id: 'locked',
        label: 'EventCore',
        summary: `The first ${expected.length} in line were promoted; ${overtook} newcomers overtook the queue.`,
        safe: true,
        attempts,
        outcome: countBy(attempts),
        checks: [
          ...checks,
          {
            id: 'I5',
            label: 'Promotion is first in, first out',
            passed: fifo,
            detail: `${[...promoted].filter((id) => expected.includes(id)).length} of the first ${expected.length} queued were promoted`,
          },
          {
            id: 'I5·N',
            label: 'Newcomers wait behind the queue',
            passed: overtook === 0,
            detail: `${overtook} newcomers confirmed directly`,
          },
        ],
        latency: latencyOf(attempts),
        final,
      },
    ],
    limits: [
      'The queue was built sequentially before the race so that its order is known in advance.',
    ],
  }
}

export const capacityRace = async ({
  handle,
  api,
  environment,
}: ScenarioContext): Promise<LabReplay> => {
  const fixture = await createEventFixture(handle, { capacity: 5 })
  const participants = await createUsers(handle, 60)
  const capacities = [8, 12, 10, 20, 15]
  const watch = startStopwatch()
  const [registrations, changes] = await Promise.all([
    Promise.all(
      participants.map((user) => measure(watch, () => register(api, user, fixture.eventId))),
    ),
    Promise.all(
      capacities.map((capacity) =>
        measure(watch, () =>
          changeCapacity(api, fixture.admin, fixture.organizationId, fixture.eventId, capacity),
        ),
      ),
    ),
  ])
  const decisions = await decisionOrder(handle, fixture.eventId)
  const attempts = [
    ...registrations.map((measured, index) =>
      attemptFrom(label('P', index), 'register', measured, decisions),
    ),
    ...changes.map((measured, index): LabAttempt => ({
      actor: `admin → ${capacities[index]}`,
      kind: 'capacity',
      startMs: measured.startMs,
      endMs: measured.endMs,
      httpStatus: measured.value.status,
      result:
        measured.value.status === 200
          ? `CAPACITY ${capacities[index]}`
          : String(measured.value.body['code']),
      replayed: false,
      decisionIndex: null,
      position: null,
    })),
  ].sort((a, b) => a.startMs - b.startMs)
  const { checks, final } = await capacityChecks(handle, fixture.eventId)

  return {
    id: 'capacity-race',
    order: 6,
    title: 'Moving the walls during the rush',
    question:
      'If an admin changes capacity five times while 60 people register, does anything break?',
    setup:
      'Capacity starts at 5. Sixty registrations and five capacity changes (8, 12, 10, 20, 15) run concurrently.',
    testFile: 'tests/concurrency/capacity.test.ts',
    environment,
    variants: [
      {
        id: 'locked',
        label: 'EventCore',
        summary: `Final capacity ${final.capacity}: ${final.confirmedRows} confirmed, ${final.waitlistedRows} waiting. Changes that would cut below confirmed seats were refused.`,
        safe: true,
        attempts,
        outcome: countBy(attempts),
        checks,
        latency: latencyOf(attempts.filter((attempt) => attempt.kind === 'register')),
        final,
      },
    ],
    limits: [
      'Which capacity wins depends on lock order, which is not deterministic; the invariants hold either way.',
    ],
  }
}

export const crossTenant = async ({
  handle,
  api,
  environment,
}: ScenarioContext): Promise<LabReplay> => {
  const ours = await createEventFixture(handle, { capacity: 5 })
  const theirs = await createEventFixture(handle, { capacity: 5 })
  const headers = await bearer(ours.admin)
  const probes: {
    actor: string
    method: 'GET' | 'PATCH' | 'POST'
    url: string
    payload?: object
  }[] = [
    {
      actor: 'List their events',
      method: 'GET',
      url: `/v1/organizations/${theirs.organizationId}/events`,
    },
    {
      actor: 'Read their audit trail',
      method: 'GET',
      url: `/v1/organizations/${theirs.organizationId}/audit`,
    },
    {
      actor: 'Their event through our path',
      method: 'GET',
      url: `/v1/organizations/${ours.organizationId}/events/${theirs.eventId}`,
    },
    {
      actor: 'Rename their venue',
      method: 'PATCH',
      url: `/v1/organizations/${ours.organizationId}/events/${theirs.eventId}`,
      payload: { venue: 'Hijacked' },
    },
    {
      actor: 'Cancel their event',
      method: 'POST',
      url: `/v1/organizations/${ours.organizationId}/events/${theirs.eventId}/status`,
      payload: { status: 'CANCELLED' },
    },
    {
      actor: 'List their attendees',
      method: 'GET',
      url: `/v1/organizations/${ours.organizationId}/events/${theirs.eventId}/registrations`,
    },
  ]
  const watch = startStopwatch()
  const attempts: LabAttempt[] = []
  for (const probe of probes) {
    const measured = await measure(watch, async () => {
      const response = await api.inject({
        method: probe.method,
        url: probe.url,
        headers,
        ...(probe.payload ? { payload: probe.payload } : {}),
      })
      return response
    })
    const body = measured.value.json<{ code?: string }>()
    attempts.push({
      actor: probe.actor,
      kind: 'probe',
      startMs: measured.startMs,
      endMs: measured.endMs,
      httpStatus: measured.value.statusCode,
      result: `${measured.value.statusCode} ${body.code ?? 'OK'}`,
      replayed: false,
      decisionIndex: null,
      position: null,
    })
  }
  const { rows } = await handle.db.execute<{ venue: string; status: string }>(
    sql`SELECT venue, status FROM events WHERE id = ${theirs.eventId}`,
  )
  const untouched = rows[0]?.venue === 'Fixture hall' && rows[0]?.status === 'PUBLISHED'
  const { checks, final } = await capacityChecks(handle, theirs.eventId)

  return {
    id: 'cross-tenant',
    order: 7,
    title: 'An admin of the wrong organization',
    question: 'Can an admin of one organization read or change another organization’s event?',
    setup:
      'Two organizations. Their admin is authenticated and valid — just for the other organization. Six probes, read and write.',
    testFile: 'tests/security/tenant-isolation.test.ts',
    environment,
    variants: [
      {
        id: 'locked',
        label: 'EventCore',
        summary:
          'Every probe was refused: 403 on their routes, 404 when their event was reached through our path.',
        safe: true,
        attempts,
        outcome: countBy(attempts),
        checks: [
          {
            id: 'I4',
            label: 'Every probe refused',
            passed: attempts.every((attempt) => (attempt.httpStatus ?? 0) >= 400),
            detail: `${attempts.filter((attempt) => (attempt.httpStatus ?? 0) >= 400).length} of ${attempts.length} refused`,
          },
          {
            id: 'I4·W',
            label: 'Their data unchanged',
            passed: untouched,
            detail: untouched ? 'Venue and status exactly as before' : 'Their event changed',
          },
          ...checks.slice(0, 1),
        ],
        latency: null,
        final,
      },
    ],
    limits: ['Probes are sequential; tenancy is a property of each request, not of concurrency.'],
  }
}

const providerDown: NotificationSink = {
  name: 'provider-down',
  deliver: () => Promise.reject(new Error('ECONNREFUSED provider.example:443')),
}

export const providerOutage = async ({
  handle,
  api,
  environment,
}: ScenarioContext): Promise<LabReplay> => {
  await handle.db.execute(
    sql`UPDATE outbox_events SET published_at = now() WHERE published_at IS NULL`,
  )
  const fixture = await createEventFixture(handle, { capacity: 4 })
  const participants = await createUsers(handle, 4)
  const options = { batchSize: 50, maxAttempts: 5, backoff: { baseDelayMs: 0, maxDelayMs: 0 } }
  const watch = startStopwatch()
  const registrations = await Promise.all(
    participants.map((user) => measure(watch, () => register(api, user, fixture.eventId))),
  )
  const outage = await measure(watch, () => relayOutboxBatch(handle.db, providerDown, options))
  await handle.db.execute(
    sql`UPDATE outbox_events SET next_attempt_at = now() WHERE published_at IS NULL`,
  )
  const recovery = await measure(watch, () => relayOutboxBatch(handle.db, demoMailbox, options))
  const again = await measure(watch, () => relayOutboxBatch(handle.db, demoMailbox, options))
  const decisions = await decisionOrder(handle, fixture.eventId)

  const relayAttempt = (actor: string, measured: typeof outage, text: string): LabAttempt => ({
    actor,
    kind: 'relay',
    startMs: measured.startMs,
    endMs: measured.endMs,
    httpStatus: null,
    result: text,
    replayed: false,
    decisionIndex: null,
    position: null,
  })
  const attempts = [
    ...registrations.map((measured, index) =>
      attemptFrom(label('P', index), 'register', measured, decisions),
    ),
    relayAttempt('relay · provider down', outage, `RETRY ${outage.value.retried}`),
    relayAttempt('relay · provider back', recovery, `DELIVERED ${recovery.value.delivered}`),
    relayAttempt('relay · run again', again, `CLAIMED ${again.value.claimed}`),
  ]
  const { rows } = await handle.db.execute<{ deliveries: number }>(sql`
    SELECT count(*)::int AS deliveries FROM notification_deliveries d
    JOIN outbox_events o ON o.id = d.outbox_event_id
    WHERE (o.payload ->> 'eventId')::uuid = ${fixture.eventId}
  `)
  const deliveries = rows[0]?.deliveries ?? 0
  const { checks, final } = await capacityChecks(handle, fixture.eventId)

  return {
    id: 'provider-outage',
    order: 8,
    title: 'The email provider is down',
    question: 'If notifications can’t be delivered, are registrations lost, delayed or duplicated?',
    setup:
      'Four registrations commit while the notification provider refuses connections. The relay retries, the provider comes back, and the relay runs once more.',
    testFile: 'tests/resilience/outbox.test.ts',
    environment,
    variants: [
      {
        id: 'locked',
        label: 'EventCore',
        summary: `All 4 registrations committed during the outage; ${deliveries} notifications delivered after recovery, none twice.`,
        safe: true,
        attempts,
        outcome: countBy(attempts),
        checks: [
          ...checks.slice(0, 2),
          {
            id: 'I7',
            label: 'Exactly one notification per change',
            passed: deliveries === 4 && again.value.claimed === 0,
            detail: `${deliveries} deliveries for 4 committed changes; the extra relay run claimed ${again.value.claimed}`,
          },
          {
            id: 'I7·D',
            label: 'Nothing lost during the outage',
            passed: outage.value.retried === 4,
            detail: `${outage.value.retried} events scheduled for retry, ${outage.value.deadLettered} dead-lettered`,
          },
        ],
        latency: latencyOf(attempts.filter((attempt) => attempt.kind === 'register')),
        final,
      },
    ],
    limits: [
      'The outage is a sink that refuses every delivery; the backoff is set to zero so the run takes seconds, not minutes.',
    ],
  }
}

export const SCENARIOS = [
  lastSeat,
  rush,
  doubleClick,
  lostResponse,
  cancellationRace,
  capacityRace,
  crossTenant,
  providerOutage,
] as const
