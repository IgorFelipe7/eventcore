import { type Metadata } from 'next'
import { z } from 'zod'
import { ApiFailure } from '@/components/api-state'
import { Arrow } from '@/components/button'
import { CodeBlock } from '@/components/code-block'
import { SectionHeading, SheetBar, TitleBlock } from '@/components/sheet'
import { callApi } from '@/lib/api'
import { publicConfig } from '@/lib/public-config'

export const metadata: Metadata = {
  title: 'API reference',
  description: 'Endpoint index generated from the live OpenAPI 3.1 document of the EventCore API.',
}

const sheet = { number: 6, title: 'API reference' }

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
  GET: 'text-ink-2 border-ink-3/60',
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
  const result = await callApi('/openapi.json', { schema: OpenApiSchema })

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
      <SheetBar sheet={sheet} />
      <section className="sheet-frame mt-12 grid grid-cols-12 gap-x-4 gap-y-10 md:gap-x-6">
        <div className="col-span-12 lg:col-span-7">
          <SectionHeading
            mark="Sheet 06 · Contract"
            title="Generated from the same schemas that validate requests."
            lead={
              <p>
                The API publishes OpenAPI 3.1 built from its Zod contracts, so this index cannot
                drift from the code. Errors are RFC 9457 problem documents with a stable code and a
                retryable flag.
              </p>
            }
          />
        </div>
        <div className="col-span-12 grid content-start gap-3 lg:col-span-5">
          <CodeBlock code={EXAMPLE} language="http" title="One idempotent call" wrap />
          <a
            href={`${publicConfig.apiOrigin}/docs`}
            className="min-h-11 text-sm underline hover:text-signal"
          >
            Open the interactive Swagger UI <Arrow />
          </a>
        </div>
      </section>

      <section aria-label="Endpoints" className="sheet-frame mt-16">
        {!result.ok ? (
          <ApiFailure result={result} />
        ) : (
          <div className="grid gap-12">
            {tags.map((tag) => (
              <div key={tag}>
                <h2 className="label border-b border-ink pb-2 text-ink">{tag}</h2>
                <ul>
                  {operations
                    .filter((operation) => operation.tag === tag)
                    .map((operation) => (
                      <li
                        key={`${operation.method} ${operation.path}`}
                        className="grid grid-cols-12 items-center gap-x-4 gap-y-1 border-b border-rule py-3 md:gap-x-6"
                      >
                        <span
                          className={`col-span-3 w-fit rounded-[2px] border px-2 py-0.5 font-mono text-xs font-medium md:col-span-1 ${METHOD_TONE[operation.method] ?? ''}`}
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
                            <span className="label text-ink-3">bearer</span>
                          ) : null}
                          {operation.idempotent ? (
                            <span className="label text-signal">idempotent</span>
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
      <TitleBlock sheet={sheet} />
    </main>
  )
}
