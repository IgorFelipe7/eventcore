export interface BackoffPolicy {
  readonly baseDelayMs: number
  readonly maxDelayMs: number
}

export const DEFAULT_BACKOFF: BackoffPolicy = { baseDelayMs: 1_000, maxDelayMs: 15 * 60_000 }

export const retryDelayMs = (
  attemptsSoFar: number,
  policy: BackoffPolicy = DEFAULT_BACKOFF,
  random: () => number = Math.random,
): number => {
  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** Math.max(0, attemptsSoFar))
  return Math.round(ceiling / 2 + random() * (ceiling / 2))
}
