import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema'

export type Database = NodePgDatabase<typeof schema>
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
export type Executor = Database | Transaction

export interface DatabaseHandle {
  readonly db: Database
  readonly pool: pg.Pool
  close(): Promise<void>
}

export interface DatabaseOptions {
  readonly maxConnections?: number
  readonly applicationName?: string
  readonly statementTimeoutMs?: number
  readonly onIdleError?: (error: Error) => void
}

export const createDatabase = (
  connectionString: string,
  options: DatabaseOptions = {},
): DatabaseHandle => {
  const pool = new pg.Pool({
    connectionString,
    max: options.maxConnections ?? 10,
    application_name: options.applicationName ?? 'eventcore',
    statement_timeout: options.statementTimeoutMs ?? 5_000,
    idleTimeoutMillis: 30_000,
  })
  pool.on('error', (error) => options.onIdleError?.(error))
  const db = drizzle(pool, { schema })
  return { db, pool, close: () => pool.end() }
}
