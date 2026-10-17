import { type ReactNode } from 'react'
import { Arrow, ButtonLink } from '@/components/button'
import { CodeBlock } from '@/components/code-block'
import { Marked, SectionHeading } from '@/components/sheet'
import { getI18n } from '@/i18n/server'
import { EvidenceLink } from './evidence-link'
import { INVARIANT_EVIDENCE } from './evidence'

export async function FailureSection({ baseline }: { readonly baseline?: ReactNode }) {
  const { t } = await getI18n()
  const copy = t.landing.failures
  return (
    <section aria-labelledby="failures" className="sheet-frame mt-32">
      <SectionHeading
        id="failures"
        index="1"
        mark={copy.mark}
        title={<Marked text={copy.title} />}
        lead={<p>{copy.lead}</p>}
      />
      {baseline}
      <div className="mt-10 overflow-x-auto border-y border-ink">
        <table className="w-full min-w-[44rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-ink">
              <th scope="col" className="label w-[16%] py-3 pr-4 text-ink-3">
                {copy.columns.failure}
              </th>
              <th scope="col" className="label w-[34%] py-3 pr-4 text-ink-3">
                {copy.columns.naive}
              </th>
              <th scope="col" className="label w-[36%] py-3 pr-4 text-ink-3">
                {copy.columns.eventcore}
              </th>
              <th scope="col" className="label py-3 text-ink-3">
                {copy.columns.decision}
              </th>
            </tr>
          </thead>
          <tbody>
            {copy.rows.map((failure) => (
              <tr
                key={failure.reference}
                className="group border-b border-rule align-top transition-colors last:border-b-0 hover:bg-sheet"
              >
                <th scope="row" className="py-5 pr-4 font-display text-lg font-semibold">
                  {failure.name}
                </th>
                <td className="py-5 pr-4 text-ink-2">
                  <span aria-hidden className="mr-2 font-mono text-rejected">
                    ×
                  </span>
                  {failure.naive}
                </td>
                <td className="py-5 pr-4 text-ink">
                  <span aria-hidden className="mr-2 font-mono text-confirmed">
                    ✓
                  </span>
                  {failure.eventcore}
                </td>
                <td className="py-5 font-mono text-sm text-ink-3 group-hover:text-signal">
                  {failure.reference}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export async function InvariantSection() {
  const { t } = await getI18n()
  const copy = t.landing.invariants
  return (
    <section aria-labelledby="invariants" className="sheet-frame mt-32">
      <SectionHeading
        id="invariants"
        index="2"
        mark={copy.mark}
        title={<Marked text={copy.title} />}
        lead={<p>{copy.lead}</p>}
      />
      <ol className="mt-10 border-t border-ink">
        {INVARIANT_EVIDENCE.map((invariant) => {
          const text = copy.rules[invariant.id]
          return (
            <li
              key={invariant.id}
              className="group grid grid-cols-12 gap-x-4 gap-y-2 border-b border-rule py-5 transition-colors hover:bg-sheet md:gap-x-6"
            >
              <p className="col-span-2 font-display text-3xl font-semibold leading-none text-ink-3 transition-colors group-hover:text-signal md:col-span-1">
                {invariant.id}
              </p>
              <p className="col-span-10 text-lg text-ink md:col-span-5">{text?.rule}</p>
              <p className="col-span-12 text-sm text-ink-2 md:col-span-3 md:pt-1.5">
                <span className="label mb-1 block text-ink-3">{copy.enforcedBy}</span>
                {text?.enforcedBy}
              </p>
              <p className="col-span-12 text-sm md:col-span-3 md:pt-1.5">
                <span className="label mb-1 block text-ink-3">{copy.verifiedBy}</span>
                <EvidenceLink path={invariant.verifiedBy} />
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

const LOCK_ORDER = [
  { order: '1', table: 'idempotency_requests', how: 'unique index' },
  { order: '2', table: 'event_inventory', how: 'FOR UPDATE' },
  { order: '3', table: 'registrations', how: 'FOR UPDATE' },
]

const CORE_SQL = `BEGIN;
INSERT INTO idempotency_requests (...) ON CONFLICT ON CONSTRAINT idempotency_requests_scope_key DO NOTHING;
SELECT capacity, confirmed_count FROM event_inventory WHERE event_id = $1 FOR UPDATE;
SELECT status FROM registrations WHERE event_id = $1 AND user_id = $2 FOR UPDATE;
SELECT count(*) FROM registrations WHERE event_id = $1 AND status = 'WAITLISTED';
UPDATE event_inventory SET confirmed_count = confirmed_count + 1 WHERE event_id = $1;
COMMIT;`

export async function AnatomySection() {
  const { t } = await getI18n()
  const copy = t.landing.anatomy
  return (
    <section aria-labelledby="anatomy" className="sheet-frame mt-32">
      <SectionHeading
        id="anatomy"
        index="3"
        mark={copy.mark}
        title={<Marked text={copy.title} />}
        lead={<p>{copy.lead}</p>}
      />
      <div className="mt-10 grid grid-cols-12 gap-x-4 gap-y-10 md:gap-x-6">
        <ol className="col-span-12 md:col-span-6">
          {copy.steps.map((step, index) => (
            <li
              key={step.title}
              className={`grid grid-cols-[2.5rem_1fr] border-t py-3.5 ${index === 2 ? 'border-signal' : 'border-rule'}`}
            >
              <span
                className={`font-mono text-sm tabular ${index === 2 ? 'text-signal' : 'text-ink-3'}`}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <p className={`font-medium ${index === 2 ? 'text-signal' : 'text-ink'}`}>
                  {step.title}
                </p>
                <p className="text-sm text-ink-2">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="col-span-12 grid content-start gap-6 md:col-span-6">
          <div className="border border-ink bg-sheet p-4">
            <p className="label text-ink-3">{copy.lockOrder}</p>
            <ol className="mt-4 grid gap-2 sm:grid-cols-3">
              {LOCK_ORDER.map((entry, index) => (
                <li key={entry.table} className="relative">
                  <div
                    className={`h-full border px-3 py-2.5 ${index === 1 ? 'border-signal bg-signal-wash' : 'border-ink'}`}
                  >
                    <p className="font-mono text-xs text-ink-3">{entry.order}</p>
                    <p className="mt-1 break-all font-mono text-[0.8125rem] text-ink">
                      {entry.table}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-ink-2">{entry.how}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-ink-2">{copy.lockOrderNote}</p>
          </div>
          <CodeBlock code={CORE_SQL} language="sql" title={copy.codeTitle} highlight={[3]} />
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/architecture" variant="secondary">
              {copy.cta} <Arrow />
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  )
}

export async function LimitsSection() {
  const { t } = await getI18n()
  const copy = t.landing.limits
  return (
    <section aria-labelledby="limits" className="sheet-frame mt-32">
      <SectionHeading
        id="limits"
        index="5"
        mark={copy.mark}
        title={<Marked text={copy.title} />}
        lead={<p>{copy.lead}</p>}
      />
      <div className="mt-10 grid grid-cols-12 gap-x-4 md:gap-x-6">
        <p className="label col-span-12 border-b border-ink pb-2 text-ink md:col-span-3 md:border-b-0 md:pb-0 md:pt-5">
          {copy.notes}
        </p>
        <ol className="col-span-12 md:col-span-9">
          {copy.items.map((entry, index) => (
            <li
              key={entry.limit}
              className="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-rule py-5 md:grid-cols-[3rem_16rem_1fr] md:border-t md:border-b-0 md:last:border-b md:first:border-t-ink"
            >
              <span className="font-mono text-sm tabular text-ink-3">
                {String(index + 1).padStart(2, '0')}.
              </span>
              <p className="font-display text-xl font-semibold leading-tight">{entry.limit}</p>
              <p className="col-start-2 mt-2 text-ink-2 md:col-start-3 md:mt-0">{entry.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const VERIFY_COMMANDS = `git clone <repository> eventcore && cd eventcore
pnpm install
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm test`

export async function VerifySection() {
  const { t } = await getI18n()
  const copy = t.landing.verify
  return (
    <section aria-labelledby="verify" className="sheet-frame mt-32">
      <div className="grid grid-cols-12 gap-x-4 gap-y-8 border-t-4 border-ink pt-10 md:gap-x-6">
        <div className="col-span-12 md:col-span-6">
          <p className="label text-ink-3">{copy.mark}</p>
          <h2 id="verify" className="mt-3 text-display">
            <Marked text={copy.title} />
          </h2>
        </div>
        <div className="col-span-12 grid content-start gap-5 md:col-span-6">
          <p className="measure text-lg text-ink-2">{copy.lead}</p>
          <CodeBlock code={VERIFY_COMMANDS} language="shell" title={t.common.terminal} />
        </div>
      </div>
    </section>
  )
}
