import { createDatabase } from '@eventcore/db'
import { buildApp } from './app'
import { loadConfig } from './config'

const config = loadConfig()
const database = createDatabase(config.databaseUrl, {
  maxConnections: config.databasePoolSize,
  applicationName: 'eventcore-api',
})
const app = await buildApp({ db: database.db, config })

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down')
  await app.close()
  await database.close()
  process.exit(0)
}

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))

await app.listen({ host: config.host, port: config.port })
