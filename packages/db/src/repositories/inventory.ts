import { type InventorySnapshot } from '@eventcore/domain'
import { sql } from 'drizzle-orm'
import { type Executor } from '../client'

export interface LockedInventory extends InventorySnapshot {
  readonly eventId: string
  readonly version: number
}

interface InventoryRow extends Record<string, unknown> {
  event_id: string
  capacity: number
  confirmed_count: number
  version: number
}

const toInventory = (row: InventoryRow): LockedInventory => ({
  eventId: row.event_id,
  capacity: row.capacity,
  confirmedCount: row.confirmed_count,
  version: row.version,
})

export const lockInventory = async (
  executor: Executor,
  eventId: string,
): Promise<LockedInventory | null> => {
  const { rows } = await executor.execute<InventoryRow>(sql`
    SELECT event_id, capacity, confirmed_count, version
    FROM event_inventory
    WHERE event_id = ${eventId}
    FOR UPDATE
  `)
  return rows[0] ? toInventory(rows[0]) : null
}

export const adjustConfirmedCount = async (
  executor: Executor,
  eventId: string,
  delta: number,
): Promise<LockedInventory> => {
  const { rows } = await executor.execute<InventoryRow>(sql`
    UPDATE event_inventory
    SET confirmed_count = confirmed_count + ${delta},
        version = version + 1,
        updated_at = now()
    WHERE event_id = ${eventId}
    RETURNING event_id, capacity, confirmed_count, version
  `)
  const [row] = rows
  if (!row) throw new Error(`Inventory for event ${eventId} disappeared mid-transaction.`)
  return toInventory(row)
}

export const setCapacity = async (
  executor: Executor,
  eventId: string,
  capacity: number,
): Promise<LockedInventory> => {
  const { rows } = await executor.execute<InventoryRow>(sql`
    UPDATE event_inventory
    SET capacity = ${capacity},
        version = version + 1,
        updated_at = now()
    WHERE event_id = ${eventId}
    RETURNING event_id, capacity, confirmed_count, version
  `)
  const [row] = rows
  if (!row) throw new Error(`Inventory for event ${eventId} disappeared mid-transaction.`)
  return toInventory(row)
}

export const insertInventory = async (
  executor: Executor,
  eventId: string,
  capacity: number,
): Promise<void> => {
  await executor.execute(sql`
    INSERT INTO event_inventory (event_id, capacity) VALUES (${eventId}, ${capacity})
  `)
}
