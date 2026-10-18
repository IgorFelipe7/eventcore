import { Fragment } from 'react'

interface Token {
  readonly text: string
  readonly keyword: boolean
  readonly space: boolean
  readonly order: number
}

const tokenize = (text: string): Token[] => {
  const pieces = text
    .split(/(\[[^\]]+\])/)
    .filter(Boolean)
    .flatMap((part) =>
      part.startsWith('[')
        ? [{ text: part.slice(1, -1), keyword: true }]
        : part
            .split(/(\s+)/)
            .filter(Boolean)
            .map((piece) => ({ text: piece, keyword: false })),
    )
  return pieces.map((piece, position) => {
    const space = /^\s+$/.test(piece.text)
    const order = pieces.slice(0, position + 1).filter((entry) => !/^\s+$/.test(entry.text)).length
    return { ...piece, space, order }
  })
}

export function Marked({ text }: { readonly text: string }) {
  return (
    <>
      {tokenize(text).map((token, position) =>
        token.space ? (
          <Fragment key={position}> </Fragment>
        ) : (
          <span
            key={position}
            className={token.keyword ? 'word keyword' : 'word'}
            style={{ ['--i' as string]: token.order }}
          >
            {token.text}
          </span>
        ),
      )}
    </>
  )
}

export function Keyword({ children }: { readonly children: React.ReactNode }) {
  return <span className="keyword">{children}</span>
}
