'use client'

import { Fragment, type ReactNode, useMemo } from 'react'
import { useI18n } from '@/i18n/provider'

const SQL_KEYWORDS = new Set(
  `SELECT FROM WHERE AND OR UPDATE SET INSERT INTO VALUES RETURNING ON CONFLICT CONSTRAINT DO NOTHING
   BEGIN COMMIT ROLLBACK ORDER BY LIMIT FOR NOT NULL IS CASE WHEN THEN END COUNT AS`.split(/\s+/),
)

const LOCK_PHRASES = ['FOR UPDATE SKIP LOCKED', 'FOR UPDATE']

const highlightSql = (line: string, prefix = 's'): ReactNode[] => {
  const lock = LOCK_PHRASES.find((phrase) => line.includes(phrase))
  if (lock) {
    const [before = '', after = ''] = line.split(lock)
    return [
      ...highlightSql(before, `${prefix}b`),
      <mark
        key={`${prefix}-lock`}
        className="rounded-md bg-signal-wash px-1 text-signal shadow-[0_0_0_1px_rgb(125_139_255/0.35)]"
      >
        {lock}
      </mark>,
      ...highlightSql(after, `${prefix}a`),
    ]
  }
  return line.split(/(\s+|[(),;=<>+*])/).map((token, index) =>
    SQL_KEYWORDS.has(token.toUpperCase()) && token === token.toUpperCase() ? (
      <span key={`${prefix}${index}`} className="font-medium text-ink">
        {token}
      </span>
    ) : token.startsWith('$') || /^\d+$/.test(token) ? (
      <span key={`${prefix}${index}`} className="text-signal">
        {token}
      </span>
    ) : token.startsWith("'") ? (
      <span key={`${prefix}${index}`} className="text-confirmed">
        {token}
      </span>
    ) : (
      <Fragment key={`${prefix}${index}`}>{token}</Fragment>
    ),
  )
}

export function CodeBlock({
  code,
  language,
  title,
  highlight = [],
  wrap = false,
}: {
  readonly code: string
  readonly language: 'sql' | 'shell' | 'http' | 'json'
  readonly title?: string
  readonly highlight?: readonly number[]
  readonly wrap?: boolean
}) {
  const { t } = useI18n()
  const lines = useMemo(
    () =>
      code
        .replace(/\n$/, '')
        .split('\n')
        .map((line) => (language === 'sql' ? highlightSql(line) : line)),
    [code, language],
  )
  return (
    <div className="surface min-w-0 overflow-clip">
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5">
          <span className="label text-ink-2">{title}</span>
          <span className="label rounded-full border border-rule px-2 py-0.5 text-ink-3">
            {language}
          </span>
        </div>
      ) : null}
      <pre
        tabIndex={wrap ? undefined : 0}
        aria-label={wrap ? undefined : t.common.scrollableCode(title ?? language)}
        className={`py-3.5 font-mono text-[0.8125rem] leading-6 text-ink-2 ${wrap ? 'whitespace-pre-wrap break-words' : 'overflow-x-auto'}`}
      >
        <code>
          {lines.map((line, index) => (
            <span
              key={index}
              data-line={index + 1}
              className={`relative grid grid-cols-[2.75rem_1fr] pr-4 transition-colors duration-500 ${highlight.includes(index + 1) ? 'bg-signal-wash before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-signal before:shadow-[0_0_12px_var(--color-signal)]' : ''}`}
            >
              <span aria-hidden className="select-none pr-3 text-right text-ink-3 tabular">
                {index + 1}
              </span>
              <span>
                {line}
                {'\n'}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
