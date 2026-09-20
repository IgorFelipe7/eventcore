import { type DatabaseHandle } from '@eventcore/db'
import { sql } from 'drizzle-orm'

export type NaiveOutcome = 'CONFIRMED' | 'SOLD_OUT'

export const naiveRegister = async (
  handle: DatabaseHandle,
  eventId: string,
  userId: string,
): Promise<NaiveOutcome> => {
  const { rows } = await handle.db.execute<{ capacity: number; confirmed: number }>(sql`
    SELECT i.capacity,
      (SELECT count(*)::int FROM registrations r WHERE r.event_id = i.event_id AND r.status = 'CONFIRMED') AS confirmed
    FROM event_inventory i
    WHERE i.event_id = ${eventId}
  `)
  const [snapshot] = rows
  if (!snapshot) throw new Error('Event not found.')
  if (snapshot.confirmed >= snapshot.capacity) return 'SOLD_OUT'

  await handle.db.execute(sql`
    INSERT INTO registrations (event_id, user_id, status) VALUES (${eventId}, ${userId}, 'CONFIRMED')
  `)
  return 'CONFIRMED'
}
