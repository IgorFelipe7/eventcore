import { getI18n } from '@/i18n/server'
import { Notice } from './notice'

export async function PersonaRequired({ kind }: { readonly kind: 'participant' | 'organizer' }) {
  const { t } = await getI18n()
  return (
    <Notice tone="signal" title={t.persona.required(kind)}>
      {t.persona.requiredBody(
        kind === 'participant' ? t.persona.participantNames : t.persona.organizerNames,
      )}
    </Notice>
  )
}
