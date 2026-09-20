import { createDatabase } from '../client'
import { runMigrations } from '../migrations'
import { requireDatabaseUrl, report } from './shared'

const handle = createDatabase(requireDatabaseUrl(), {
  maxConnections: 1,
  applicationName: 'eventcore-migrate',
})

try {
  await runMigrations(handle.db)
  report('Migrations applied.')
} finally {
  await handle.close()
}
