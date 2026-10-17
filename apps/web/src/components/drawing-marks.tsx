import { Fragment, type ReactNode } from 'react'

export function Dimension({
  children,
  note,
}: {
  readonly children: ReactNode
  readonly note?: string
}) {
  return (
    <span className="dimension">
      {children}
      <span aria-hidden className="dimension-line" />
      {note ? (
        <span aria-hidden className="dimension-note">
          {note}
        </span>
      ) : null}
    </span>
  )
}

export function Marked({ text, note }: { readonly text: string; readonly note?: string }) {
  return (
    <>
      {text.split(/\[([^\]]+)\]/).map((part, index) =>
        index % 2 === 1 ? (
          <Dimension key={index} note={note}>
            {part}
          </Dimension>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  )
}

export function CropMarks() {
  const corner = 'pointer-events-none absolute size-3 border-ink-3/60'
  return (
    <>
      <span aria-hidden className={`${corner} -left-px -top-px border-l border-t`} />
      <span aria-hidden className={`${corner} -right-px -top-px border-r border-t`} />
      <span aria-hidden className={`${corner} -bottom-px -left-px border-b border-l`} />
      <span aria-hidden className={`${corner} -bottom-px -right-px border-b border-r`} />
    </>
  )
}
