import 'server-only'
import { headers } from 'next/headers'
import { type Dictionary, dictionaries } from './dictionaries'
import { DEFAULT_LOCALE, LOCALE_HEADER, type Locale, isLocale, localePath } from './locales'

export async function getLocale(): Promise<Locale> {
  const value = (await headers()).get(LOCALE_HEADER)
  return isLocale(value) ? value : DEFAULT_LOCALE
}

export async function getI18n(): Promise<{
  locale: Locale
  t: Dictionary
  href: (path: string) => string
}> {
  const locale = await getLocale()
  return { locale, t: dictionaries[locale], href: (path) => localePath(locale, path) }
}
