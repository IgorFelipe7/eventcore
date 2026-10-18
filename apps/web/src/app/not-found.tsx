import { Arrow, ButtonLink } from '@/components/button'
import { PageIntro } from '@/components/section-heading'
import { getI18n } from '@/i18n/server'

export default async function NotFound() {
  const { t } = await getI18n()
  return (
    <main id="main">
      <PageIntro mark={t.notFound.mark} title={t.notFound.title} lead={<p>{t.notFound.lead}</p>}>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/explore">
            {t.notFound.board} <Arrow />
          </ButtonLink>
          <ButtonLink href="/" variant="secondary">
            {t.notFound.home}
          </ButtonLink>
        </div>
      </PageIntro>
    </main>
  )
}
