import { randomBytes } from 'node:crypto'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import pg from 'pg'
import { createDatabase } from './client'
import { runMigrations } from './migrations'

export const TEMPLATE_DATABASE = 'eventcore_template'

export interface TestDatabaseServer {
  readonly adminUrl: string
  stop(): Promise<void>
}

const withDatabase = (url: string, database: string): string => {
  const parsed = new URL(url)
  parsed.pathname = `/${database}`
  return parsed.toString()
}

const runAdmin = async (adminUrl: string, statement: string): Promise<void> => {
  const client = new pg.Client({ connectionString: adminUrl })
  await client.connect()
  try {
    await client.query(statement)
  } finally {
    await client.end()
  }
}

const prepareTemplate = async (adminUrl: string): Promise<void> => {
  await runAdmin(adminUrl, `DROP DATABASE IF EXISTS ${TEMPLATE_DATABASE} WITH (FORCE)`)
  await runAdmin(adminUrl, `CREATE DATABASE ${TEMPLATE_DATABASE}`)
  const template = createDatabase(withDatabase(adminUrl, TEMPLATE_DATABASE), { maxConnections: 1 })
  try {
    await runMigrations(template.db)
  } finally {
    await template.close()
  }
}

export const startTestDatabaseServer = async (): Promise<TestDatabaseServer> => {
  const external = process.env['TEST_DATABASE_ADMIN_URL']
  if (external) {
    await prepareTemplate(external)
    return { adminUrl: external, stop: async () => undefined }
  }

  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer('postgres:18-alpine')
    .withDatabase('postgres')
    .withCommand(['postgres', '-c', 'max_connections=400', '-c', 'fsync=off'])
    .start()
  const adminUrl = container.getConnectionUri()
  await prepareTemplate(adminUrl)
  return { adminUrl, stop: async () => void (await container.stop()) }
}

export const createIsolatedDatabase = async (adminUrl: string): Promise<string> => {
  const name = `eventcore_test_${randomBytes(6).toString('hex')}`
  await runAdmin(adminUrl, `CREATE DATABASE ${name} TEMPLATE ${TEMPLATE_DATABASE}`)
  return withDatabase(adminUrl, name)
}
