import { type Database } from '@eventcore/db'
import { type RelayOptions, type RelayReport, relayOutboxBatch } from './relay'
import { type NotificationSink } from './sink'

export interface DrainOptions extends RelayOptions {
  readonly maxBatches: number
}

export interface DrainReport extends RelayReport {
  readonly batches: number
}

export const drainOutbox = async (
  db: Database,
  sink: NotificationSink,
  options: DrainOptions,
): Promise<DrainReport> => {
  let claimed = 0
  let delivered = 0
  let retried = 0
  let deadLettered = 0
  let batches = 0

  while (batches < options.maxBatches) {
    const report = await relayOutboxBatch(db, sink, options)
    batches += 1
    claimed += report.claimed
    delivered += report.delivered
    retried += report.retried
    deadLettered += report.deadLettered
    if (report.claimed < options.batchSize) break
  }

  return { claimed, delivered, retried, deadLettered, batches }
}
