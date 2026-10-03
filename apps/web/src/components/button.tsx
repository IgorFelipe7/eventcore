import Link, { type LinkProps } from 'next/link'
import { type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-paper border border-ink hover:bg-signal hover:border-signal disabled:bg-cancelled disabled:border-cancelled',
  secondary:
    'bg-transparent text-ink border border-ink hover:bg-ink hover:text-paper disabled:text-cancelled disabled:border-cancelled',
  quiet: 'bg-transparent text-ink border border-transparent underline hover:text-signal',
}

export const buttonClass = (variant: ButtonVariant = 'primary', extra = '') =>
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-[2px] px-4 py-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed ${variants[variant]} ${extra}`

export function ButtonLink({
  href,
  variant = 'primary',
  children,
  className = '',
}: {
  readonly href: LinkProps<string>['href']
  readonly variant?: ButtonVariant
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  )
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { readonly variant?: ButtonVariant }) {
  return <button {...props} className={buttonClass(variant, className)} />
}

export function Arrow() {
  return (
    <span aria-hidden className="font-mono">
      →
    </span>
  )
}
