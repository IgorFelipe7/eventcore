'use client'

import { type RegistrationStatus } from '@eventcore/domain'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Notice } from '@/components/notice'
import { RegistrationStatusTag } from '@/components/status-tag'
import { registerForEventAction } from '@/lib/actions/registration-actions'
import { type CommandState, IDLE } from './action-state'

function SubmitButton({ label }: { readonly label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="relative inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[2px] border border-ink bg-ink px-5 text-[0.95rem] font-medium text-paper transition-colors hover:border-signal hover:bg-signal disabled:cursor-wait disabled:hover:border-ink disabled:hover:bg-ink"
    >
      <span className={pending ? 'invisible' : undefined}>{label}</span>
      {pending ? (
        <span className="absolute inset-0 flex items-center justify-center gap-2">
          <span aria-hidden className="size-2 animate-pulse rounded-full bg-signal" />
          Asking the database…
        </span>
      ) : null}
    </button>
  )
}

const SERVER_STEPS = [
  'Verified the demo token and resolved the participant',
  'Claimed the idempotency key, or found its committed twin',
  'Locked the inventory row and re-read seats, queue and your row',
  'Committed the decision with its history, audit entry and outbox event',
]

function Receipt({ state }: { readonly state: Extract<CommandState, { kind: 'registered' }> }) {
  const headline: Record<RegistrationStatus, string> = {
    CONFIRMED: 'You’re confirmed. The seat is held by the database, not by this page.',
    WAITLISTED: `You’re #${state.waitlistPosition ?? '?'} in line. If a seat opens you’re promoted automatically, in order.`,
    REJECTED: 'Every seat is taken and this event doesn’t keep a waitlist.',
    CANCELLED: 'This registration is cancelled.',
  }
  return (
    <div role="status" className="border border-ink bg-sheet">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink px-4 py-3">
        <RegistrationStatusTag status={state.status} position={state.waitlistPosition} />
        <span className="label text-ink-3">
          {state.replayed
            ? 'Replayed answer'
            : state.transition === 'UNCHANGED'
              ? 'No change'
              : 'New decision'}
        </span>
      </div>
      <div className="px-4 py-4">
        <p className="text-ink">{headline[state.status]}</p>
        {state.replayed ? (
          <p className="mt-2 text-sm text-ink-2">
            Same request as before — here is the original answer. Nothing was booked twice.
          </p>
        ) : state.transition === 'UNCHANGED' ? (
          <p className="mt-2 text-sm text-ink-2">
            You already held this registration, so the database returned it instead of creating
            another.
          </p>
        ) : null}
        <ol className="mt-4 grid gap-1.5 border-t border-rule pt-3 text-sm text-ink-2">
          {SERVER_STEPS.map((step, index) => (
            <li key={step} className="grid grid-cols-[1.75rem_1fr]">
              <span className="font-mono text-xs leading-5 text-confirmed">✓ {index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-rule pt-3 font-mono text-xs">
          <dt className="text-ink-3">Idempotency key</dt>
          <dd className="truncate text-ink">{state.key}</dd>
          <dt className="text-ink-3">Decided by request</dt>
          <dd className="truncate text-ink">{state.requestId}</dd>
          {state.replayed && state.answeredRequestId ? (
            <>
              <dt className="text-ink-3">Answered request</dt>
              <dd className="truncate text-ink">{state.answeredRequestId}</dd>
            </>
          ) : null}
          <dt className="text-ink-3">Snapshot after decision</dt>
          <dd className="text-ink tabular">
            {state.inventory.confirmed}/{state.inventory.capacity} · queue{' '}
            {state.inventory.waitlisted}
          </dd>
        </dl>
      </div>
    </div>
  )
}

export function RegistrationPanel({
  eventId,
  idempotencyKey,
  currentStatus,
  currentPosition,
  closedReason,
}: {
  readonly eventId: string
  readonly idempotencyKey: string
  readonly currentStatus: RegistrationStatus | null
  readonly currentPosition: number | null
  readonly closedReason: string | null
}) {
  const [state, formAction] = useActionState(registerForEventAction, IDLE)
  const held = currentStatus === 'CONFIRMED' || currentStatus === 'WAITLISTED'
  const retryKey =
    state.kind === 'problem' || state.kind === 'unavailable' ? state.key : idempotencyKey

  return (
    <div className="grid gap-4">
      {held && state.kind === 'idle' ? (
        <Notice
          tone={currentStatus === 'CONFIRMED' ? 'success' : 'waiting'}
          title="You already hold this registration"
        >
          <span className="inline-flex items-center gap-2">
            Current status{' '}
            <RegistrationStatusTag status={currentStatus} position={currentPosition} />
          </span>
        </Notice>
      ) : null}

      {state.kind === 'registered' ? <Receipt state={state} /> : null}

      {state.kind === 'problem' ? (
        <Notice tone={state.retryable ? 'waiting' : 'danger'} title={state.title} live>
          {state.detail}
          {state.retryable ? (
            <span className="mt-1 block">
              Retrying is safe: it reuses the same key, so it can’t book twice.
            </span>
          ) : null}
          <span className="mt-1 block font-mono text-xs text-ink-3">request {state.requestId}</span>
        </Notice>
      ) : null}

      {state.kind === 'unavailable' ? (
        <Notice tone="waiting" title="We couldn’t confirm the outcome" live>
          The API didn’t answer in time. Retrying is safe: the same idempotency key goes with it, so
          it can’t book twice.
        </Notice>
      ) : null}

      {state.kind === 'needs-persona' ? (
        <Notice tone="signal" title="Choose a demo persona first" live>
          Use “Acting as” in the header. No account and no personal data.
        </Notice>
      ) : null}

      {closedReason ? (
        <Notice title="Registration is not open">{closedReason}</Notice>
      ) : (
        <form action={formAction} className="grid gap-3">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="idempotencyKey" value={retryKey} />
          <SubmitButton
            label={
              state.kind === 'problem' || state.kind === 'unavailable'
                ? 'Retry with the same key'
                : held
                  ? 'Ask again — it won’t duplicate'
                  : 'Reserve a seat'
            }
          />
          <p className="font-mono text-[0.7rem] text-ink-3">
            Idempotency-Key <span className="text-ink-2">{retryKey}</span>
          </p>
        </form>
      )}

      {state.kind === 'registered' ? (
        <form action={formAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="idempotencyKey" value={state.key} />
          <button
            type="submit"
            className="min-h-11 text-sm text-ink underline decoration-ink-3/60 hover:text-signal"
          >
            Resend the exact same request ({state.key.slice(0, 8)}…)
          </button>
        </form>
      ) : null}
    </div>
  )
}
