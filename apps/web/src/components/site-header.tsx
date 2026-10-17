import { headers } from 'next/headers'
import { Link } from '@/i18n/link'
import { LOCALES, LOCALE_NAMES, localePath, splitLocale } from '@/i18n/locales'
import { getI18n } from '@/i18n/server'
import { demoSigningAvailable, readSession } from '@/lib/session'
import { BrandMark } from './brand-mark'
import { PersonaSwitcher } from './persona-switcher'

export async function SiteHeader() {
  const [{ locale, t }, session, requestHeaders] = await Promise.all([
    getI18n(),
    readSession(),
    headers(),
  ])
  const returnTo = requestHeaders.get('x-eventcore-path') ?? '/'
  const { path } = splitLocale(returnTo.split('?')[0] ?? '/')
  const query = returnTo.includes('?') ? returnTo.slice(returnTo.indexOf('?')) : ''
  const navigation = [
    { href: '/explore', label: t.nav.board, sheet: '02' },
    { href: '/lab', label: t.nav.lab, sheet: '04' },
    { href: '/architecture', label: t.nav.architecture, sheet: '06' },
    { href: '/api-docs', label: t.nav.api, sheet: '06' },
  ]
  const personal =
    session?.persona.kind === 'organizer'
      ? { href: '/dashboard', label: t.nav.dashboard, sheet: '05' }
      : session
        ? { href: '/me/registrations', label: t.nav.myRegistrations, sheet: '03' }
        : null

  return (
    <header
      data-site-header
      className="sticky top-0 z-20 border-b border-ink bg-paper/95 backdrop-blur-md"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
      >
        {t.common.skipToContent}
      </a>
      <div className="sheet-frame flex min-h-16 items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-semibold">
          <BrandMark />
          <span>EventCore</span>
        </Link>
        <nav aria-label={t.nav.primary} className="ml-auto hidden items-center gap-1 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-11 items-center gap-2 rounded-xs px-3 text-sm hover:bg-ink hover:text-paper"
            >
              <span className="label text-ink-3 group-hover:text-paper/60">{item.sheet}</span>
              {item.label}
            </Link>
          ))}
          {personal ? (
            <Link
              href={personal.href}
              className="flex min-h-11 items-center rounded-xs px-3 text-sm font-medium underline hover:bg-ink hover:text-paper"
            >
              {personal.label}
            </Link>
          ) : null}
        </nav>
        <nav
          aria-label={t.nav.language}
          className="ml-auto flex items-center font-mono text-xs md:ml-2"
        >
          {LOCALES.map((candidate, index) => (
            <span key={candidate} className="flex items-center">
              {index > 0 ? (
                <span aria-hidden className="px-0.5 text-ink-3">
                  /
                </span>
              ) : null}
              <a
                href={`${localePath(candidate, path)}${query}`}
                hrefLang={candidate}
                lang={candidate}
                aria-label={LOCALE_NAMES[candidate].long}
                aria-current={candidate === locale ? 'true' : undefined}
                className="flex min-h-11 min-w-8 items-center justify-center rounded-xs text-ink-3 hover:text-ink aria-[current=true]:font-medium aria-[current=true]:text-ink"
              >
                {LOCALE_NAMES[candidate].short}
              </a>
            </span>
          ))}
        </nav>
        <div>
          <PersonaSwitcher
            session={session}
            available={demoSigningAvailable()}
            returnTo={returnTo}
          />
        </div>
      </div>
      <nav aria-label={t.nav.compact} className="border-t border-rule md:hidden">
        <div className="sheet-frame flex gap-1 overflow-x-auto py-1 [scrollbar-width:none]">
          {[...navigation, ...(personal ? [personal] : [])].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-11 shrink-0 items-center rounded-xs px-3 text-sm hover:bg-ink hover:text-paper"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}
