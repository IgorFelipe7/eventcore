'use client'

import { useEffect } from 'react'
import { Button } from '@/components/button'
import { useI18n } from '@/i18n/provider'

export default function ErrorSheet({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}) {
  const { t } = useI18n()

  useEffect(() => {
    document.title = t.meta.errorTitle
  }, [t])

  return (
    <main id="main" className="sheet-frame py-24">
      <p className="label text-rejected">{t.error.mark}</p>
      <h1 className="mt-4 max-w-3xl text-display">{t.error.title}</h1>
      <p className="measure mt-6 text-lg text-ink-2">
        {t.error.lead}
        {error.digest ? (
          <>
            {' '}
            {t.error.reference} <code className="tabular">{error.digest}</code>.
          </>
        ) : null}
      </p>
      <Button className="mt-10" onClick={reset}>
        {t.error.retry}
      </Button>
    </main>
  )
}
