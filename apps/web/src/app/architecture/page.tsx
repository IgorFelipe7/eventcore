import { type Metadata } from 'next'
import { Figure, SectionHeading, SheetBar, TitleBlock } from '@/components/sheet'
import { loadDecisions } from '@/features/architecture/documents'
import { SystemDiagram } from '@/features/architecture/system-diagram'
import { EvidenceLink } from '@/features/landing/evidence-link'

export const metadata: Metadata = {
  title: 'Architecture',
  description: 'Modules, request flow, data model, decision records and threat model of EventCore.',
}

const sheet = { number: 6, title: 'Architecture' }

const FLOW = [
  [
    'Authenticate',
    'Verify signature, issuer, audience, expiry; resolve the user from the subject.',
  ],
  ['Authorize', 'Resolve the role for the organization in the path, or own the registration.'],
  ['Validate', 'Zod at the boundary; unknown fields dropped or refused.'],
  ['Claim key', 'Idempotency row inserted inside the transaction.'],
  ['Lock', 'event_inventory FOR UPDATE — the single serialization point.'],
  ['Decide', 'Pure domain function over freshly read state.'],
  ['Persist', 'Rows, counter, history, audit, outbox, stored answer — one COMMIT.'],
  ['Deliver', 'The worker relays the outbox after commit, at least once, deduplicated.'],
] as const

const TABLES = [
  [
    'event_inventory',
    'CHECK 0 ≤ confirmed_count ≤ capacity',
    'The row every capacity decision locks.',
  ],
  [
    'registrations',
    'UNIQUE (event_id, user_id); queued_at ⇔ WAITLISTED',
    'One logical registration per participant.',
  ],
  [
    'registration_events',
    'append-only, correlation id',
    'Every transition, with the request that caused it.',
  ],
  [
    'idempotency_requests',
    'UNIQUE (actor, action, scope, key)',
    'Stored status and body for replays.',
  ],
  ['audit_log', 'ids and states only', 'Who changed what, never personal data.'],
  ['outbox_events', 'partial index on pending rows', 'Notifications committed with the change.'],
  ['notification_deliveries', 'UNIQUE (outbox_event_id)', 'Deduplicated delivery record.'],
] as const

const DOCUMENTS = [
  ['Vision and invariants', 'docs/00-vision.md'],
  ['Domain state machine', 'docs/domain-state-machine.md'],
  ['Threat model', 'docs/threat-model.md'],
  ['Design system', 'DESIGN.md'],
  ['Experience concept', 'docs/experience/03-concept.md'],
] as const

export default async function ArchitecturePage() {
  const decisions = await loadDecisions()

  return (
    <main id="main">
      <SheetBar sheet={sheet} />
      <section className="sheet-frame mt-12">
        <SectionHeading
          mark="Sheet 06 · System"
          title="A modular monolith, on purpose."
          lead={
            <p>
              The hard problem is a synchronous decision about one seat. Splitting it across
              services would turn one transaction into a distributed protocol. So there is one API,
              one database and one worker — with module boundaries visible in the code.
            </p>
          }
        />
        <Figure
          number="6.1"
          kind="schematic"
          caption="Runtime boundaries and what crosses them."
          className="mt-10"
        >
          <div className="p-4 sm:p-6">
            <SystemDiagram />
          </div>
        </Figure>
      </section>

      <section aria-labelledby="flow" className="sheet-frame mt-24">
        <SectionHeading
          id="flow"
          mark="§1 · Request path"
          title="Eight steps from request to delivery."
        />
        <ol className="mt-10 grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map(([title, detail], index) => (
            <li key={title} className="bg-sheet p-4">
              <p className="font-mono text-xs text-ink-3">{String(index + 1).padStart(2, '0')}</p>
              <p
                className={`mt-1 font-display text-xl font-semibold ${title === 'Lock' ? 'text-signal' : ''}`}
              >
                {title}
              </p>
              <p className="mt-1 text-sm text-ink-2">{detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="data" className="sheet-frame mt-24">
        <SectionHeading
          id="data"
          mark="§2 · Data model"
          title="The database enforces what it can. The code enforces the rest."
        />
        <div className="mt-10 overflow-x-auto border-y border-ink">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="label py-3 pr-4 text-ink-3">
                  Table
                </th>
                <th scope="col" className="label py-3 pr-4 text-ink-3">
                  Constraint that matters
                </th>
                <th scope="col" className="label py-3 text-ink-3">
                  Role
                </th>
              </tr>
            </thead>
            <tbody>
              {TABLES.map(([table, constraint, role]) => (
                <tr key={table} className="border-b border-rule last:border-b-0">
                  <th scope="row" className="py-3 pr-4 font-mono text-[0.8125rem] font-medium">
                    {table}
                  </th>
                  <td className="py-3 pr-4 font-mono text-xs text-ink-2">{constraint}</td>
                  <td className="py-3 text-ink-2">{role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="decisions" className="sheet-frame mt-24">
        <SectionHeading
          id="decisions"
          mark="§3 · Decision records"
          title="Every structural choice is written down, with what it costs."
        />
        <div className="mt-10 border-t border-ink">
          {decisions.length === 0 ? (
            <p className="py-6 text-ink-2">
              Decision records are read from docs/adr at build time.
            </p>
          ) : (
            decisions.map((decision) => (
              <details key={decision.number} className="group border-b border-rule">
                <summary className="grid min-h-16 cursor-pointer list-none grid-cols-12 items-center gap-x-4 py-4 hover:text-signal md:gap-x-6 [&::-webkit-details-marker]:hidden">
                  <span className="col-span-2 font-mono text-sm text-signal md:col-span-1">
                    {decision.number}
                  </span>
                  <span className="col-span-8 font-display text-xl font-semibold md:col-span-8">
                    {decision.title}
                  </span>
                  <span className="label col-span-2 hidden text-ink-3 md:block">
                    {decision.status} · {decision.date}
                  </span>
                  <span
                    aria-hidden
                    className="col-span-2 text-right font-mono transition-transform group-open:rotate-45 md:col-span-1"
                  >
                    +
                  </span>
                </summary>
                <div
                  className="sheet-prose measure pb-8 md:ml-[calc(100%/12)]"
                  dangerouslySetInnerHTML={{ __html: decision.html }}
                />
              </details>
            ))
          )}
        </div>
      </section>

      <section aria-labelledby="documents" className="sheet-frame mt-24">
        <SectionHeading
          id="documents"
          mark="§4 · Further reading"
          title="The rest of the drawing set."
        />
        <ul className="mt-8 grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-5">
          {DOCUMENTS.map(([title, file]) => (
            <li key={file} className="bg-sheet p-4">
              <p className="font-medium">{title}</p>
              <p className="mt-1 text-sm">
                <EvidenceLink path={file} />
              </p>
            </li>
          ))}
        </ul>
      </section>
      <TitleBlock sheet={sheet} />
    </main>
  )
}
