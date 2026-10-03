import { type Metadata, type Viewport } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from 'next/font/google'
import { type ReactNode } from 'react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import './globals.css'

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
})

const plexCondensed = IBM_Plex_Sans_Condensed({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-plex-condensed',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'EventCore — the last seat, settled exactly once', template: '%s · EventCore' },
  description:
    'A reservation engine for capacity-limited events. Serialized on one database row, idempotent on retry, fair to the waitlist — with the tests and recorded runs to prove it.',
  applicationName: 'EventCore',
  authors: [{ name: 'Igor Felipe' }],
  openGraph: {
    title: 'EventCore — the last seat, settled exactly once',
    description: 'Two requests. One seat. Exactly one confirmation.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#eceeea',
  colorScheme: 'light',
}

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexCondensed.variable} ${plexMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  )
}
