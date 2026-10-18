import { headers } from 'next/headers'
import { Link } from '@/i18n/link'
import { LOCALES, LOCALE_NAMES, localePath, splitLocale } from '@/i18n/locales'
import { getI18n } from '@/i18n/server'
import { demoSigningAvailable, readSession } from '@/lib/session'
import { BrandMark } from './brand-mark'
import { PersonaSwitcher } from './persona-switcher'

const isActive = (path: string, href: string) => path === href || path.startsWith(`${href}/`)

export async function SiteHeader() {
  const [{ locale, t }, session, requestHeaders] = await Promise.all([
    getI18n(),
    readSession(),
    headers(),
  ])
  const returnTo = requestHeaders.get('x-eventcore-path') ?? '/'
  const { path } = splitLocale(returnTo.split('?')[0] ?? '/')
  const query = returnTo.includes('?') ? returnTo.slice(returnTo.indexOf('?')) : ''
  const personal =
    session?.persona.kind === 'organizer'
      ? { href: '/dashboard', label: t.nav.dashboard }
      : session
        ? { href: '/me/registrations', label: t.nav.myRegistrations }
        : null
  const navigation = [
    { href: '/explore', label: t.nav.board },
    { href: '/lab', label: t.nav.lab },
    { href: '/architecture', label: t.nav.architecture },
    { href: '/api-docs', label: t.nav.api },
    ...(personal ? [personal] : []),
  ]
  const linkClass =
    'flex min-h-9 shrink-0 items-center rounded-full px-3.5 text-sm text-ink-2 transition-colors duration-200 hover:bg-[rgb(238_241_246/0.06)] hover:text-ink aria-[current=page]:bg-[rgb(238_241_246/0.1)] aria-[current=page]:text-ink'

  return (
    <header data-site-header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <a
        href="#main"
        className="sr-only rounded-full focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        {t.common.skipToContent}
      </a>
      <div className="glass mx-auto flex h-14 max-w-[82.5rem] items-center gap-2 rounded-full pl-4 pr-2 sm:pl-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-display text-[1.05rem] font-semibold tracking-[-0.02em] font-stretch-115%"
        >
          <BrandMark />
          <span>EventCore</span>
        </Link>
        <nav aria-label={t.nav.primary} className="ml-auto hidden items-center gap-0.5 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(path, item.href) ? 'page' : undefined}
              className={linkClass}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <nav
          aria-label={t.nav.language}
          className="ml-auto flex items-center rounded-full border border-rule p-0.5 font-mono text-[0.7rem] md:ml-2"
        >
          {LOCALES.map((candidate) => (
            <a
              key={candidate}
              href={`${localePath(candidate, path)}${query}`}
              hrefLang={candidate}
              lang={candidate}
              aria-current={candidate === locale ? 'true' : undefined}
              className="flex min-h-8 min-w-9 items-center justify-center rounded-full text-ink-3 transition-colors hover:text-ink aria-current:bg-ink aria-current:text-paper"
            >
              {LOCALE_NAMES[candidate].short}
              <span className="sr-only"> · {LOCALE_NAMES[candidate].long}</span>
            </a>
          ))}
        </nav>
        <PersonaSwitcher session={session} available={demoSigningAvailable()} returnTo={returnTo} />
      </div>
      <nav
        aria-label={t.nav.compact}
        className="glass mx-auto mt-2 flex max-w-[82.5rem] gap-0.5 overflow-x-auto rounded-full p-1 [scrollbar-width:none] md:hidden"
      >
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(path, item.href) ? 'page' : undefined}
            className={linkClass}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
