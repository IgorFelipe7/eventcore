import { Arrow, ButtonLink } from '@/components/button'
import { SheetBar, TitleBlock } from '@/components/sheet'

const sheet = { number: 0, title: 'Not found' }

export default function NotFound() {
  return (
    <main id="main">
      <SheetBar sheet={sheet} />
      <section className="sheet-frame py-24">
        <p className="label text-ink-3">404 · No sheet at this address</p>
        <h1 className="mt-4 max-w-3xl text-display">This drawing isn’t in the set.</h1>
        <p className="measure mt-6 text-lg text-ink-2">
          The page may have moved, or the event may still be a draft that only its organizers can
          see.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/explore">
            Open the event board <Arrow />
          </ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Back to Sheet 01
          </ButtonLink>
        </div>
      </section>
      <TitleBlock sheet={sheet} />
    </main>
  )
}
