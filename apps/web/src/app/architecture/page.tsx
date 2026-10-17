import { type Metadata } from 'next'
import { Figure, Marked, SectionHeading, SheetBar, TitleBlock } from '@/components/sheet'
import { loadDecisions } from '@/features/architecture/documents'
import { SystemDiagram } from '@/features/architecture/system-diagram'
import { EvidenceLink } from '@/features/landing/evidence-link'
import { getI18n } from '@/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.sheets.architecture, description: t.architecture.metaDescription }
}

const TABLES = [
  ['event_inventory', 'CHECK 0 ≤ confirmed_count ≤ capacity'],
  ['registrations', 'UNIQUE (event_id, user_id); queued_at ⇔ WAITLISTED'],
  ['registration_events', 'append-only, correlation id'],
  ['idempotency_requests', 'UNIQUE (actor, action, scope, key)'],
  ['audit_log', 'ids and states only'],
  ['outbox_events', 'partial index on pending rows'],
  ['notification_deliveries', 'UNIQUE (outbox_event_id)'],
] as const

const DOCUMENTS = [
  'docs/00-vision.md',
  'docs/domain-state-machine.md',
  'docs/threat-model.md',
  'DESIGN.md',
  'docs/experience/03-concept.md',
] as const

export default async function ArchitecturePage() {
  const [decisions, { t }] = await Promise.all([loadDecisions(), getI18n()])
  const copy = t.architecture
  const sheet = { number: 6, title: t.sheets.architecture }

  return (
    <main id="main">
      <SheetBar sheet={sheet} />
      <section className="sheet-frame mt-12">
        <SectionHeading
          mark={copy.mark}
          title={<Marked text={copy.title} />}
          lead={<p>{copy.lead}</p>}
        />
        <Figure number="6.1" kind="schematic" caption={copy.figure} className="mt-10">
          <div className="p-4 sm:p-6">
            <SystemDiagram />
          </div>
        </Figure>
      </section>

      <section aria-labelledby="flow" className="sheet-frame mt-24">
        <SectionHeading
          id="flow"
          index="1"
          sheet="06"
          mark={copy.flowMark}
          title={copy.flowTitle}
        />
        <ol className="mt-10 grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
          {copy.flow.map(([title, detail], index) => (
            <li key={title} className="bg-sheet p-4">
              <p className="font-mono text-xs text-ink-3">{String(index + 1).padStart(2, '0')}</p>
              <p
                className={`mt-1 font-display text-xl font-semibold ${index === copy.lockStep ? 'text-signal' : ''}`}
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
          index="2"
          sheet="06"
          mark={copy.dataMark}
          title={copy.dataTitle}
        />
        <div className="mt-10 overflow-x-auto border-y border-ink">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="label py-3 pr-4 text-ink-3">
                  {copy.columns.table}
                </th>
                <th scope="col" className="label py-3 pr-4 text-ink-3">
                  {copy.columns.constraint}
                </th>
                <th scope="col" className="label py-3 text-ink-3">
                  {copy.columns.role}
                </th>
              </tr>
            </thead>
            <tbody>
              {TABLES.map(([table, constraint]) => (
                <tr key={table} className="border-b border-rule last:border-b-0">
                  <th scope="row" className="py-3 pr-4 font-mono text-[0.8125rem] font-medium">
                    {table}
                  </th>
                  <td className="py-3 pr-4 font-mono text-xs text-ink-2">{constraint}</td>
                  <td className="py-3 text-ink-2">{copy.tables[table]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="decisions" className="sheet-frame mt-24">
        <SectionHeading
          id="decisions"
          index="3"
          sheet="06"
          mark={copy.decisionsMark}
          title={copy.decisionsTitle}
          lead={copy.documentsNote ? <p>{copy.documentsNote}</p> : undefined}
        />
        <div className="mt-10 border-t border-ink">
          {decisions.length === 0 ? (
            <p className="py-6 text-ink-2">{copy.decisionsEmpty}</p>
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
                  lang="en"
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
          index="4"
          sheet="06"
          mark={copy.readingMark}
          title={copy.readingTitle}
        />
        <ul className="mt-8 grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-5">
          {DOCUMENTS.map((file) => (
            <li key={file} className="bg-sheet p-4">
              <p className="font-medium">{copy.documents[file]}</p>
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
