import { randomUUID } from 'node:crypto'
import { MyRegistrationListSchema } from '@eventcore/contracts'
import { type Metadata } from 'next'
import Link from 'next/link'
import { ApiFailure } from '@/components/api-state'
import { Arrow, ButtonLink } from '@/components/button'
import { PersonaRequired } from '@/components/persona-required'
import { SectionHeading, SheetBar, TitleBlock } from '@/components/sheet'
import { RegistrationStatusTag } from '@/components/status-tag'
import { CancelForm } from '@/features/registrations/cancel-form'
import { callApi } from '@/lib/api'
import { formatDateTime, formatSnapshot } from '@/lib/format'
import { readSession } from '@/lib/session'

export const metadata: Metadata = { title: 'My registrations' }

const sheet = { number: 3, title: 'My registrations' }

const REASONS: Record<string, string> = {
  'participant.registered': 'Registered',
  'participant.reentered': 'Registered again',
  'participant.cancelled': 'Cancelled by you',
  'organizer.cancelled': 'Cancelled by the organizer',
  'waitlist.promoted': 'Promoted from the waitlist',
  seed: 'Imported',
}

export default async function MyRegistrationsPage() {
  const session = await readSession()
  const result =
    session?.persona.kind === 'participant'
      ? await callApi('/v1/me/registrations', {
          schema: MyRegistrationListSchema,
          token: session.token,
        })
      : null

  return (
    <main id="main">
      <SheetBar sheet={sheet} />
      <section className="sheet-frame mt-12">
        <SectionHeading
          mark={session ? `Acting as ${session.persona.displayName}` : 'Participant'}
          title="Every state you’ve been in, and why."
          lead={
            <p>
              Each registration keeps its full history. Positions in line are computed from the
              queue at read time, so they only ever move forward.
            </p>
          }
        />
        <div className="mt-10">
          {!session || session.persona.kind !== 'participant' ? (
            <PersonaRequired kind="participant" />
          ) : !result?.ok ? (
            result ? (
              <ApiFailure result={result} />
            ) : null
          ) : result.data.items.length === 0 ? (
            <div className="border border-dashed border-ink-3 p-8">
              <p className="text-lg">No registrations yet.</p>
              <ButtonLink href="/explore" className="mt-4">
                Find an event <Arrow />
              </ButtonLink>
            </div>
          ) : (
            <ol className="border-t border-ink">
              {result.data.items.map((registration) => (
                <li
                  key={registration.registrationId}
                  className="grid grid-cols-12 gap-x-4 gap-y-4 border-b border-rule py-6 md:gap-x-6"
                >
                  <div className="col-span-12 md:col-span-5">
                    <Link
                      href={`/events/${registration.event.organizationSlug}/${registration.event.slug}`}
                      className="font-display text-2xl font-semibold hover:text-signal"
                    >
                      {registration.event.name}
                    </Link>
                    <p className="mt-1 text-sm text-ink-2">
                      {formatDateTime(registration.event.startsAt)} · {registration.event.venue}
                    </p>
                    <div className="mt-3">
                      <RegistrationStatusTag
                        status={registration.status}
                        position={registration.waitlistPosition}
                      />
                    </div>
                  </div>
                  <ol
                    aria-label="History"
                    className="col-span-12 grid content-start gap-2 md:col-span-4"
                  >
                    {registration.history.map((entry, index) => (
                      <li
                        key={`${entry.occurredAt}-${index}`}
                        className="grid grid-cols-[auto_1fr] gap-x-3 text-sm"
                      >
                        <span
                          aria-hidden
                          className={`mt-1.5 size-2 rounded-full ${index === registration.history.length - 1 ? 'bg-signal' : 'bg-ink-3/60'}`}
                        />
                        <span>
                          <span className="text-ink">{REASONS[entry.reason] ?? entry.reason}</span>
                          <span className="ml-2 font-mono text-xs text-ink-3">
                            {entry.from ?? 'new'} → {entry.to}
                          </span>
                          <span className="block font-mono text-xs text-ink-3 tabular">
                            {formatSnapshot(entry.occurredAt)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                  <div className="col-span-12 md:col-span-3 md:justify-self-end">
                    <CancelForm
                      registrationId={registration.registrationId}
                      idempotencyKey={randomUUID()}
                      cancellable={
                        registration.status === 'CONFIRMED' || registration.status === 'WAITLISTED'
                      }
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
      <TitleBlock sheet={sheet} />
    </main>
  )
}
