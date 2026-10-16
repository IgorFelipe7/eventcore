'use client'

import NextLink from 'next/link'
import { type ComponentProps } from 'react'
import { localePath } from './locales'
import { useI18n } from './provider'

export function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const { locale } = useI18n()
  return <NextLink href={typeof href === 'string' ? localePath(locale, href) : href} {...props} />
}
