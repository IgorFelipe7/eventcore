import { DEMO_PERSONAS } from '@eventcore/contracts'
import { getI18n } from '@/i18n/server'
import { actAsPersona, stopActing } from '@/lib/actions/session-actions'
import { type Session } from '@/lib/session'

export async function PersonaSwitcher({
  session,
  available,
  returnTo,
}: {
  readonly session: Session | null
  readonly available: boolean
  readonly returnTo: string
}) {
  const { t } = await getI18n()
  if (!available) {
    return <span className="label text-ink-3">{t.persona.readOnly}</span>
  }
  const name = (displayName: string) => displayName.split(' (')[0] ?? displayName

  const groups = [
    {
      title: t.persona.participants,
      personas: DEMO_PERSONAS.filter((persona) => persona.kind === 'participant'),
    },
    {
      title: t.persona.organizers,
      personas: DEMO_PERSONAS.filter((persona) => persona.kind === 'organizer'),
    },
  ]

  return (
    <details className="group relative">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full bg-[rgb(238_241_246/0.06)] px-3.5 text-sm transition-colors marker:hidden hover:bg-[rgb(238_241_246/0.12)] group-open:bg-[rgb(238_241_246/0.12)] [&::-webkit-details-marker]:hidden">
        <span className="label text-ink-3 max-sm:sr-only">{t.persona.actingAs}</span>
        <span className="max-w-36 truncate font-medium">
          {session ? name(session.persona.displayName) : t.persona.nobody}
        </span>
        <span aria-hidden className="font-mono text-xs transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="glass absolute right-0 z-30 mt-3 w-[min(21rem,calc(100vw-2rem))] origin-top-right animate-rise rounded-3xl p-2">
        <p className="px-3 pb-3 pt-2 text-xs leading-relaxed text-ink-3">{t.persona.intro}</p>
        {groups.map((group) => (
          <div key={group.title} className="border-t border-rule pt-1.5">
            <p className="label px-3 py-1.5 text-ink-3">{group.title}</p>
            {group.personas.map((persona) => {
              const active = session?.persona.externalAuthId === persona.externalAuthId
              return (
                <form key={persona.externalAuthId} action={actAsPersona}>
                  <input type="hidden" name="persona" value={persona.externalAuthId} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button
                    type="submit"
                    aria-current={active ? 'true' : undefined}
                    className="flex min-h-10 w-full items-center justify-between gap-3 rounded-2xl px-3 text-left text-sm transition-colors hover:bg-[rgb(238_241_246/0.08)] aria-current:bg-signal-wash"
                  >
                    <span>
                      {name(persona.displayName)}{' '}
                      <span className="text-ink-3">
                        ({t.persona.roles[persona.externalAuthId] ?? persona.kind})
                      </span>
                    </span>
                    {active ? <span className="label text-signal">{t.persona.active}</span> : null}
                  </button>
                </form>
              )
            })}
          </div>
        ))}
        {session ? (
          <form action={stopActing} className="mt-1.5 border-t border-rule pt-1.5">
            <input type="hidden" name="returnTo" value={returnTo} />
            <button
              type="submit"
              className="min-h-10 w-full rounded-2xl px-3 text-left text-sm text-ink-2 transition-colors hover:bg-[rgb(238_241_246/0.08)] hover:text-ink"
            >
              {t.persona.stop}
            </button>
          </form>
        ) : null}
      </div>
    </details>
  )
}
