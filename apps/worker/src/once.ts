import { createDatabase } from '@eventcore/db'
import pino from 'pino'
import { loadWorkerConfig } from './config'
import { demoMailbox } from './demo-mailbox'
import { drainOutbox } from './drain'
import { runMaintenance } from './maintenance'

const config = loadWorkerConfig()
const logger = pino({ level: config.logLevel, base: { service: 'eventcore-worker' } })
const database = createDatabase(config.databaseUrl, {
  maxConnections: 2,
  applicationName: 'eventcore-worker',
  onIdleError: (error) =>
    logger.warn({ err: error, operation: 'database.idle' }, 'idle database connection closed'),
})

try {
  const drained = await drainOutbox(database.db, demoMailbox, {
    batchSize: config.batchSize,
    maxAttempts: config.maxAttempts,
    maxBatches: config.drainMaxBatches,
  })
  logger.info({ operation: 'outbox.drain', ...drained }, 'outbox drained')

  const maintenance = await runMaintenance(database.db)
  if (maintenance.purgedIdempotencyKeys > 0) {
    logger.info({ operation: 'idempotency.purge', purged: maintenance.purgedIdempotencyKeys })
  }
  if (maintenance.invariantViolations.length > 0) {
    logger.error(
      { operation: 'integrity.sweep', event_ids: maintenance.invariantViolations },
      'business invariant violation detected',
    )
    process.exitCode = 1
  }
} finally {
  await database.close()
}
