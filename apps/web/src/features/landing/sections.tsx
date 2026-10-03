import { Arrow, ButtonLink } from '@/components/button'
import { CodeBlock } from '@/components/code-block'
import { SectionHeading } from '@/components/sheet'
import { EvidenceLink } from './evidence-link'
import { FAILURES, INVARIANTS, KNOWN_LIMITS, TRANSACTION_STEPS } from './evidence'

export function FailureSection({ baseline }: { readonly baseline?: React.ReactNode }) {
  return (
    <section aria-labelledby="failures" className="sheet-frame mt-32">
      <SectionHeading
        id="failures"
        mark="§1 · Failure modes"
        title="Read, then write, is a race."
        lead={
          <p>
            Most booking bugs are not exotic. They are what happens by default when a read and a
            write are separated by time — and every booking flow separates them.
          </p>
        }
      />
      {baseline}
      <div className="mt-10 overflow-x-auto border-y border-ink">
        <table className="w-full min-w-[44rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-ink">
              <th scope="col" className="label w-[16%] py-3 pr-4 text-ink-3">
                Failure
              </th>
              <th scope="col" className="label w-[34%] py-3 pr-4 text-ink-3">
                A naive system
              </th>
              <th scope="col" className="label w-[36%] py-3 pr-4 text-ink-3">
                EventCore
              </th>
              <th scope="col" className="label py-3 text-ink-3">
                Decision
              </th>
            </tr>
          </thead>
          <tbody>
            {FAILURES.map((failure) => (
              <tr key={failure.name} className="border-b border-rule align-top last:border-b-0">
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
                <td className="py-5 font-mono text-sm text-ink-3">{failure.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function InvariantSection() {
  return (
    <section aria-labelledby="invariants" className="sheet-frame mt-32">
      <SectionHeading
        id="invariants"
        mark="§2 · Guarantees"
        title="Eight invariants. Each one has an owner and a test."
        lead={
          <p>
            A guarantee is only as strong as the layer that enforces it. Each rule below names that
            layer and the file that tries to break it against a real PostgreSQL 18.
          </p>
        }
      />
      <ol className="mt-10 border-t border-ink">
        {INVARIANTS.map((invariant) => (
          <li
            key={invariant.id}
            className="grid grid-cols-12 gap-x-4 gap-y-2 border-b border-rule py-5 md:gap-x-6"
          >
            <p className="col-span-2 font-mono text-2xl font-medium text-signal md:col-span-1">
              {invariant.id}
            </p>
            <p className="col-span-10 text-lg text-ink md:col-span-5">{invariant.rule}</p>
            <p className="col-span-12 text-sm text-ink-2 md:col-span-3 md:pt-1.5">
              <span className="label mb-1 block text-ink-3">Enforced by</span>
              {invariant.enforcedBy}
            </p>
            <p className="col-span-12 text-sm md:col-span-3 md:pt-1.5">
              <span className="label mb-1 block text-ink-3">Verified by</span>
              <EvidenceLink path={invariant.verifiedBy} />
            </p>
          </li>
        ))}
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

export function AnatomySection() {
  return (
    <section aria-labelledby="anatomy" className="sheet-frame mt-32">
      <SectionHeading
        id="anatomy"
        mark="§3 · Mechanism"
        title="One transaction. One lock order. Nine steps."
        lead={
          <p>
            No distributed locks, no queues, no sagas. A modular monolith and a database that
            already knows how to serialize — used deliberately.
          </p>
        }
      />
      <div className="mt-10 grid grid-cols-12 gap-x-4 gap-y-10 md:gap-x-6">
        <ol className="col-span-12 md:col-span-6">
          {TRANSACTION_STEPS.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-[2.5rem_1fr] border-t border-rule py-3.5"
            >
              <span className="font-mono text-sm tabular text-ink-3">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="font-medium text-ink">{step.title}</p>
                <p className="text-sm text-ink-2">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="col-span-12 grid content-start gap-6 md:col-span-6">
          <div className="border border-ink bg-sheet p-4">
            <p className="label text-ink-3">Lock order — identical in every command</p>
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
            <p className="mt-4 text-sm text-ink-2">
              Every command takes its locks in this order, so no two commands can wait on each other
              in a cycle. Deadlocks are designed out rather than retried.
            </p>
          </div>
          <CodeBlock
            code={CORE_SQL}
            language="sql"
            title="Registration, condensed"
            highlight={[3]}
          />
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/architecture" variant="secondary">
              Read the architecture sheet <Arrow />
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  )
}

export function LimitsSection() {
  return (
    <section aria-labelledby="limits" className="sheet-frame mt-32">
      <SectionHeading
        id="limits"
        mark="§5 · Known limits"
        title="What this design does not solve."
        lead={<p>Every architecture trades something. These are the trades, named.</p>}
      />
      <dl className="mt-10 grid gap-px border border-ink bg-ink md:grid-cols-3">
        {KNOWN_LIMITS.map((entry, index) => (
          <div key={entry.limit} className="bg-sheet p-5">
            <dt className="flex items-baseline gap-3">
              <span className="font-mono text-sm text-ink-3">L{index + 1}</span>
              <span className="font-display text-xl font-semibold">{entry.limit}</span>
            </dt>
            <dd className="mt-3 text-sm text-ink-2">{entry.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

const VERIFY_COMMANDS = `git clone <repository> eventcore && cd eventcore
pnpm install
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm test`

export function VerifySection() {
  return (
    <section aria-labelledby="verify" className="sheet-frame mt-32">
      <div className="grid grid-cols-12 gap-x-4 gap-y-8 border-t-4 border-ink pt-10 md:gap-x-6">
        <div className="col-span-12 md:col-span-5">
          <p className="label text-ink-3">End of sheet</p>
          <h2 id="verify" className="mt-3 text-display">
            Don’t take the page’s word for it.
          </h2>
        </div>
        <div className="col-span-12 grid content-start gap-5 md:col-span-7">
          <p className="measure text-lg text-ink-2">
            Four commands start PostgreSQL in Docker and run every test on this sheet — the naive
            baseline that overbooks included. Nothing is mocked where a database guarantee is
            claimed.
          </p>
          <CodeBlock code={VERIFY_COMMANDS} language="shell" title="Terminal" />
        </div>
      </div>
    </section>
  )
}
