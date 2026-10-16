export const LOCALES = ['en', 'pt-BR'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_HEADER = 'x-eventcore-locale'

const SEGMENTS: Record<Locale, string> = { en: '', 'pt-BR': '/pt-br' }

export const LOCALE_NAMES: Record<Locale, { short: string; long: string }> = {
  en: { short: 'EN', long: 'English' },
  'pt-BR': { short: 'PT', long: 'Português (Brasil)' },
}

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value)

export const localePath = (locale: Locale, path: string) => {
  const segment = SEGMENTS[locale]
  if (!segment || !path.startsWith('/') || path.startsWith('//')) return path
  if (path === '/') return segment
  if (path.startsWith('/?') || path.startsWith('/#')) return `${segment}${path.slice(1)}`
  return `${segment}${path}`
}

export const splitLocale = (pathname: string): { locale: Locale; path: string } => {
  for (const locale of LOCALES) {
    const segment = SEGMENTS[locale]
    if (!segment) continue
    if (pathname === segment) return { locale, path: '/' }
    if (pathname.startsWith(`${segment}/`)) return { locale, path: pathname.slice(segment.length) }
  }
  return { locale: DEFAULT_LOCALE, path: pathname }
}
