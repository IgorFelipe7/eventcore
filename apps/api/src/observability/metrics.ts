import { type Database, outboxStats, readIntegrity } from '@eventcore/db'
import { type FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client'
import { ProblemError } from '../http/problem'

export interface ApiMetrics {
  readonly registry: Registry
  readonly registrations: Counter<'status'>
  readonly cancellations: Counter<'promoted'>
  readonly idempotentReplays: Counter<'action'>
}

declare module 'fastify' {
  interface FastifyInstance {
    metrics: ApiMetrics
  }
}

const statusClass = (statusCode: number) => `${Math.floor(statusCode / 100)}xx`

export const metricsPlugin = fp<{ db: Database; token: string | undefined }>(
  async (app: FastifyInstance, { db, token }) => {
    const registry = new Registry()
    registry.setDefaultLabels({ service: 'eventcore-api' })
    collectDefaultMetrics({ register: registry })

    const requests = new Counter({
      name: 'http_requests_total',
      help: 'HTTP requests by route and status class.',
      labelNames: ['method', 'route', 'status_class'] as const,
      registers: [registry],
    })
    const duration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration by route.',
      labelNames: ['method', 'route'] as const,
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
      registers: [registry],
    })
    const registrations = new Counter({
      name: 'registrations_total',
      help: 'Registration decisions that produced an effect, by resulting status.',
      labelNames: ['status'] as const,
      registers: [registry],
    })
    const cancellations = new Counter({
      name: 'cancellations_total',
      help: 'Cancellations that produced an effect, by whether they promoted someone.',
      labelNames: ['promoted'] as const,
      registers: [registry],
    })
    const idempotentReplays = new Counter({
      name: 'idempotent_replays_total',
      help: 'Requests answered from a stored idempotent response.',
      labelNames: ['action'] as const,
      registers: [registry],
    })

    new Gauge({
      name: 'outbox_pending',
      help: 'Outbox events waiting for delivery.',
      registers: [registry],
      async collect() {
        this.set((await outboxStats(db)).pending)
      },
    })
    new Gauge({
      name: 'outbox_dead_lettered',
      help: 'Outbox events that exhausted their attempts.',
      registers: [registry],
      async collect() {
        this.set((await outboxStats(db)).deadLettered)
      },
    })
    new Gauge({
      name: 'business_invariant_violations',
      help: 'Events whose inventory breaks I1, the counter projection or the no-idle-seat rule.',
      registers: [registry],
      async collect() {
        const rows = await readIntegrity(db, 'all')
        this.set(
          rows.filter(
            (row) =>
              row.confirmedCount > row.capacity ||
              row.confirmedCount !== row.confirmedRows ||
              (row.waitlistedRows > 0 && row.confirmedCount < row.capacity),
          ).length,
        )
      },
    })

    app.decorate('metrics', { registry, registrations, cancellations, idempotentReplays })

    app.addHook('onResponse', async (request, reply) => {
      const route = request.routeOptions.url ?? 'unmatched'
      if (route === '/metrics') return
      requests.inc({ method: request.method, route, status_class: statusClass(reply.statusCode) })
      duration.observe({ method: request.method, route }, reply.elapsedTime / 1_000)
    })

    app.get(
      '/metrics',
      { schema: { hide: true }, config: { rateLimit: false } },
      async (request, reply) => {
        if (token && request.headers.authorization !== `Bearer ${token}`) {
          throw new ProblemError('UNAUTHENTICATED', 'Metrics require the metrics token.')
        }
        return reply.type(registry.contentType).send(await registry.metrics())
      },
    )
  },
  { name: 'eventcore-metrics' },
)
