import { Notice } from './notice'

export function PersonaRequired({ kind }: { readonly kind: 'participant' | 'organizer' }) {
  return (
    <Notice tone="signal" title={`Act as a demo ${kind} to open this sheet`}>
      Use <strong>Acting as</strong> in the header and pick{' '}
      {kind === 'participant' ? 'Rio, Sol or Ivo' : 'Mara, Teo or Lis'}. Demo personas carry no
      personal data; choosing one signs a short-lived token on the server.
    </Notice>
  )
}
