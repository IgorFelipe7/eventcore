import { describe, expect, it } from 'vitest'
import { REPLAYS } from '@/features/lab/replays'
import { localizeReplay, untranslatedReplayText } from '@/features/lab/replay-text'

describe('recorded replays in Portuguese', () => {
  it.each(REPLAYS.map((replay) => [replay.id, replay] as const))(
    'translate every sentence of %s',
    (_id, replay) => {
      expect(untranslatedReplayText(replay)).toEqual([])
    },
  )

  it('keep every measured number when translating', () => {
    for (const replay of REPLAYS) {
      const localized = localizeReplay(replay, 'pt-BR')
      replay.variants.forEach((variant, index) => {
        const digits = (text: string) => text.match(/\d+/g) ?? []
        expect(digits(localized.variants[index]?.summary ?? '')).toEqual(digits(variant.summary))
        variant.checks.forEach((check, checkIndex) => {
          expect(digits(localized.variants[index]?.checks[checkIndex]?.detail ?? '')).toEqual(
            digits(check.detail),
          )
        })
      })
    }
  })

  it('leave the English recording untouched', () => {
    const [first] = REPLAYS
    if (!first) throw new Error('No replays recorded.')
    expect(localizeReplay(first, 'en')).toBe(first)
  })
})
