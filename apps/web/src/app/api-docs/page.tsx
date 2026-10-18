import { type Metadata } from 'next'
import { z } from 'zod'
import { ApiFailure } from '@/components/api-state'
import { Arrow } from '@/components/button'
import { CodeBlock } from '@/components/code-block'
import { PageIntro } from '@/components/section-heading'
import { getI18n } from '@/i18n/server'
import { callApi } from '@/lib/api'
import { publicConfig } from '@/lib/public-config'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.sheets.api, description: t.apiDocs.metaDescription }
}

const OperationSchema = z.object({
  summary: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  security: z.array(z.record(z.string(), z.array(z.string()))).optional(),
  parameters: z.array(z.object({ name: z.string(), in: z.string() })).optional(),
})

const OpenApiSchema = z.object({
  info: z.object({ title: z.string(), version: z.string() }),
  paths: z.record(z.string(), z.record(z.string(), z.unknown())),
})

const METHODS = ['get', 'post', 'patch', 'put', 'delete'] as const

const METHOD_TONE: Record<string, string> = {
  GET: 'text-ink-2 border-rule',
  POST: 'text-signal border-signal',
  PATCH: 'text-waitlisted border-waitlisted',
}

const EXAMPLE = `POST /v1/events/{eventId}/registrations
Authorization: Bearer <token>
Idempotency-Key: 6f1c2e8a-6b3f-4b5e-9d84-6ad1f1b0e7a1
Content-Type: application/json

{ "source": "api" }

HTTP/1.1 201 Created
x-request-id: 4fbf8f17-e07b-47f5-a60c-2e53f411e4fb

{ "status": "WAITLISTED", "transition": "CREATED", "waitlistPosition": 1, ... }`

export default async function ApiDocsPage() {
  const [result, { t }] = await Promise.all([
    callApi('/openapi.json', { schema: OpenApiSchema }),
    getI18n(),
  ])

  const operations = result.ok
    ? Object.entries(result.data.paths).flatMap(([path, item]) =>
        METHODS.filter((method) => method in item).map((method) => {
          const operation = OperationSchema.safeParse(item[method])
          const data = operation.success ? operation.data : {}
          return {
            method: method.toUpperCase(),
            path,
            summary: data.summary ?? '',
            tag: data.tags?.[0] ?? 'other',
            authenticated: (data.security?.length ?? 0) > 0,
            idempotent:
              data.parameters?.some((parameter) => parameter.name === 'idempotency-key') ?? false,
          }
        }),
      )
    : []
  const tags = [...new Set(operations.map((operation) => operation.tag))]

  return (
    <main id="main">
      <PageIntro mark={t.apiDocs.mark} title={t.apiDocs.title} lead={<p>{t.apiDocs.lead}</p>} />
      <section className="sheet-frame">
        <div className="grid max-w-3xl gap-3">
          <CodeBlock code={EXAMPLE} language="http" title={t.apiDocs.example} wrap />
          <a
            href={`${publicConfig.apiOrigin}/docs`}
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-rule px-5 text-sm transition-colors hover:border-signal hover:text-signal"
          >
            {t.apiDocs.swagger} <Arrow />
          </a>
        </div>
      </section>

      <section aria-label={t.apiDocs.endpoints} className="sheet-frame mt-16">
        {!result.ok ? (
          <ApiFailure result={result} />
        ) : (
          <div className="grid gap-12">
            {tags.map((tag) => (
              <div key={tag}>
                <h2 className="eyebrow">{tag}</h2>
                <ul>
                  {operations
                    .filter((operation) => operation.tag === tag)
                    .map((operation) => (
                      <li
                        key={`${operation.method} ${operation.path}`}
                        className="grid grid-cols-12 items-center gap-x-4 gap-y-1 border-b border-rule py-3 md:gap-x-6"
                      >
                        <span
                          className={`col-span-3 w-fit rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium md:col-span-1 ${METHOD_TONE[operation.method] ?? ''}`}
                        >
                          {operation.method}
                        </span>
                        <code className="col-span-9 break-all text-[0.8125rem] text-ink md:col-span-5">
                          {operation.path}
                        </code>
                        <span className="col-span-12 text-sm text-ink-2 md:col-span-4">
                          {operation.summary}
                        </span>
                        <span className="col-span-12 flex gap-2 md:col-span-2 md:justify-end">
                          {operation.authenticated ? (
                            <span className="label text-ink-3">{t.apiDocs.bearer}</span>
                          ) : null}
                          {operation.idempotent ? (
                            <span className="label text-signal">{t.apiDocs.idempotent}</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
