import 'server-only'
import { createTokenVerifier, signDemoToken } from '@eventcore/auth'
import { DEMO_PERSONAS, type DemoPersona, type DemoPersonaId } from '@eventcore/contracts'
import { cookies } from 'next/headers'
import { serverEnv } from './env'

const SESSION_COOKIE = 'ec_session'
const SESSION_TTL_SECONDS = 8 * 60 * 60

export interface Session {
  readonly persona: DemoPersona
  readonly token: string
}

export const findPersona = (id: string): DemoPersona | undefined =>
  DEMO_PERSONAS.find((persona) => persona.externalAuthId === id)

export const demoSigningAvailable = (): boolean => Boolean(serverEnv().AUTH_DEMO_SECRET)

export const readSession = async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const { AUTH_DEMO_SECRET, AUTH_ISSUER, AUTH_AUDIENCE } = serverEnv()
  if (!token || !AUTH_DEMO_SECRET) return null
  try {
    const identity = await createTokenVerifier({
      issuer: AUTH_ISSUER,
      audience: AUTH_AUDIENCE,
      demoSecret: AUTH_DEMO_SECRET,
    })(token)
    const persona = findPersona(identity.subject)
    return persona ? { persona, token } : null
  } catch {
    return null
  }
}

export const startSession = async (personaId: DemoPersonaId): Promise<void> => {
  const persona = findPersona(personaId)
  const { AUTH_DEMO_SECRET, AUTH_ISSUER, AUTH_AUDIENCE } = serverEnv()
  if (!persona || !AUTH_DEMO_SECRET) throw new Error('Demo personas are not available here.')
  const token = await signDemoToken({
    secret: AUTH_DEMO_SECRET,
    issuer: AUTH_ISSUER,
    audience: AUTH_AUDIENCE,
    subject: persona.externalAuthId,
    displayName: persona.displayName,
    ttlSeconds: SESSION_TTL_SECONDS,
  })
  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export const endSession = async (): Promise<void> => {
  ;(await cookies()).delete(SESSION_COOKIE)
}
