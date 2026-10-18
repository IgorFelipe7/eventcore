import { type ReactNode } from 'react'
import { getI18n } from '@/i18n/server'

function Node({
  title,
  detail,
  tone = 'ink',
  children,
}: {
  readonly title: string
  readonly detail: string
  readonly tone?: 'ink' | 'signal' | 'muted'
  readonly children?: ReactNode
}) {
  const border =
    tone === 'signal'
      ? 'border-signal/60 shadow-[0_0_48px_-16px_var(--color-signal)]'
      : tone === 'muted'
        ? 'border-rule border-dashed'
        : 'border-rule'
  return (
    <div className={`rounded-2xl border ${border} bg-[rgb(238_241_246/0.025)] p-4`}>
      <p
        className={`text-lg font-semibold tracking-[-0.02em] ${tone === 'signal' ? 'text-signal' : ''}`}
      >
        {title}
      </p>
      <p className="font-mono text-[0.7rem] text-ink-3">{detail}</p>
      {children}
    </div>
  )
}

function Link({
  label,
  vertical = false,
}: {
  readonly label: string
  readonly vertical?: boolean
}) {
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center gap-2 font-mono text-[0.65rem] text-ink-3 ${vertical ? 'py-2' : 'lg:flex-col lg:px-1'}`}
    >
      <span
        className={`${vertical ? 'h-5 w-px' : 'h-5 w-px lg:h-px lg:w-8'} bg-[linear-gradient(90deg,var(--color-rule),var(--color-signal),var(--color-rule))]`}
      />
      <span className="whitespace-nowrap">{label}</span>
    </div>
  )
}

const MODULES = [
  'identity',
  'organizations',
  'events',
  'registrations',
  'waitlist',
  'audit',
  'outbox',
  'reporting',
]

export async function SystemDiagram() {
  const { t } = await getI18n()
  const copy = t.architecture.diagram
  return (
    <div
      role="img"
      aria-label={copy.label}
      className="grid items-center gap-0 lg:grid-cols-[1fr_auto_1fr_auto_1.6fr_auto_1fr]"
    >
      <Node title={copy.browser[0] ?? ''} detail={copy.browser[1] ?? ''} tone="muted" />
      <Link label={copy.links.https} />
      <Node title={copy.next[0] ?? ''} detail={copy.next[1] ?? ''}>
        <p className="mt-2 text-xs text-ink-2">{copy.nextNote}</p>
      </Node>
      <Link label={copy.links.bearer} />
      <Node title={copy.api[0] ?? ''} detail={copy.api[1] ?? ''} tone="signal">
        <ul className="mt-3 grid grid-cols-2 gap-1">
          {MODULES.map((module) => (
            <li
              key={module}
              className="rounded-lg border border-rule px-2 py-1 font-mono text-[0.68rem] text-ink-2"
            >
              {module}
            </li>
          ))}
        </ul>
      </Node>
      <Link label={copy.links.transaction} />
      <div className="grid gap-0">
        <Node title={copy.postgres[0] ?? ''} detail={copy.postgres[1] ?? ''} />
        <Link label={copy.links.skipLocked} vertical />
        <Node title={copy.worker[0] ?? ''} detail={copy.worker[1] ?? ''} />
        <Link label={copy.links.dedupe} vertical />
        <Node title={copy.mailbox[0] ?? ''} detail={copy.mailbox[1] ?? ''} tone="muted" />
      </div>
    </div>
  )
}
