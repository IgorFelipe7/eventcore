import { Fragment } from 'react'
import { repositoryLink } from '@/lib/public-config'

export function EvidenceLink({ path }: { readonly path: string }) {
  const href = repositoryLink(path)
  const segments = path.split('/')
  const text = (
    <code className="text-[0.8125rem]">
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <>
              /<wbr />
            </>
          ) : null}
          {segment}
        </Fragment>
      ))}
    </code>
  )
  return href ? (
    <a
      href={href}
      className="text-ink underline decoration-ink-3/50 underline-offset-4 transition-colors hover:text-signal"
    >
      {text}
    </a>
  ) : (
    <span className="text-ink-2">{text}</span>
  )
}
