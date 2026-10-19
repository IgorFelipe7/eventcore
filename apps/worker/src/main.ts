import { setTimeout as sleep } from 'node:timers/promises'
import { createDatabase, isDatabaseUnavailable } from '@eventcore/db'
import pino from 'pino'
import { loadWorkerConfig } from './config'
import { demoMailbox } from './demo-mailbox'
import { runMaintenance } from './maintenance'
import { relayOutboxBatch } from './relay'

const config = loadWorkerConfig()
const logger = pino({ level: config.logLevel, base: { service: 'eventcore-worker' } })
const database = createDatabase(config.databaseUrl, {
  maxConnections: 4,
  applicationName: 'eventcore-worker',
  onIdleError: (error) =>
    logger.warn({ err: error, operation: 'database.idle' }, 'idle database connection closed'),
})
const stopping = new AbortController()

const stop = (signal: string) => {
  logger.info({ signal }, 'stopping after the current batch')
  stopping.abort()
}
process.once('SIGINT', () => stop('SIGINT'))
process.once('SIGTERM', () => stop('SIGTERM'))

const idle = async (ms: number) => {
  try {
    await sleep(ms, undefined, { signal: stopping.signal })
  } catch {
    return
  }
}

let nextMaintenanceAt = 0
logger.info({ sink: demoMailbox.name, batch_size: config.batchSize }, 'outbox relay started')

while (!stopping.signal.aborted) {
  try {
    const report = await relayOutboxBatch(database.db, demoMailbox, config)
    if (report.claimed > 0) logger.info({ operation: 'outbox.relay', ...report }, 'batch processed')

    if (Date.now() >= nextMaintenanceAt) {
      const maintenance = await runMaintenance(database.db)
      nextMaintenanceAt = Date.now() + config.maintenanceIntervalMs
      if (maintenance.invariantViolations.length > 0) {
        logger.error(
          { operation: 'integrity.sweep', event_ids: maintenance.invariantViolations },
          'business invariant violation detected',
        )
      }
      if (maintenance.purgedIdempotencyKeys > 0) {
        logger.info({ operation: 'idempotency.purge', purged: maintenance.purgedIdempotencyKeys })
      }
    }

    if (report.claimed < config.batchSize) await idle(config.pollIntervalMs)
  } catch (error) {
    const level = isDatabaseUnavailable(error) ? 'warn' : 'error'
    logger[level]({ err: error, operation: 'outbox.relay' }, 'relay iteration failed')
    await idle(config.pollIntervalMs * 5)
  }
}

await database.close()
logger.info('outbox relay stopped')
