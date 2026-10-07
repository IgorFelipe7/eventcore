import { z } from 'zod'

export const LabAttemptSchema = z.object({
  actor: z.string(),
  kind: z.enum(['register', 'retry', 'cancel', 'capacity', 'probe', 'relay']),
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative(),
  httpStatus: z.number().int().nullable(),
  result: z.string(),
  replayed: z.boolean(),
  decisionIndex: z.number().int().positive().nullable(),
  position: z.number().int().positive().nullable(),
})

export type LabAttempt = z.infer<typeof LabAttemptSchema>

export const LabCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  passed: z.boolean(),
  detail: z.string(),
})

export type LabCheck = z.infer<typeof LabCheckSchema>

export const LabLatencySchema = z.object({
  samples: z.number().int().nonnegative(),
  p50: z.number().nonnegative(),
  p95: z.number().nonnegative(),
  p99: z.number().nonnegative(),
  max: z.number().nonnegative(),
})

export type LabLatency = z.infer<typeof LabLatencySchema>

export const LabVariantSchema = z.object({
  id: z.string(),
  label: z.string(),
  summary: z.string(),
  safe: z.boolean(),
  attempts: z.array(LabAttemptSchema),
  outcome: z.record(z.string(), z.number().int().nonnegative()),
  checks: z.array(LabCheckSchema),
  latency: LabLatencySchema.nullable(),
  final: z.object({
    capacity: z.number().int(),
    confirmedRows: z.number().int(),
    waitlistedRows: z.number().int(),
  }),
})

export type LabVariant = z.infer<typeof LabVariantSchema>

export const LabEnvironmentSchema = z.object({
  recordedAt: z.iso.datetime({ offset: true }),
  commit: z.string(),
  node: z.string(),
  postgres: z.string(),
  platform: z.string(),
  cpu: z.string(),
  transport: z.string(),
  poolSize: z.number().int().positive(),
})

export type LabEnvironment = z.infer<typeof LabEnvironmentSchema>

export const LabReplaySchema = z.object({
  id: z.string(),
  order: z.number().int(),
  title: z.string(),
  question: z.string(),
  setup: z.string(),
  testFile: z.string(),
  environment: LabEnvironmentSchema,
  variants: z.array(LabVariantSchema).min(1),
  limits: z.array(z.string()),
})

export type LabReplay = z.infer<typeof LabReplaySchema>
