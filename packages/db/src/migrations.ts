import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { type Database } from './client'

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../migrations', import.meta.url))

export const runMigrations = (db: Database, migrationsFolder = MIGRATIONS_FOLDER) =>
  migrate(db, { migrationsFolder })
