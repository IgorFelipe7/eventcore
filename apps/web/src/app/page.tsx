import { SheetBar, TitleBlock } from '@/components/sheet'

const sheet = { number: 1, title: 'The last seat' }

export default function LandingPage() {
  return (
    <main id="main">
      <SheetBar sheet={sheet} />
      <TitleBlock sheet={sheet} />
    </main>
  )
}
