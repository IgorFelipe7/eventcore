import { startTestDatabaseServer } from '@eventcore/db/testing'
import { type TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext {
    databaseAdminUrl: string
  }
}

export default async function setup(project: TestProject) {
  const server = await startTestDatabaseServer()
  project.provide('databaseAdminUrl', server.adminUrl)
  return () => server.stop()
}
