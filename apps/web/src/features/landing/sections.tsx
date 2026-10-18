import { type ReactNode } from 'react'
import { Arrow, ButtonLink } from '@/components/button'
import { SectionHeading } from '@/components/section-heading'
import { getI18n } from '@/i18n/server'
import { AnatomyScroller } from './anatomy-scroller'
import { EvidenceLink } from './evidence-link'
import { INVARIANT_EVIDENCE } from './evidence'
import { Terminal } from './terminal'

export async function FailureSection({ baseline }: { readonly baseline?: ReactNode }) {
  const { t } = await getI18n()
  const copy = t.landing.failures
  return (
    <section aria-labelledby="failures" className="sheet-frame mt-40">
      <SectionHeading
        id="failures"
        mark={copy.mark}
        title={copy.title}
        lead={<p>{copy.lead}</p>}
        dot="var(--color-rejected)"
      />
      {baseline}
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {copy.rows.map((failure, index) => (
          <li
            key={failure.reference}
            data-spotlight
            className="surface rise-in flex flex-col p-6 sm:p-8"
            style={{ animationRangeStart: `entry ${index * 4}%` }}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl tracking-[-0.03em]">{failure.name}</h3>
              <span className="label shrink-0 rounded-full border border-rule px-2.5 py-1 text-ink-3">
                {failure.reference}
              </span>
            </div>
            <div className="mt-6 grid flex-1 gap-3">
              <p className="flex gap-3 rounded-2xl bg-rejected-wash/60 p-4 text-ink-2">
                <span
                  aria-hidden
                  className="grid size-6 shrink-0 place-items-center rounded-full bg-rejected/15 font-mono text-xs text-rejected"
                >
                  ×
                </span>
                <span>
                  <span className="label mb-1 block text-rejected/80">{copy.columns.naive}</span>
                  {failure.naive}
                </span>
              </p>
              <p className="flex gap-3 rounded-2xl bg-confirmed-wash/60 p-4 text-ink">
                <span
                  aria-hidden
                  className="grid size-6 shrink-0 place-items-center rounded-full bg-confirmed/15 font-mono text-xs text-confirmed"
                >
                  ✓
                </span>
                <span>
                  <span className="label mb-1 block text-confirmed/80">
                    {copy.columns.eventcore}
                  </span>
                  {failure.eventcore}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export async function InvariantSection() {
  const { t } = await getI18n()
  const copy = t.landing.invariants
  return (
    <section aria-labelledby="invariants" className="relative mt-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-20 h-[40rem] bg-[radial-gradient(50%_50%_at_50%_50%,rgb(125_139_255/0.08),transparent_70%)]"
      />
      <div className="sheet-frame relative">
        <SectionHeading
          id="invariants"
          mark={copy.mark}
          title={copy.title}
          lead={<p>{copy.lead}</p>}
          align="center"
        />
        <ol className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INVARIANT_EVIDENCE.map((invariant, index) => {
            const text = copy.rules[invariant.id]
            return (
              <li
                key={invariant.id}
                data-spotlight
                className="surface scale-in group flex flex-col p-6"
                style={{ animationRangeStart: `entry ${(index % 4) * 5}%` }}
              >
                <p className="wide font-display text-5xl font-bold leading-none tracking-[-0.06em] text-transparent bg-[linear-gradient(180deg,var(--color-ink),rgb(238_241_246/0.25))] bg-clip-text transition-[filter] duration-500 group-hover:drop-shadow-[0_0_18px_rgb(125_139_255/0.6)]">
                  {invariant.id}
                </p>
                <p className="mt-6 flex-1 text-[0.98rem] leading-relaxed text-ink">{text?.rule}</p>
                <dl className="mt-6 grid gap-3 border-t border-rule pt-4 text-sm">
                  <div>
                    <dt className="label text-ink-3">{copy.enforcedBy}</dt>
                    <dd className="mt-1 text-ink-2">{text?.enforcedBy}</dd>
                  </div>
                  <div>
                    <dt className="label text-ink-3">{copy.verifiedBy}</dt>
                    <dd className="mt-1">
                      <EvidenceLink path={invariant.verifiedBy} />
                    </dd>
                  </div>
                </dl>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

const LOCK_ORDER = [
  { order: '1', table: 'idempotency_requests', how: 'unique index' },
  { order: '2', table: 'event_inventory', how: 'FOR UPDATE' },
  { order: '3', table: 'registrations', how: 'FOR UPDATE' },
]

const CORE_SQL = `BEGIN;
INSERT INTO idempotency_requests (actor_id, action, scope_id, key, request_hash, expires_at) VALUES (...);
SELECT capacity, confirmed_count FROM event_inventory WHERE event_id = $1 FOR UPDATE;
SELECT status FROM registrations r WHERE event_id = $1 AND user_id = $2 FOR UPDATE OF r;
SELECT count(*) FROM registrations WHERE event_id = $1 AND status = 'WAITLISTED';
INSERT INTO registrations (event_id, user_id, status, queued_at) VALUES (...);
UPDATE event_inventory SET confirmed_count = confirmed_count + 1, version = version + 1 WHERE event_id = $1;
INSERT INTO registration_events (registration_id, from_status, to_status, correlation_id) VALUES (...);
INSERT INTO audit_log (organization_id, actor_id, action, resource_id, request_id) VALUES (...);
INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload) VALUES (...);
UPDATE idempotency_requests SET http_status = 201, response_body = $3 WHERE id = $4;
COMMIT;`

const STEP_LINES: readonly (readonly number[])[] = [
  [1],
  [2],
  [3],
  [4, 5],
  [],
  [6, 7, 8],
  [9, 10],
  [11],
  [12],
]

export async function AnatomySection() {
  const { t } = await getI18n()
  const copy = t.landing.anatomy
  return (
    <section aria-labelledby="anatomy" className="sheet-frame mt-40">
      <SectionHeading id="anatomy" mark={copy.mark} title={copy.title} lead={<p>{copy.lead}</p>} />
      <div className="mt-12">
        <AnatomyScroller
          steps={copy.steps.map((step, index) => ({ ...step, lines: STEP_LINES[index] ?? [] }))}
          code={CORE_SQL}
          codeTitle={copy.codeTitle}
          stepLabel={copy.step}
          noSql={copy.noSql}
          lockOrder={
            <div className="surface p-5">
              <p className="label text-ink-3">{copy.lockOrder}</p>
              <ol className="mt-4 grid gap-2 sm:grid-cols-3">
                {LOCK_ORDER.map((entry, index) => (
                  <li
                    key={entry.table}
                    className={`rounded-2xl border px-4 py-3 ${index === 1 ? 'border-signal/50 bg-signal-wash shadow-[0_0_32px_-12px_var(--color-signal)]' : 'border-rule bg-[rgb(238_241_246/0.02)]'}`}
                  >
                    <p className="font-mono text-xs text-ink-3">{entry.order}</p>
                    <p className="mt-1 break-all font-mono text-[0.8125rem] text-ink">
                      {entry.table}
                    </p>
                    <p
                      className={`mt-0.5 font-mono text-xs ${index === 1 ? 'text-signal' : 'text-ink-3'}`}
                    >
                      {entry.how}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm text-ink-2">{copy.lockOrderNote}</p>
            </div>
          }
        />
      </div>
      <div className="mt-10 flex justify-center">
        <ButtonLink href="/architecture" variant="secondary">
          {copy.cta} <Arrow />
        </ButtonLink>
      </div>
    </section>
  )
}

export async function LimitsSection() {
  const { t } = await getI18n()
  const copy = t.landing.limits
  return (
    <section aria-labelledby="limits" className="sheet-frame mt-40">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <SectionHeading
              id="limits"
              mark={copy.mark}
              title={copy.title}
              lead={<p>{copy.lead}</p>}
              dot="var(--color-waitlisted)"
            />
          </div>
        </div>
        <ol className="grid gap-4 lg:col-span-7">
          {copy.items.map((entry, index) => (
            <li
              key={entry.limit}
              data-spotlight
              className="surface rise-in grid gap-4 p-6 sm:grid-cols-[4rem_1fr] sm:p-8"
            >
              <span className="wide font-display text-4xl font-bold leading-none tracking-[-0.06em] text-ink-3/60">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-2xl tracking-[-0.03em]">{entry.limit}</h3>
                <p className="mt-3 text-ink-2">{entry.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const VERIFY_COMMANDS = [
  'git clone <repository> eventcore && cd eventcore',
  'pnpm install',
  'pnpm db:up && pnpm db:migrate && pnpm db:seed',
  'pnpm test',
]

export async function VerifySection() {
  const { t } = await getI18n()
  const copy = t.landing.verify
  return (
    <section aria-labelledby="verify" className="relative mt-40 overflow-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_60%_at_50%_40%,rgb(125_139_255/0.14),transparent_70%)]"
      />
      <div className="sheet-frame relative py-10">
        <SectionHeading
          id="verify"
          mark={copy.mark}
          title={copy.title}
          lead={<p>{copy.lead}</p>}
          align="center"
          size="display"
          dot="var(--color-confirmed)"
        />
        <div className="scale-in mx-auto mt-12 max-w-2xl">
          <Terminal lines={VERIFY_COMMANDS} title={t.common.terminal} />
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/lab">
            {copy.primary} <Arrow />
          </ButtonLink>
          <ButtonLink href="/architecture" variant="secondary">
            {copy.secondary}
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
