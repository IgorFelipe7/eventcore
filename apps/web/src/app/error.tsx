'use client'

import { useEffect } from 'react'
import { Button } from '@/components/button'
import { PageIntro } from '@/components/section-heading'
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
    <main id="main">
      <PageIntro
        mark={t.error.mark}
        title={t.error.title}
        lead={
          <p>
            {t.error.lead}
            {error.digest ? (
              <>
                {' '}
                {t.error.reference} <code className="tabular">{error.digest}</code>.
              </>
            ) : null}
          </p>
        }
      >
        <Button className="mt-10" onClick={reset}>
          {t.error.retry}
        </Button>
      </PageIntro>
    </main>
  )
}
