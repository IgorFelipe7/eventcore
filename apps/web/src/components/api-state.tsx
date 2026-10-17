import { getI18n } from '@/i18n/server'
import { type ApiResult } from '@/lib/api'
import { Arrow, ButtonLink } from './button'
import { Notice } from './notice'

export async function ApiUnavailable({ reason }: { readonly reason?: string }) {
  const { t } = await getI18n()
  return (
    <Notice
      tone="waiting"
      title={t.api.unavailableTitle}
      action={
        <ButtonLink href="/lab" variant="secondary">
          {t.api.unavailableAction} <Arrow />
        </ButtonLink>
      }
    >
      {t.api.unavailableBody}
      {reason ? <span className="mt-1 block font-mono text-xs text-ink-3">{reason}</span> : null}
    </Notice>
  )
}

export async function ApiFailure({
  result,
}: {
  readonly result: Exclude<ApiResult<unknown>, { ok: true }>
}) {
  if (result.kind === 'unavailable') return <ApiUnavailable reason={result.reason} />
  const { locale, t } = await getI18n()
  const translated = t.api.problems[result.problem.code]
  return (
    <Notice tone="danger" title={translated ?? result.problem.title}>
      {locale === 'en' ? result.problem.detail : null}
      <span className="mt-1 block font-mono text-xs text-ink-3">
        {result.problem.code} · {t.common.request} {result.problem.requestId}
      </span>
    </Notice>
  )
}
