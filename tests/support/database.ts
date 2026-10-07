import { type DatabaseHandle, createDatabase } from '@eventcore/db'
import { createIsolatedDatabase } from '@eventcore/db/testing'
import { inject } from 'vitest'

export * from './fixtures'

export interface TestDatabase extends DatabaseHandle {
  readonly url: string
}

export const createTestDatabase = async (maxConnections = 40): Promise<TestDatabase> => {
  const url = await createIsolatedDatabase(inject('databaseAdminUrl'))
  return { ...createDatabase(url, { maxConnections, applicationName: 'eventcore-tests' }), url }
}
