import { describe, expect, it } from 'vitest'
import { en } from '@/i18n/dictionaries/en'
import { ptBR } from '@/i18n/dictionaries/pt-br'
import { localePath, splitLocale } from '@/i18n/locales'

const shape = (value: unknown): unknown => {
  if (typeof value === 'function') return 'function'
  if (Array.isArray(value)) return value.map(shape)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([key, entry]) => [key, shape(entry)]),
    )
  }
  return typeof value
}

describe('dictionaries', () => {
  it('give Portuguese exactly the keys, lists and functions English has', () => {
    const englishProblems = Object.keys(ptBR.api.problems)
    expect(shape({ ...ptBR, api: { ...ptBR.api, problems: {} } })).toEqual(
      shape({ ...en, api: { ...en.api, problems: {} } }),
    )
    expect(englishProblems.length).toBeGreaterThan(0)
  })

  it('never leave a Portuguese string empty or identical to a long English sentence', () => {
    const walk = (english: unknown, portuguese: unknown, path: string): string[] => {
      if (typeof english === 'string' && typeof portuguese === 'string') {
        if (portuguese.trim() === '') return [path]
        return english.length > 40 && english === portuguese ? [path] : []
      }
      if (english && typeof english === 'object' && portuguese && typeof portuguese === 'object') {
        return Object.keys(english).flatMap((key) =>
          walk(
            (english as Record<string, unknown>)[key],
            (portuguese as Record<string, unknown>)[key],
            `${path}.${key}`,
          ),
        )
      }
      return []
    }
    expect(walk(en, ptBR, 'dictionary')).toEqual([])
  })
})

describe('locale paths', () => {
  it('prefix Portuguese paths and leave English at the root', () => {
    expect(localePath('en', '/lab?scenario=rush')).toBe('/lab?scenario=rush')
    expect(localePath('pt-BR', '/')).toBe('/pt-br')
    expect(localePath('pt-BR', '/lab?scenario=rush')).toBe('/pt-br/lab?scenario=rush')
    expect(localePath('pt-BR', '/?x=1')).toBe('/pt-br?x=1')
    expect(localePath('pt-BR', '#fig-1')).toBe('#fig-1')
    expect(localePath('pt-BR', 'https://example.com')).toBe('https://example.com')
  })

  it('split a request path into its locale and the route it renders', () => {
    expect(splitLocale('/pt-br')).toEqual({ locale: 'pt-BR', path: '/' })
    expect(splitLocale('/pt-br/events/a/b')).toEqual({ locale: 'pt-BR', path: '/events/a/b' })
    expect(splitLocale('/pt-brx')).toEqual({ locale: 'en', path: '/pt-brx' })
    expect(splitLocale('/explore')).toEqual({ locale: 'en', path: '/explore' })
  })
})
