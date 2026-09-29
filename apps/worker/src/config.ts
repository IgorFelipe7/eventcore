import { z } from 'zod'

const EnvironmentSchema = z.object({
  DATABASE_URL: z.url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(50).default(1_000),
  WORKER_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(25),
  WORKER_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(50).default(8),
  WORKER_MAINTENANCE_INTERVAL_MS: z.coerce.number().int().min(1_000).default(60_000),
})

export interface WorkerConfig {
  readonly databaseUrl: string
  readonly logLevel: string
  readonly pollIntervalMs: number
  readonly batchSize: number
  readonly maxAttempts: number
  readonly maintenanceIntervalMs: number
}

export const loadWorkerConfig = (environment: NodeJS.ProcessEnv = process.env): WorkerConfig => {
  const parsed = EnvironmentSchema.safeParse(environment)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Invalid worker configuration: ${fields}.`)
  }
  return {
    databaseUrl: parsed.data.DATABASE_URL,
    logLevel: parsed.data.LOG_LEVEL,
    pollIntervalMs: parsed.data.WORKER_POLL_INTERVAL_MS,
    batchSize: parsed.data.WORKER_BATCH_SIZE,
    maxAttempts: parsed.data.WORKER_MAX_ATTEMPTS,
    maintenanceIntervalMs: parsed.data.WORKER_MAINTENANCE_INTERVAL_MS,
  }
}
