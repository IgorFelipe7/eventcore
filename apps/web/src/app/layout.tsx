import { type Metadata, type Viewport } from 'next'
import { Geist_Mono, Mona_Sans } from 'next/font/google'
import { headers } from 'next/headers'
import { type ReactNode } from 'react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { SpotlightTracker } from '@/components/spotlight-tracker'
import { splitLocale } from '@/i18n/locales'
import { I18nProvider } from '@/i18n/provider'
import { getI18n } from '@/i18n/server'
import './globals.css'

const mona = Mona_Sans({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-mona',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  const requestHeaders = await headers()
  const current = requestHeaders.get('x-eventcore-path') ?? '/'
  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'localhost:3000'
  const protocol =
    requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  const { path } = splitLocale(current.split('?')[0] ?? '/')
  return {
    title: { default: t.meta.title, template: '%s · EventCore' },
    description: t.meta.description,
    metadataBase: new URL(`${protocol}://${host}`),
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
  colorScheme: 'dark',
}

export default async function RootLayout({ children }: { readonly children: ReactNode }) {
  const { locale } = await getI18n()
  return (
    <html lang={locale} className={`${mona.variable} ${geistMono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <I18nProvider locale={locale}>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
          <SpotlightTracker />
        </I18nProvider>
      </body>
    </html>
  )
}
