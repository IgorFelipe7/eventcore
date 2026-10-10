import { type ReactNode } from 'react'

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
      ? 'border-signal'
      : tone === 'muted'
        ? 'border-ink-3/60 border-dashed'
        : 'border-ink'
  return (
    <div className={`border ${border} bg-sheet p-3`}>
      <p className={`font-display text-lg font-semibold ${tone === 'signal' ? 'text-signal' : ''}`}>
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
      <span className={`${vertical ? 'h-5 w-px' : 'h-5 w-px lg:h-px lg:w-8'} bg-ink`} />
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

export function SystemDiagram() {
  return (
    <div
      role="img"
      aria-label="Browser to Next.js server to Fastify API with eight modules to PostgreSQL; a worker reads the outbox from PostgreSQL and delivers to the demo mailbox."
      className="grid items-center gap-0 lg:grid-cols-[1fr_auto_1fr_auto_1.6fr_auto_1fr]"
    >
      <Node title="Browser" detail="no tokens, no keys" tone="muted" />
      <Link label="HTTPS · cookie" />
      <Node title="Next.js 16" detail="server components · actions">
        <p className="mt-2 text-xs text-ink-2">
          Signs demo tokens server-side. Renders the Lab from replay files.
        </p>
      </Node>
      <Link label="bearer JWT" />
      <Node title="Fastify API" detail="one process · modular monolith" tone="signal">
        <ul className="mt-3 grid grid-cols-2 gap-1">
          {MODULES.map((module) => (
            <li
              key={module}
              className="border border-rule px-1.5 py-1 font-mono text-[0.68rem] text-ink-2"
            >
              {module}
            </li>
          ))}
        </ul>
      </Node>
      <Link label="1 transaction" />
      <div className="grid gap-0">
        <Node title="PostgreSQL 18" detail="locks · constraints · outbox" />
        <Link label="SKIP LOCKED" vertical />
        <Node title="Worker" detail="relay · backoff · sweep" />
        <Link label="dedupe key" vertical />
        <Node title="Demo mailbox" detail="no real email in MVP" tone="muted" />
      </div>
    </div>
  )
}
