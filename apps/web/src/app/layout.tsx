import { type Metadata, type Viewport } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from 'next/font/google'
import { headers } from 'next/headers'
import { type ReactNode } from 'react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { splitLocale } from '@/i18n/locales'
import { I18nProvider } from '@/i18n/provider'
import { getI18n } from '@/i18n/server'
import './globals.css'

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
})

const plexCondensed = IBM_Plex_Sans_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-plex-condensed',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  const current = (await headers()).get('x-eventcore-path') ?? '/'
  const { path } = splitLocale(current.split('?')[0] ?? '/')
  return {
    title: { default: t.meta.title, template: '%s · EventCore' },
    description: t.meta.description,
    applicationName: 'EventCore',
    authors: [{ name: 'Igor Felipe' }],
    alternates: {
      languages: { en: path, 'pt-BR': path === '/' ? '/pt-br' : `/pt-br${path}` },
    },
    openGraph: { title: t.meta.title, description: t.meta.social, type: 'website' },
  }
}

export const viewport: Viewport = {
  themeColor: '#07090c',
  colorScheme: 'light',
}

export default async function RootLayout({ children }: { readonly children: ReactNode }) {
  const { locale } = await getI18n()
  return (
    <html
      lang={locale}
      className={`${plexSans.variable} ${plexCondensed.variable} ${plexMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <I18nProvider locale={locale}>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  )
}
