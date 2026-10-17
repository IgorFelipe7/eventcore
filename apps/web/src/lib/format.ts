import { type Locale } from '@/i18n/locales'
import { publicConfig } from './public-config'

const zone = publicConfig.displayTimeZone

const INTL_LOCALE: Record<Locale, string> = { en: 'en-GB', 'pt-BR': 'pt-BR' }

const OPTIONS = {
  dateTime: {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: zone,
    timeZoneName: 'short',
  },
  dayMonth: { day: '2-digit', month: 'short', timeZone: zone },
  clock: { hour: '2-digit', minute: '2-digit', timeZone: zone },
  snapshot: {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false,
    timeZone: zone,
  },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>

type Pattern = keyof typeof OPTIONS

const cache = new Map<string, Intl.DateTimeFormat>()

const formatter = (pattern: Pattern, locale: Locale) => {
  const key = `${pattern}:${locale}`
  let format = cache.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat(INTL_LOCALE[locale], OPTIONS[pattern])
    cache.set(key, format)
  }
  return format
}

export const formatDateTime = (iso: string, locale: Locale = 'en') =>
  formatter('dateTime', locale).format(new Date(iso))

export const formatDayMonth = (iso: string, locale: Locale = 'en') =>
  formatter('dayMonth', locale).format(new Date(iso)).replace('.', '').toUpperCase()

export const formatClock = (iso: string, locale: Locale = 'en') =>
  formatter('clock', locale).format(new Date(iso))

export const formatSnapshot = (iso: string, locale: Locale = 'en') =>
  formatter('snapshot', locale).format(new Date(iso))

export const shortId = (id: string) => id.slice(-6)
