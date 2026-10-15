import { type ReactNode } from 'react'
import { Reveal } from './reveal'

export const SHEET_REVISION = { letter: 'A', date: '2026-10-18' } as const
export const SHEET_COUNT = 6

export interface SheetIdentity {
  readonly number: number
  readonly title: string
}

const pad = (value: number) => String(value).padStart(2, '0')

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

export function ZoneRuler({ className = '' }: { readonly className?: string }) {
  return (
    <div aria-hidden className={`grid grid-cols-12 gap-x-4 md:gap-x-6 ${className}`}>
      {Array.from({ length: 12 }, (_, index) => (
        <span key={index} className="label border-l border-rule pl-1.5 pt-1 text-ink-3">
          {index + 1}
        </span>
      ))}
    </div>
  )
}

export function SheetBar({ sheet }: { readonly sheet: SheetIdentity }) {
  return (
    <div className="sheet-frame">
      <div className="flex items-center justify-between gap-4 border-b border-ink py-2.5">
        <p className="label text-ink">
          Sheet {pad(sheet.number)}
          <span className="text-ink-3"> / {pad(SHEET_COUNT)}</span>
          <span className="mx-2 text-rule">—</span>
          {sheet.title}
        </p>
        <p className="label hidden text-ink-3 sm:block">
          Rev {SHEET_REVISION.letter} · {SHEET_REVISION.date}
        </p>
      </div>
    </div>
  )
}

export function TitleBlock({ sheet }: { readonly sheet: SheetIdentity }) {
  const cells: { label: string; value: ReactNode; span: string }[] = [
    { label: 'Project', value: 'EventCore', span: 'col-span-6 md:col-span-3' },
    { label: 'Sheet title', value: sheet.title, span: 'col-span-6 md:col-span-3' },
    {
      label: 'Sheet',
      value: (
        <span className="tabular">
          {pad(sheet.number)} of {pad(SHEET_COUNT)}
        </span>
      ),
      span: 'col-span-3 md:col-span-1',
    },
    { label: 'Rev', value: SHEET_REVISION.letter, span: 'col-span-3 md:col-span-1' },
    { label: 'Date', value: SHEET_REVISION.date, span: 'col-span-6 md:col-span-2' },
    { label: 'Drawn by', value: 'Igor Felipe', span: 'col-span-6 md:col-span-2' },
  ]
  return (
    <section aria-label="Title block" className="sheet-frame mt-24 pb-10">
      <div className="relative grid grid-cols-12 border border-ink bg-sheet">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className={`${cell.span} border-b border-r border-rule px-3 py-2.5 last:border-r-0 md:border-b-0`}
          >
            <p className="label text-ink-3">{cell.label}</p>
            <p className="mt-1 font-mono text-sm text-ink">{cell.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function SectionHeading({
  mark,
  title,
  lead,
  id,
  stacked = false,
}: {
  readonly mark: string
  readonly title: ReactNode
  readonly lead?: ReactNode
  readonly id?: string
  readonly stacked?: boolean
}) {
  return (
    <header className="grid grid-cols-12 gap-x-4 gap-y-4 md:gap-x-6">
      <div className={stacked ? 'col-span-12' : 'col-span-12 md:col-span-3'}>
        <div className="h-px origin-left animate-draw bg-ink" />
        <p className="label mt-3 text-ink-3">{mark}</p>
      </div>
      <div className={stacked ? 'col-span-12' : 'col-span-12 md:col-span-9'}>
        <Reveal>
          <h2 id={id} className="text-heading text-ink">
            {title}
          </h2>
        </Reveal>
        {lead ? <div className="measure mt-5 text-lg text-ink-2">{lead}</div> : null}
      </div>
    </header>
  )
}

export function Accent({ children }: { readonly children: ReactNode }) {
  return (
    <span className="font-accent text-[1.06em] font-normal italic tracking-[-0.01em] text-signal">
      {children}
    </span>
  )
}

export function Figure({
  number,
  caption,
  kind,
  children,
  className = '',
}: {
  readonly number: string
  readonly caption: ReactNode
  readonly kind: 'illustrative' | 'measured' | 'schematic'
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <figure className={`relative border border-ink bg-sheet ${className}`}>
      <CropMarks />
      {children}
      <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-ink px-4 py-3">
        <span className="label text-ink">Fig. {number}</span>
        <span className="label rounded-[2px] border border-ink-3/50 px-1.5 py-0.5 text-ink-3">
          {kind}
        </span>
        <span className="text-sm text-ink-2">{caption}</span>
      </figcaption>
    </figure>
  )
}
