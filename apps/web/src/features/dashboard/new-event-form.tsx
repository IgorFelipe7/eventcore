'use client'

import { type Membership } from '@eventcore/contracts'
import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { Notice } from '@/components/notice'
import { type OrganizerFormState, createEventAction } from '@/lib/actions/organizer-actions'
import { Field } from './field'

const INITIAL: OrganizerFormState = { kind: 'idle' }

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 rounded-[2px] border border-ink bg-ink px-5 font-medium text-paper hover:border-signal hover:bg-signal disabled:cursor-wait"
    >
      {pending ? 'Creating draft…' : 'Create draft'}
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
        <Notice tone="danger" title="The draft wasn’t created" live>
          {state.message}
        </Notice>
      ) : null}

      <fieldset className="grid gap-5 border-t border-ink pt-5">
        <legend className="label pr-3 text-ink-3">Identity</legend>
        <div className="grid gap-1.5">
          <label htmlFor="organizationId" className="text-sm font-medium">
            Organization
          </label>
          <select
            id="organizationId"
            name="organizationId"
            defaultValue={defaultOrganizationId}
            className="min-h-11 rounded-[2px] border border-ink-3 bg-sheet px-3 text-sm"
          >
            {memberships.map((membership) => (
              <option key={membership.organization.id} value={membership.organization.id}>
                {membership.organization.name} ({membership.role.toLowerCase()})
              </option>
            ))}
          </select>
        </div>
        <Field label="Name" name="name" required minLength={3} error={fields['name']} />
        <Field
          label="Slug"
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          hint="Lowercase letters, digits and single hyphens. Part of the public address."
          error={fields['slug']}
        />
        <Field label="Venue" name="venue" required error={fields['venue']} />
        <div className="grid gap-1.5">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="rounded-[2px] border border-ink-3 bg-sheet px-3 py-2 text-sm"
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 border-t border-ink pt-5 sm:grid-cols-3">
        <legend className="label pr-3 text-ink-3">Schedule</legend>
        <Field
          label="Enrollment opens"
          name="enrollmentOpensAt"
          type="datetime-local"
          defaultValue={schedule.opens}
          hint={schedule.zoneLabel}
          error={fields['enrollmentOpensAt']}
        />
        <Field
          label="Enrollment closes"
          name="enrollmentClosesAt"
          type="datetime-local"
          defaultValue={schedule.closes}
          error={fields['enrollmentClosesAt']}
        />
        <Field
          label="Event starts"
          name="startsAt"
          type="datetime-local"
          defaultValue={schedule.starts}
          error={fields['startsAt']}
        />
      </fieldset>

      <fieldset className="grid gap-5 border-t border-ink pt-5 sm:grid-cols-2">
        <legend className="label pr-3 text-ink-3">Seats</legend>
        <Field
          label="Capacity"
          name="capacity"
          type="number"
          min={0}
          max={100000}
          defaultValue={40}
          hint="Can be raised later; never lowered below confirmed seats."
          error={fields['capacity']}
        />
        <label className="flex min-h-11 items-center gap-3 self-end text-sm">
          <input
            type="checkbox"
            name="waitlistEnabled"
            defaultChecked
            className="size-5 accent-[var(--color-signal)]"
          />
          Keep a first-in-first-out waitlist when full
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-ink pt-6">
        <Submit />
        <p className="text-sm text-ink-2">
          The event starts as a draft, invisible to participants.
        </p>
      </div>
    </form>
  )
}
