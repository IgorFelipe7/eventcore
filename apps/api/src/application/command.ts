import { type ProblemCode } from '@eventcore/contracts'
import { type Actor } from '../auth/authenticate'
import { buildProblem } from '../http/problem'

export interface CommandContext {
  readonly actor: Actor
  readonly requestId: string
  readonly instance: string
  readonly now: Date
}

export interface CommandResponse {
  readonly status: number
  readonly body: unknown
}

export const ok = (body: unknown, status = 200): CommandResponse => ({ status, body })

export const rejected = (
  code: ProblemCode,
  context: CommandContext,
  detail?: string,
): CommandResponse => {
  const problem = buildProblem(code, context, detail)
  return { status: problem.status, body: problem }
}
