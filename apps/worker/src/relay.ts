import {
  type Database,
  claimPendingOutbox,
  deadLetterOutbox,
  markOutboxPublished,
  scheduleOutboxRetry,
} from '@eventcore/db'
import { type BackoffPolicy, DEFAULT_BACKOFF, retryDelayMs } from './backoff'
import { type NotificationSink, PermanentDeliveryError } from './sink'

export interface RelayOptions {
  readonly batchSize: number
  readonly maxAttempts: number
  readonly backoff?: BackoffPolicy
}

export interface RelayReport {
  readonly claimed: number
  readonly delivered: number
  readonly retried: number
  readonly deadLettered: number
}

const describe = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown delivery failure'

export const relayOutboxBatch = (
  db: Database,
  sink: NotificationSink,
  options: RelayOptions,
): Promise<RelayReport> =>
  db.transaction(async (tx) => {
    const batch = await claimPendingOutbox(tx, options.batchSize)
    let delivered = 0
    let retried = 0
    let deadLettered = 0

    for (const event of batch) {
      try {
        await tx.transaction((savepoint) => sink.deliver(event, savepoint))
        await markOutboxPublished(tx, event.id)
        delivered += 1
      } catch (error) {
        const attempts = event.attempts + 1
        if (error instanceof PermanentDeliveryError || attempts >= options.maxAttempts) {
          await deadLetterOutbox(tx, event.id, describe(error))
          deadLettered += 1
        } else {
          await scheduleOutboxRetry(
            tx,
            event.id,
            retryDelayMs(event.attempts, options.backoff ?? DEFAULT_BACKOFF),
            describe(error),
          )
          retried += 1
        }
      }
    }

    return { claimed: batch.length, delivered, retried, deadLettered }
  })
