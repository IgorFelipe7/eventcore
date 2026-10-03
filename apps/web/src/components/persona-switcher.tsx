import { DEMO_PERSONAS } from '@eventcore/contracts'
import { actAsPersona, stopActing } from '@/lib/actions/session-actions'
import { type Session } from '@/lib/session'

export function PersonaSwitcher({
  session,
  available,
  returnTo,
}: {
  readonly session: Session | null
  readonly available: boolean
  readonly returnTo: string
}) {
  if (!available) {
    return <span className="label text-ink-3">Read-only demo</span>
  }

  const groups = [
    {
      title: 'Participants',
      personas: DEMO_PERSONAS.filter((persona) => persona.kind === 'participant'),
    },
    {
      title: 'Organizers',
      personas: DEMO_PERSONAS.filter((persona) => persona.kind === 'organizer'),
    },
  ]

  return (
    <details className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[2px] border border-ink px-3 text-sm marker:hidden hover:bg-ink hover:text-paper [&::-webkit-details-marker]:hidden">
        <span className="label text-ink-3 group-hover:text-paper/70">Acting as</span>
        <span className="max-w-36 truncate font-medium">
          {session ? session.persona.displayName.split(' (')[0] : 'Nobody'}
        </span>
        <span aria-hidden className="font-mono text-xs transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] border border-ink bg-sheet p-2 shadow-[6px_6px_0_0_var(--color-ink)]">
        <p className="px-2 pb-2 pt-1 text-xs text-ink-2">
          Demo personas only. No account and no personal data: choosing one signs a short-lived
          token on the server.
        </p>
        {groups.map((group) => (
          <div key={group.title} className="border-t border-rule pt-1">
            <p className="label px-2 py-1.5 text-ink-3">{group.title}</p>
            {group.personas.map((persona) => {
              const active = session?.persona.externalAuthId === persona.externalAuthId
              return (
                <form key={persona.externalAuthId} action={actAsPersona}>
                  <input type="hidden" name="persona" value={persona.externalAuthId} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button
                    type="submit"
                    aria-current={active ? 'true' : undefined}
                    className="flex min-h-10 w-full items-center justify-between gap-3 rounded-[2px] px-2 text-left text-sm hover:bg-ink hover:text-paper aria-[current=true]:bg-signal-wash"
                  >
                    <span>{persona.displayName}</span>
                    {active ? <span className="label">Active</span> : null}
                  </button>
                </form>
              )
            })}
          </div>
        ))}
        {session ? (
          <form action={stopActing} className="mt-1 border-t border-rule pt-1">
            <input type="hidden" name="returnTo" value={returnTo} />
            <button
              type="submit"
              className="min-h-10 w-full rounded-[2px] px-2 text-left text-sm text-ink-2 hover:bg-ink hover:text-paper"
            >
              Stop acting
            </button>
          </form>
        ) : null}
      </div>
    </details>
  )
}
