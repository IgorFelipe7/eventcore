'use client'

import { type Membership } from '@eventcore/contracts'
import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { Notice } from '@/components/notice'
import { useI18n } from '@/i18n/provider'
import { type OrganizerFormState, createEventAction } from '@/lib/actions/organizer-actions'
import { Field } from './field'

const INITIAL: OrganizerFormState = { kind: 'idle' }

function Submit() {
  const { t } = useI18n()
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 rounded-xs border border-ink bg-ink px-5 font-medium text-paper hover:border-signal hover:bg-signal disabled:cursor-wait"
    >
      {pending ? t.newEvent.creating : t.newEvent.create}
    </button>
  )
}

export function NewEventForm({
  memberships,
  defaultOrganizationId,
  schedule,
}: {
  readonly memberships: readonly Membership[]
  readonly defaultOrganizationId: string | undefined
  readonly schedule: {
    readonly offset: string
    readonly zoneLabel: string
    readonly opens: string
    readonly closes: string
    readonly starts: string
  }
}) {
  const { t } = useI18n()
  const [state, formAction] = useActionState(createEventAction, INITIAL)
  const form = useRef<HTMLFormElement>(null)
  const fields = state.kind === 'error' ? state.fields : {}

  useEffect(() => {
    if (state.kind !== 'error') return
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [state])

  return (
    <form ref={form} action={formAction} className="grid gap-8" noValidate>
      <input type="hidden" name="timezoneOffset" value={schedule.offset} />
      {state.kind === 'error' ? (
        <Notice tone="danger" title={t.newEvent.failed} live>
          {state.message}
        </Notice>
      ) : null}

      <fieldset className="grid gap-5 border-t border-ink pt-5">
        <legend className="label pr-3 text-ink-3">{t.newEvent.identity}</legend>
        <div className="grid gap-1.5">
          <label htmlFor="organizationId" className="text-sm font-medium">
            {t.newEvent.organization}
          </label>
          <select
            id="organizationId"
            name="organizationId"
            defaultValue={defaultOrganizationId}
            className="field text-sm"
          >
            {memberships.map((membership) => (
              <option key={membership.organization.id} value={membership.organization.id}>
                {membership.organization.name} (
                {t.dashboard.roles[membership.role] ?? membership.role.toLowerCase()})
              </option>
            ))}
          </select>
        </div>
        <Field label={t.newEvent.name} name="name" required minLength={3} error={fields['name']} />
        <Field
          label={t.newEvent.slug}
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          hint={t.newEvent.slugHint}
          error={fields['slug']}
        />
        <Field label={t.newEvent.venue} name="venue" required error={fields['venue']} />
        <div className="grid gap-1.5">
          <label htmlFor="description" className="text-sm font-medium">
            {t.newEvent.description}
          </label>
          <textarea id="description" name="description" rows={4} className="field py-2.5 text-sm" />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 border-t border-ink pt-5 sm:grid-cols-3">
        <legend className="label pr-3 text-ink-3">{t.newEvent.schedule}</legend>
        <Field
          label={t.newEvent.opens}
          name="enrollmentOpensAt"
          type="datetime-local"
          defaultValue={schedule.opens}
          hint={schedule.zoneLabel}
          error={fields['enrollmentOpensAt']}
        />
        <Field
          label={t.newEvent.closes}
          name="enrollmentClosesAt"
          type="datetime-local"
          defaultValue={schedule.closes}
          error={fields['enrollmentClosesAt']}
        />
        <Field
          label={t.newEvent.starts}
          name="startsAt"
          type="datetime-local"
          defaultValue={schedule.starts}
          error={fields['startsAt']}
        />
      </fieldset>

      <fieldset className="grid gap-5 border-t border-ink pt-5 sm:grid-cols-2">
        <legend className="label pr-3 text-ink-3">{t.newEvent.seats}</legend>
        <Field
          label={t.newEvent.capacity}
          name="capacity"
          type="number"
          min={0}
          max={100000}
          defaultValue={40}
          hint={t.newEvent.capacityHint}
          error={fields['capacity']}
        />
        <label className="flex min-h-11 items-center gap-3 self-end text-sm">
          <input
            type="checkbox"
            name="waitlistEnabled"
            defaultChecked
            className="size-5 accent-(--color-signal)"
          />
          {t.newEvent.waitlist}
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-ink pt-6">
        <Submit />
        <p className="text-sm text-ink-2">{t.newEvent.draftNote}</p>
      </div>
    </form>
  )
}
