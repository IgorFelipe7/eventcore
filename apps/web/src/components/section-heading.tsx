import { type ReactNode } from 'react'
import { Marked } from './headline'

export function SectionHeading({
  mark,
  title,
  lead,
  id,
  align = 'start',
  as: Heading = 'h2',
  size = 'heading',
  dot,
}: {
  readonly mark: string
  readonly title: string
  readonly lead?: ReactNode
  readonly id?: string
  readonly align?: 'start' | 'center'
  readonly as?: 'h1' | 'h2'
  readonly size?: 'heading' | 'display'
  readonly dot?: string
}) {
  const centered = align === 'center'
  return (
    <header className={centered ? 'mx-auto flex max-w-4xl flex-col items-center text-center' : ''}>
      <span
        className="eyebrow rise-in"
        style={dot ? ({ ['--eyebrow-dot' as string]: dot } as React.CSSProperties) : undefined}
      >
        {mark}
      </span>
      <Heading
        id={id}
        className={`reveal mt-6 text-ink ${size === 'display' ? 'text-display' : 'text-heading'} ${centered ? '' : 'max-w-5xl'}`}
      >
        <Marked text={title} />
      </Heading>
      {lead ? (
        <div className={`rise-in mt-6 max-w-2xl text-lg text-ink-2 ${centered ? 'mx-auto' : ''}`}>
          {lead}
        </div>
      ) : null}
    </header>
  )
}

export function PageIntro({
  mark,
  title,
  lead,
  children,
}: {
  readonly mark: string
  readonly title: string
  readonly lead?: ReactNode
  readonly children?: ReactNode
}) {
  return (
    <section className="relative overflow-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[34rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(125_139_255/0.16),transparent_70%)]"
      />
      <div className="sheet-frame relative pb-12 pt-16 sm:pt-24">
        <SectionHeading as="h1" size="display" mark={mark} title={title} lead={lead} />
        {children}
      </div>
    </section>
  )
}
