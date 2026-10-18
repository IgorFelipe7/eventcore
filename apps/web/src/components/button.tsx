import { type LinkProps } from 'next/link'
import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from '@/i18n/link'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-paper shadow-[0_0_0_1px_rgb(238_241_246/0.2),0_8px_32px_-8px_rgb(125_139_255/0.55)] hover:bg-white hover:shadow-[0_0_0_1px_rgb(255_255_255/0.4),0_12px_40px_-6px_rgb(125_139_255/0.8)] disabled:bg-cancelled disabled:shadow-none',
  secondary:
    'border border-rule bg-[rgb(238_241_246/0.04)] text-ink hover:border-[rgb(238_241_246/0.24)] hover:bg-[rgb(238_241_246/0.08)] disabled:text-cancelled',
  quiet: 'text-ink underline decoration-ink-3/50 hover:text-signal',
}

export const buttonClass = (variant: ButtonVariant = 'primary', extra = '') =>
  `group/button inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-[background-color,box-shadow,border-color,color,transform] duration-300 ease-(--ease-out-expo) active:scale-[0.98] disabled:cursor-not-allowed ${variants[variant]} ${extra}`

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
    <span
      aria-hidden
      className="inline-block transition-transform duration-300 ease-(--ease-out-expo) group-hover/button:translate-x-1"
    >
      →
    </span>
  )
}
