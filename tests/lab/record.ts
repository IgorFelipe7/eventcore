import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { LabReplaySchema } from '@eventcore/contracts'
import { createDatabase } from '@eventcore/db'
import { createIsolatedDatabase, startTestDatabaseServer } from '@eventcore/db/testing'
import { createTestApi } from '../support/api'
import { readEnvironment } from './recording'
import { SCENARIOS } from './scenarios'

const POOL_SIZE = 40
const OUTPUT = fileURLToPath(new URL('../../apps/web/src/lab/replays/', import.meta.url))

const log = (message: string) => process.stdout.write(`${message}\n`)

const server = await startTestDatabaseServer()
const url = await createIsolatedDatabase(server.adminUrl)
const handle = createDatabase(url, { maxConnections: POOL_SIZE, applicationName: 'eventcore-lab' })
const api = await createTestApi({ db: handle.db, url })

try {
  const environment = await readEnvironment(handle, POOL_SIZE)
  await mkdir(OUTPUT, { recursive: true })
  log(`Recording against ${environment.postgres} at commit ${environment.commit}`)

  for (const scenario of SCENARIOS) {
    const replay = LabReplaySchema.parse(await scenario({ handle, api, environment }))
    await writeFile(`${OUTPUT}${replay.id}.json`, `${JSON.stringify(replay, null, 2)}\n`)
    const verdict = replay.variants
      .map(
        (variant) =>
          `${variant.label}: ${variant.checks.every((check) => check.passed) ? 'all checks pass' : 'checks fail'}`,
      )
      .join(' · ')
    log(`  ${replay.order}. ${replay.title} — ${verdict}`)
  }
} finally {
  await api.close()
  await handle.close()
  await server.stop()
}
