import Link from 'next/link'
import { publicConfig } from '@/lib/public-config'

const LINKS = [
  { href: '/explore', label: 'Event board' },
  { href: '/lab', label: 'Reliability Lab' },
  { href: '/architecture', label: 'Architecture' },
  { href: '/api-docs', label: 'API reference' },
  { href: '/dashboard', label: 'Organizer dashboard' },
  { href: '/me/registrations', label: 'My registrations' },
] as const

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-night-line bg-night text-night-ink">
      <div className="sheet-frame grid gap-10 pb-6 pt-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-night-muted">
            {'// End of set'}
          </p>
          <p className="mt-4 max-w-md text-lg text-night-ink">
            Every number on these sheets comes from the database or from a recorded run —{' '}
            <span className="font-accent text-[1.08em] italic text-signal-glow">
              and says which
            </span>
            .
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm md:col-span-4"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              className="w-fit text-night-muted underline-offset-4 hover:text-night-ink hover:underline"
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="text-sm text-night-muted md:col-span-3">
          <p>Fictional events and demo personas only.</p>
          {publicConfig.repositoryUrl ? (
            <a
              className="mt-2 inline-block underline hover:text-night-ink"
              href={publicConfig.repositoryUrl}
            >
              Source code
            </a>
          ) : (
            <p className="mt-2">MIT licensed · Igor Felipe, 2026</p>
          )}
        </div>
      </div>
      <div
        aria-hidden
        className="sheet-frame flex items-end gap-[0.06em] pb-4 pt-8 font-display font-semibold leading-[0.78] tracking-[-0.045em] text-night-3 [font-size:clamp(4.5rem,1rem+15vw,16rem)]"
      >
        <span>EventCore</span>
        <span className="mb-[0.08em] inline-grid size-[0.42em] shrink-0 grid-cols-2 gap-[0.04em]">
          <span className="bg-night-3" />
          <span className="bg-night-3" />
          <span className="bg-night-3" />
          <span className="bg-signal-glow shadow-[0_0_40px_var(--color-signal-glow)]" />
        </span>
      </div>
    </footer>
  )
}
