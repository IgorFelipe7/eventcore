import { Arrow, ButtonLink } from '@/components/button'
import { SheetBar, TitleBlock } from '@/components/sheet'
import { getI18n } from '@/i18n/server'

export default async function NotFound() {
  const { t } = await getI18n()
  const sheet = { number: 0, title: t.sheets.notFound }
  return (
    <main id="main">
      <SheetBar sheet={sheet} />
      <section className="sheet-frame py-24">
        <p className="label text-ink-3">{t.notFound.mark}</p>
        <h1 className="mt-4 max-w-3xl text-display">{t.notFound.title}</h1>
        <p className="measure mt-6 text-lg text-ink-2">{t.notFound.lead}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/explore">
            {t.notFound.board} <Arrow />
          </ButtonLink>
          <ButtonLink href="/" variant="secondary">
            {t.notFound.home}
          </ButtonLink>
        </div>
      </section>
      <TitleBlock sheet={sheet} />
    </main>
  )
}
