'use client'

import { type RegistrationStatus } from '@eventcore/domain'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Notice } from '@/components/notice'
import { RegistrationStatusTag } from '@/components/status-tag'
import { Ticket, type TicketTone } from '@/components/ticket'
import { useI18n } from '@/i18n/provider'
import { registerForEventAction } from '@/lib/actions/registration-actions'
import { type CommandState, IDLE } from './action-state'

function SubmitButton({ label }: { readonly label: string }) {
  const { t } = useI18n()
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="relative inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xs border border-ink bg-ink px-5 text-[0.95rem] font-medium text-paper transition-colors hover:border-signal hover:bg-signal disabled:cursor-wait disabled:hover:border-ink disabled:hover:bg-ink"
    >
      <span className={pending ? 'invisible' : undefined}>{label}</span>
      {pending ? (
        <span className="absolute inset-0 flex items-center justify-center gap-2">
          <span aria-hidden className="size-2 animate-pulse rounded-full bg-signal" />
          {t.registration.asking}
        </span>
      ) : null}
    </button>
  )
}

function Receipt({ state }: { readonly state: Extract<CommandState, { kind: 'registered' }> }) {
  const { t } = useI18n()
  const position = String(state.waitlistPosition ?? '?')
  const headline: Record<RegistrationStatus, string> = {
    CONFIRMED: t.registration.headline.CONFIRMED,
    WAITLISTED: t.registration.headline.WAITLISTED(position),
    REJECTED: t.registration.headline.REJECTED,
    CANCELLED: t.registration.headline.CANCELLED,
  }
  const stub: Record<RegistrationStatus, { label: string; value: string; tone: TicketTone }> = {
    CONFIRMED: { label: t.registration.stub.CONFIRMED, value: '✓', tone: 'confirmed' },
    WAITLISTED: {
      label: t.registration.stub.WAITLISTED,
      value: `#${position}`,
      tone: 'waitlisted',
    },
    REJECTED: { label: t.registration.stub.REJECTED, value: '×', tone: 'rejected' },
    CANCELLED: { label: t.registration.stub.CANCELLED, value: '○', tone: 'neutral' },
  }
  const { label, value, tone } = stub[state.status]
  return (
    <Ticket tone={tone} stubLabel={label} stubValue={value} serial={state.key.slice(0, 8)} live>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink px-4 py-3">
        <RegistrationStatusTag status={state.status} position={state.waitlistPosition} />
        <span className="label text-ink-3">
          {state.replayed
            ? t.registration.replayedAnswer
            : state.transition === 'UNCHANGED'
              ? t.registration.noChange
              : t.registration.newDecision}
        </span>
      </div>
      <div className="px-4 py-4">
        <p className="text-ink">{headline[state.status]}</p>
        {state.replayed ? (
          <p className="mt-2 text-sm text-ink-2">{t.registration.replayedNote}</p>
        ) : state.transition === 'UNCHANGED' ? (
          <p className="mt-2 text-sm text-ink-2">{t.registration.unchangedNote}</p>
        ) : null}
        <ol className="mt-4 grid gap-1.5 border-t border-rule pt-3 text-sm text-ink-2">
          {t.registration.steps.map((step, index) => (
            <li key={step} className="grid grid-cols-[1.75rem_1fr]">
              <span className="font-mono text-xs leading-5 text-confirmed">✓ {index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-rule pt-3 font-mono text-xs">
          <dt className="text-ink-3">{t.registration.key}</dt>
          <dd className="truncate text-ink">{state.key}</dd>
          <dt className="text-ink-3">{t.registration.decidedBy}</dt>
          <dd className="truncate text-ink">{state.requestId}</dd>
          {state.replayed && state.answeredRequestId ? (
            <>
              <dt className="text-ink-3">{t.registration.answered}</dt>
              <dd className="truncate text-ink">{state.answeredRequestId}</dd>
            </>
          ) : null}
          <dt className="text-ink-3">{t.registration.after}</dt>
          <dd className="text-ink tabular">
            {state.inventory.confirmed}/{state.inventory.capacity} · {t.registration.queue}{' '}
            {state.inventory.waitlisted}
          </dd>
        </dl>
      </div>
    </Ticket>
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
  const { t } = useI18n()
  const [state, formAction] = useActionState(registerForEventAction, IDLE)
  const held = currentStatus === 'CONFIRMED' || currentStatus === 'WAITLISTED'
  const retryKey =
    state.kind === 'problem' || state.kind === 'unavailable' ? state.key : idempotencyKey

  return (
    <div className="grid gap-4">
      {held && state.kind === 'idle' ? (
        <Notice
          tone={currentStatus === 'CONFIRMED' ? 'success' : 'waiting'}
          title={t.registration.alreadyHeld}
        >
          <span className="inline-flex items-center gap-2">
            {t.registration.currentStatus}{' '}
            <RegistrationStatusTag status={currentStatus} position={currentPosition} />
          </span>
        </Notice>
      ) : null}

      {state.kind === 'registered' ? <Receipt state={state} /> : null}

      {state.kind === 'problem' ? (
        <Notice
          tone={state.retryable ? 'waiting' : 'danger'}
          title={t.api.problems[state.code] ?? state.title}
          live
        >
          {t.api.problems[state.code] ? null : state.detail}
          {state.retryable ? <span className="mt-1 block">{t.registration.retrySafe}</span> : null}
          <span className="mt-1 block font-mono text-xs text-ink-3">
            {t.common.request} {state.requestId}
          </span>
        </Notice>
      ) : null}

      {state.kind === 'unavailable' ? (
        <Notice tone="waiting" title={t.registration.unavailableTitle} live>
          {t.registration.unavailable}
        </Notice>
      ) : null}

      {state.kind === 'needs-persona' ? (
        <Notice tone="signal" title={t.registration.personaTitle} live>
          {t.registration.persona}
        </Notice>
      ) : null}

      {closedReason ? (
        <Notice title={t.registration.closedTitle}>{closedReason}</Notice>
      ) : (
        <form action={formAction} className="grid gap-3">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="idempotencyKey" value={retryKey} />
          <SubmitButton
            label={
              state.kind === 'problem' || state.kind === 'unavailable'
                ? t.registration.retry
                : held
                  ? t.registration.askAgain
                  : t.registration.reserve
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
            {t.registration.resend(state.key.slice(0, 8))}
          </button>
        </form>
      ) : null}
    </div>
  )
}
