'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useI18n } from '@/i18n/provider'
import { cancelRegistrationAction } from '@/lib/actions/registration-actions'
import { IDLE } from './action-state'

function CancelButton() {
  const { t } = useI18n()
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-10 rounded-full border border-rule px-4 text-sm text-ink-2 transition-colors hover:border-rejected/60 hover:bg-rejected-wash hover:text-rejected disabled:cursor-wait disabled:opacity-50"
    >
      {pending ? t.registration.cancelling : t.registration.cancel}
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
  const { t } = useI18n()
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
            ? t.registration.cancelledPromoted
            : t.registration.cancelled
          : state.kind === 'problem'
            ? `${t.api.problems[state.code] ?? state.title}${state.retryable ? t.registration.retrySafeShort : ''}`
            : state.kind === 'unavailable'
              ? t.registration.noAnswer
              : null}
      </p>
    </form>
  )
}
