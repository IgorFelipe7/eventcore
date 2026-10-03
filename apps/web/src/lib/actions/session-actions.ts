'use server'

import { DEMO_PERSONAS, type DemoPersonaId } from '@eventcore/contracts'
import { redirect } from 'next/navigation'
import { endSession, startSession } from '../session'

const safeReturnPath = (value: FormDataEntryValue | null): string => {
  const path = typeof value === 'string' ? value : '/'
  return path.startsWith('/') && !path.startsWith('//') ? path : '/'
}

const isPersonaId = (value: unknown): value is DemoPersonaId =>
  DEMO_PERSONAS.some((persona) => persona.externalAuthId === value)

export async function actAsPersona(formData: FormData) {
  const personaId = formData.get('persona')
  if (!isPersonaId(personaId)) throw new Error('Unknown demo persona.')
  await startSession(personaId)
  redirect(safeReturnPath(formData.get('returnTo')))
}

export async function stopActing(formData: FormData) {
  await endSession()
  redirect(safeReturnPath(formData.get('returnTo')))
}
