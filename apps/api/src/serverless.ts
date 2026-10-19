import { type IncomingMessage, type ServerResponse } from 'node:http'
import { createDatabase } from '@eventcore/db'
import { buildApp } from './app'
import { loadConfig } from './config'

const config = loadConfig()
const database = createDatabase(config.databaseUrl, {
  maxConnections: config.databasePoolSize,
  applicationName: 'eventcore-api',
  onIdleError: (error) =>
    app.log.warn({ err: error, operation: 'database.idle' }, 'idle database connection closed'),
})
const app = await buildApp({ db: database.db, config })
await app.ready()

export default function handler(request: IncomingMessage, response: ServerResponse) {
  app.server.emit('request', request, response)
}
