import { describe, expect, it } from 'vitest'
import { retryDelayMs } from '../src/backoff'

const policy = { baseDelayMs: 1_000, maxDelayMs: 60_000 }

describe('retryDelayMs', () => {
  it('doubles the ceiling with every attempt and keeps at least half of it', () => {
    expect(retryDelayMs(0, policy, () => 0)).toBe(500)
    expect(retryDelayMs(0, policy, () => 1)).toBe(1_000)
    expect(retryDelayMs(3, policy, () => 0)).toBe(4_000)
    expect(retryDelayMs(3, policy, () => 1)).toBe(8_000)
  })

  it('never exceeds the configured maximum', () => {
    expect(retryDelayMs(40, policy, () => 1)).toBe(60_000)
  })

  it('spreads retries so a recovering provider is not hit by a synchronized wave', () => {
    const delays = new Set(Array.from({ length: 50 }, () => retryDelayMs(4, policy)))
    expect(delays.size).toBeGreaterThan(10)
  })
})
