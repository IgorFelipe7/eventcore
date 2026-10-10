import { Fragment, type ReactNode } from 'react'

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
      <mark key={`${prefix}-lock`} className="bg-signal px-0.5 text-white">
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
  const lines = code.replace(/\n$/, '').split('\n')
  return (
    <div className="min-w-0 border border-ink bg-sheet">
      {title ? (
        <div className="flex items-center justify-between border-b border-rule px-3 py-2">
          <span className="label text-ink-3">{title}</span>
          <span className="label text-ink-3">{language}</span>
        </div>
      ) : null}
      <pre
        tabIndex={wrap ? undefined : 0}
        aria-label={wrap ? undefined : `${title ?? language} code, scrollable`}
        className={`py-3 font-mono text-[0.8125rem] leading-6 text-ink-2 ${wrap ? 'whitespace-pre-wrap break-words' : 'overflow-x-auto'}`}
      >
        <code>
          {lines.map((line, index) => (
            <span
              key={index}
              className={`grid grid-cols-[2.5rem_1fr] pr-4 ${highlight.includes(index + 1) ? 'bg-signal-wash' : ''}`}
            >
              <span aria-hidden className="select-none pr-3 text-right text-ink-3 tabular">
                {index + 1}
              </span>
              <span>
                {language === 'sql' ? highlightSql(line) : line}
                {'\n'}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
