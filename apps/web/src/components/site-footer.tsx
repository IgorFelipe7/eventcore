import { Link } from '@/i18n/link'
import { getI18n } from '@/i18n/server'
import { publicConfig } from '@/lib/public-config'
import { BrandMark } from './brand-mark'

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
    <footer className="relative mt-32 overflow-clip border-t border-rule">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-[radial-gradient(55%_80%_at_50%_100%,rgb(125_139_255/0.18),transparent_70%)]"
      />
      <div className="sheet-frame relative grid gap-12 pb-10 pt-20 md:grid-cols-12">
        <div className="md:col-span-5">
          <BrandMark className="size-7" />
          <p className="mt-6 max-w-sm font-display text-2xl font-semibold leading-tight tracking-[-0.03em] font-stretch-110%">
            {t.footer.tagline}
          </p>
        </div>
        <nav
          aria-label={t.footer.navigation}
          className="grid grid-cols-2 content-start gap-x-8 gap-y-3 text-sm md:col-span-4"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              className="w-fit text-ink-2 transition-colors hover:text-ink"
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="grid content-start gap-2 text-sm text-ink-3 md:col-span-3">
          <p>{t.footer.fictional}</p>
          {publicConfig.repositoryUrl ? (
            <a className="w-fit underline hover:text-ink" href={publicConfig.repositoryUrl}>
              {t.footer.source}
            </a>
          ) : (
            <p>{t.footer.license}</p>
          )}
        </div>
      </div>
      <div aria-hidden className="relative select-none overflow-clip">
        <p className="wide scale-in whitespace-nowrap text-center font-display font-extrabold leading-[0.78] tracking-[-0.06em] text-[clamp(3.25rem,0.25rem+12.4vw,14rem)] bg-[linear-gradient(180deg,rgb(238_241_246/0.22),rgb(238_241_246/0.02)_78%)] bg-clip-text text-transparent">
          EventCore
        </p>
      </div>
    </footer>
  )
}
