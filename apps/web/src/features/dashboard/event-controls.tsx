'use client'

import { type EventStatus } from '@eventcore/domain'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useI18n } from '@/i18n/provider'
import {
  type OrganizerFormState,
  changeCapacityAction,
  transitionEventAction,
} from '@/lib/actions/organizer-actions'

const INITIAL: OrganizerFormState = { kind: 'idle' }

function Pending({ idle, busy }: { readonly idle: string; readonly busy: string }) {
  const { pending } = useFormStatus()
  return <>{pending ? busy : idle}</>
}

function Outcome({ state }: { readonly state: OrganizerFormState }) {
  if (state.kind === 'idle') return null
  return (
    <p
      role="status"
      className={`text-sm ${state.kind === 'error' ? 'text-rejected' : 'text-confirmed'}`}
    >
      {state.message}
    </p>
  )
}

export function LifecycleControls({
  organizationId,
  eventId,
  transitions,
}: {
  readonly organizationId: string
  readonly eventId: string
  readonly transitions: readonly EventStatus[]
}) {
  const { t } = useI18n()
  const [state, formAction] = useActionState(transitionEventAction, INITIAL)
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {transitions.length === 0 ? (
          <p className="text-sm text-ink-2">{t.panel.terminal}</p>
        ) : (
          transitions.map((status) => (
            <form key={status} action={formAction}>
              <input type="hidden" name="organizationId" value={organizationId} />
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="status" value={status} />
              <button
                type="submit"
                className={`min-h-11 rounded-xs border px-3 text-sm ${
                  status === 'CANCELLED'
                    ? 'border-rejected text-rejected hover:bg-rejected hover:text-white'
                    : 'border-ink hover:bg-ink hover:text-paper'
                }`}
              >
                <Pending idle={t.panel.transitions[status]} busy={t.panel.applying} />
              </button>
            </form>
          ))
        )}
      </div>
      <Outcome state={state} />
    </div>
  )
}

export function CapacityControl({
  organizationId,
  eventId,
  capacity,
  confirmed,
  idempotencyKey,
  allowed,
}: {
  readonly organizationId: string
  readonly eventId: string
  readonly capacity: number
  readonly confirmed: number
  readonly idempotencyKey: string
  readonly allowed: boolean
}) {
  const { t } = useI18n()
  const [state, formAction] = useActionState(changeCapacityAction, INITIAL)
  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <label htmlFor="capacity" className="text-sm font-medium">
        {t.panel.newCapacity}
      </label>
      <div className="flex gap-2">
        <input
          id="capacity"
          name="capacity"
          type="number"
          min={confirmed}
          max={100000}
          defaultValue={capacity}
          disabled={!allowed}
          aria-describedby="capacity-hint"
          className="field w-32 font-mono text-sm tabular disabled:text-ink-3"
        />
        <button
          type="submit"
          disabled={!allowed}
          className="min-h-11 rounded-xs border border-ink bg-ink px-4 text-sm font-medium text-paper hover:border-signal hover:bg-signal disabled:cursor-not-allowed disabled:border-cancelled disabled:bg-cancelled"
        >
          <Pending idle={t.panel.apply} busy={t.panel.locking} />
        </button>
      </div>
      <p id="capacity-hint" className="text-xs text-ink-3">
        {allowed ? t.panel.capacityHint(confirmed) : t.panel.adminsOnly}
      </p>
      <Outcome state={state} />
    </form>
  )
}
