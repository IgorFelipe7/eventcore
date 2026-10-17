import { Link } from '@/i18n/link'
import { getI18n } from '@/i18n/server'
import { publicConfig } from '@/lib/public-config'

export async function SiteFooter() {
  const { t } = await getI18n()
  const links = [
    { href: '/explore', label: t.footer.links.board },
    { href: '/lab', label: t.footer.links.lab },
    { href: '/architecture', label: t.footer.links.architecture },
    { href: '/api-docs', label: t.footer.links.api },
    { href: '/dashboard', label: t.footer.links.dashboard },
    { href: '/me/registrations', label: t.footer.links.registrations },
  ]

  return (
    <footer className="relative overflow-hidden border-t border-night-line bg-night text-night-ink">
      <div className="sheet-frame grid gap-10 pb-6 pt-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-night-muted">
            {t.footer.endOfSet}
          </p>
          <p className="mt-4 max-w-md text-lg text-night-ink">{t.footer.tagline}</p>
        </div>
        <nav
          aria-label={t.footer.navigation}
          className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm md:col-span-4"
        >
          {links.map((link) => (
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
          <p>{t.footer.fictional}</p>
          {publicConfig.repositoryUrl ? (
            <a
              className="mt-2 inline-block underline hover:text-night-ink"
              href={publicConfig.repositoryUrl}
            >
              {t.footer.source}
            </a>
          ) : (
            <p className="mt-2">{t.footer.license}</p>
          )}
        </div>
      </div>
      <div aria-hidden className="sheet-frame relative pb-5 pt-10">
        <svg viewBox="0 0 1000 150" className="block w-full overflow-visible">
          <defs>
            <linearGradient id="wordmark-fade" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--color-night-ink)" stopOpacity="0.14" />
              <stop offset="1" stopColor="var(--color-night-ink)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <text
            x="0"
            y="128"
            textLength="872"
            lengthAdjust="spacing"
            className="font-display font-bold"
            fontSize="196"
            fill="url(#wordmark-fade)"
            stroke="var(--color-night-line)"
            strokeWidth="1"
          >
            EventCore
          </text>
          <g transform="translate(908 40)">
            <rect width="40" height="40" fill="var(--color-night-3)" />
            <rect x="46" width="40" height="40" fill="var(--color-night-3)" />
            <rect y="46" width="40" height="40" fill="var(--color-night-3)" />
            <rect x="46" y="46" width="40" height="40" className="fill-signal-glow" />
            <rect
              x="46"
              y="46"
              width="40"
              height="40"
              className="fill-signal-glow blur-xl"
              opacity="0.7"
            />
          </g>
        </svg>
        <div className="mt-4 flex justify-between font-mono text-[0.65rem] uppercase tracking-[0.14em] text-night-faint">
          <span>+</span>
          <span>EventCore · Rev C</span>
          <span>+</span>
        </div>
      </div>
    </footer>
  )
}
