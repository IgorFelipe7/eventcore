import { type Database, purgeExpiredIdempotencyKeys, readIntegrity } from '@eventcore/db'

export interface MaintenanceReport {
  readonly purgedIdempotencyKeys: number
  readonly invariantViolations: readonly string[]
}

export const runMaintenance = async (db: Database): Promise<MaintenanceReport> => {
  const purgedIdempotencyKeys = await purgeExpiredIdempotencyKeys(db, 1_000)
  const integrity = await readIntegrity(db, 'all')
  const invariantViolations = integrity
    .filter(
      (row) =>
        row.confirmedCount < 0 ||
        row.confirmedCount > row.capacity ||
        row.confirmedCount !== row.confirmedRows ||
        (row.waitlistedRows > 0 && row.confirmedCount < row.capacity),
    )
    .map((row) => row.eventId)
  return { purgedIdempotencyKeys, invariantViolations }
}
