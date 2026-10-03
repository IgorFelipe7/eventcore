import Link from 'next/link'
import { headers } from 'next/headers'
import { demoSigningAvailable, readSession } from '@/lib/session'
import { BrandMark } from './brand-mark'
import { PersonaSwitcher } from './persona-switcher'

const NAVIGATION = [
  { href: '/explore', label: 'Board', sheet: '02' },
  { href: '/lab', label: 'Lab', sheet: '04' },
  { href: '/architecture', label: 'Architecture', sheet: '06' },
  { href: '/api-docs', label: 'API', sheet: '06' },
] as const

export async function SiteHeader() {
  const session = await readSession()
  const returnTo = (await headers()).get('x-eventcore-path') ?? '/'
  const personal =
    session?.persona.kind === 'organizer'
      ? { href: '/dashboard', label: 'Dashboard' }
      : session
        ? { href: '/me/registrations', label: 'My registrations' }
        : null

  return (
    <header className="sticky top-0 z-20 border-b border-ink bg-paper/95 backdrop-blur-[2px]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <div className="sheet-frame flex min-h-16 items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-semibold">
          <BrandMark />
          <span>EventCore</span>
        </Link>
        <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 md:flex">
          {NAVIGATION.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-11 items-center gap-2 rounded-[2px] px-3 text-sm hover:bg-ink hover:text-paper"
            >
              <span className="label text-ink-3 group-hover:text-paper/60">{item.sheet}</span>
              {item.label}
            </Link>
          ))}
          {personal ? (
            <Link
              href={personal.href}
              className="flex min-h-11 items-center rounded-[2px] px-3 text-sm font-medium underline hover:bg-ink hover:text-paper"
            >
              {personal.label}
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto md:ml-2">
          <PersonaSwitcher
            session={session}
            available={demoSigningAvailable()}
            returnTo={returnTo}
          />
        </div>
      </div>
      <nav aria-label="Primary, compact" className="border-t border-rule md:hidden">
        <div className="sheet-frame flex gap-1 overflow-x-auto py-1">
          {[...NAVIGATION, ...(personal ? [{ ...personal, sheet: '' }] : [])].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-11 shrink-0 items-center rounded-[2px] px-3 text-sm hover:bg-ink hover:text-paper"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}
