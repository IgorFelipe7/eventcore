'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { cancelRegistrationAction } from '@/lib/actions/registration-actions'
import { IDLE } from './action-state'

function CancelButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-[2px] border border-ink px-3 text-sm hover:bg-ink hover:text-paper disabled:cursor-wait disabled:border-rule disabled:text-ink-3"
    >
      {pending ? 'Cancelling…' : 'Cancel registration'}
    </button>
  )
}

export function CancelForm({
  registrationId,
  idempotencyKey,
  cancellable,
}: {
  readonly registrationId: string
  readonly idempotencyKey: string
  readonly cancellable: boolean
}) {
  const [state, formAction] = useActionState(cancelRegistrationAction, IDLE)
  const key = state.kind === 'problem' || state.kind === 'unavailable' ? state.key : idempotencyKey

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="registrationId" value={registrationId} />
      <input type="hidden" name="idempotencyKey" value={key} />
      {cancellable ? <CancelButton /> : null}
      <p role="status" className="text-sm text-ink-2">
        {state.kind === 'cancelled'
          ? state.promoted
            ? 'Cancelled. The next person in line was promoted in the same transaction.'
            : 'Cancelled.'
          : state.kind === 'problem'
            ? `${state.title}${state.retryable ? ' Retrying is safe.' : ''}`
            : state.kind === 'unavailable'
              ? 'No answer from the API. Retrying is safe: it reuses the same key.'
              : null}
      </p>
    </form>
  )
}
