'use client'

import { useEffect } from 'react'
import { Button } from '@/components/button'

export default function ErrorSheet({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}) {
  useEffect(() => {
    document.title = 'Something broke · EventCore'
  }, [])

  return (
    <main id="main" className="sheet-frame py-24">
      <p className="label text-rejected">Unexpected failure</p>
      <h1 className="mt-4 max-w-3xl text-display">This sheet failed to render.</h1>
      <p className="measure mt-6 text-lg text-ink-2">
        Nothing you submitted was lost: every command is idempotent, so trying again is safe.
        {error.digest ? (
          <>
            {' '}
            Reference <code className="tabular">{error.digest}</code>.
          </>
        ) : null}
      </p>
      <Button className="mt-10" onClick={reset}>
        Try again
      </Button>
    </main>
  )
}
