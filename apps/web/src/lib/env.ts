import 'server-only'
import { z } from 'zod'

const ServerEnvironmentSchema = z.object({
  EVENTCORE_API_URL: z.url().default('http://localhost:4000'),
  AUTH_ISSUER: z.string().min(1).default('https://auth.eventcore.local'),
  AUTH_AUDIENCE: z.string().min(1).default('eventcore-api'),
  AUTH_DEMO_SECRET: z
    .string()
    .optional()
    .transform((value) => (value && value.length >= 32 ? value : undefined)),
})

export type ServerEnvironment = z.infer<typeof ServerEnvironmentSchema>

let cached: ServerEnvironment | undefined

export const serverEnv = (): ServerEnvironment => {
  cached ??= ServerEnvironmentSchema.parse(process.env)
  return cached
}
