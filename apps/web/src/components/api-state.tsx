import { type ApiResult } from '@/lib/api'
import { Arrow, ButtonLink } from './button'
import { Notice } from './notice'

export function ApiUnavailable({ reason }: { readonly reason?: string }) {
  return (
    <Notice
      tone="waiting"
      title="The API isn’t reachable from this deployment"
      action={
        <ButtonLink href="/lab" variant="secondary">
          The Lab still works <Arrow />
        </ButtonLink>
      }
    >
      Live pages need the EventCore API. The Reliability Lab and the architecture sheet work without
      it. Locally, run <code>pnpm db:up</code> and <code>pnpm dev</code>.
      {reason ? <span className="mt-1 block font-mono text-xs text-ink-3">{reason}</span> : null}
    </Notice>
  )
}

export function ApiFailure({
  result,
}: {
  readonly result: Exclude<ApiResult<unknown>, { ok: true }>
}) {
  if (result.kind === 'unavailable') return <ApiUnavailable reason={result.reason} />
  return (
    <Notice tone="danger" title={result.problem.title}>
      {result.problem.detail}
      <span className="mt-1 block font-mono text-xs text-ink-3">
        {result.problem.code} · request {result.problem.requestId}
      </span>
    </Notice>
  )
}
