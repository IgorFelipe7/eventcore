import { type PendingOutboxEvent, type Transaction } from '@eventcore/db'

export interface NotificationSink {
  readonly name: string
  deliver(event: PendingOutboxEvent, tx: Transaction): Promise<void>
}

export class PermanentDeliveryError extends Error {
  override readonly name = 'PermanentDeliveryError'
}
