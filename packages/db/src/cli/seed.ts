import { createDatabase } from '../client'
import { seedDemo } from '../seed'
import { report, requireDatabaseUrl } from './shared'

if (process.env['NODE_ENV'] === 'production' && process.env['ALLOW_DEMO_SEED'] !== 'true') {
  throw new Error(
    'Refusing to reset data in production. Set ALLOW_DEMO_SEED=true for a demo environment.',
  )
}

const handle = createDatabase(requireDatabaseUrl(), {
  maxConnections: 1,
  applicationName: 'eventcore-seed',
})

try {
  const summary = await seedDemo(handle.db)
  report(
    `Seeded ${summary.organizations} organizations, ${summary.personas} demo personas and ${summary.events} events.`,
  )
} finally {
  await handle.close()
}
