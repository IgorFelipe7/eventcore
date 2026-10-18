import { type InputHTMLAttributes } from 'react'

export function Field({
  label,
  name,
  hint,
  error,
  className = '',
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  readonly label: string
  readonly name: string
  readonly hint?: string
  readonly error?: string | undefined
}) {
  const describedBy = `${name}-description`
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={name} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? describedBy : undefined}
        className="field font-mono text-sm"
        {...input}
      />
      {error || hint ? (
        <p id={describedBy} className={`text-xs ${error ? 'text-rejected' : 'text-ink-3'}`}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  )
}
