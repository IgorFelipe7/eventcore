import { repositoryLink } from '@/lib/public-config'

export function EvidenceLink({ path }: { readonly path: string }) {
  const href = repositoryLink(path)
  const text = <code className="break-all text-[0.8125rem]">{path}</code>
  return href ? (
    <a href={href} className="text-ink underline decoration-ink-3/60 hover:text-signal">
      {text}
    </a>
  ) : (
    <span className="text-ink-2">{text}</span>
  )
}
