export {
  createDatabase,
  type Database,
  type DatabaseHandle,
  type DatabaseOptions,
  type Executor,
  type Transaction,
} from './client'
export { MIGRATIONS_FOLDER, runMigrations } from './migrations'
export * from './repositories/audit'
export * from './repositories/events'
export * from './repositories/identity'
export * from './repositories/idempotency'
export * from './repositories/inventory'
export * from './repositories/outbox'
export * from './repositories/reads'
export * from './repositories/registrations'
export {
  PG_ERROR,
  isDatabaseUnavailable,
  isSerializationFailure,
  isUniqueViolation,
  pgErrorCode,
} from './errors'
export { seedDemo, type SeedSummary } from './seed'
