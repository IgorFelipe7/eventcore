'use client'

import { type ReactNode, createContext, useContext } from 'react'
import { dictionaries } from './dictionaries'
import { type Locale, localePath } from './locales'

const I18nContext = createContext<Locale | null>(null)

export function I18nProvider({
  locale,
  children,
}: {
  readonly locale: Locale
  readonly children: ReactNode
}) {
  return <I18nContext value={locale}>{children}</I18nContext>
}

export function useI18n() {
  const locale = useContext(I18nContext)
  if (!locale) throw new Error('useI18n must be used inside I18nProvider.')
  return {
    locale,
    t: dictionaries[locale],
    href: (path: string) => localePath(locale, path),
  }
}
