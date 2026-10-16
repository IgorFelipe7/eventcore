import { type NextRequest, NextResponse } from 'next/server'
import { LOCALE_HEADER, splitLocale } from './i18n/locales'

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const { locale, path } = splitLocale(pathname)
  const headers = new Headers(request.headers)
  headers.set('x-eventcore-path', `${pathname}${search}`)
  headers.set(LOCALE_HEADER, locale)
  if (path === pathname) return NextResponse.next({ request: { headers } })
  const target = request.nextUrl.clone()
  target.pathname = path
  return NextResponse.rewrite(target, { request: { headers } })
}

export const config = {
  matcher: ['/((?!_next/|favicon|icon|.*\\.).*)'],
}
