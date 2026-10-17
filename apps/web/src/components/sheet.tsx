import { type ReactNode } from 'react'
import { getI18n } from '@/i18n/server'
import { CropMarks } from './drawing-marks'
import { Reveal } from './reveal'

export { CropMarks, Dimension, Marked } from './drawing-marks'

export const SHEET_REVISION = { letter: 'C', date: '2026-10-20' } as const
export const SHEET_COUNT = 6

export interface SheetIdentity {
  readonly number: number
  readonly title: string
}

const pad = (value: number) => String(value).padStart(2, '0')

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

export async function SheetBar({ sheet }: { readonly sheet: SheetIdentity }) {
  const { t } = await getI18n()
  return (
    <div className="sheet-frame">
      <div className="flex items-center justify-between gap-4 border-b border-ink py-2.5">
        <p className="label text-ink">
          {t.common.sheet} {pad(sheet.number)}
          <span className="text-ink-3"> / {pad(SHEET_COUNT)}</span>
          <span className="mx-2 text-ink-3">·</span>
          {sheet.title}
        </p>
        <p className="label hidden text-ink-3 sm:block">
          {t.common.rev} {SHEET_REVISION.letter} · {SHEET_REVISION.date}
        </p>
      </div>
    </div>
  )
}

export async function TitleBlock({ sheet }: { readonly sheet: SheetIdentity }) {
  const { t } = await getI18n()
  const block = t.common.titleBlock
  const cells: { label: string; value: ReactNode; span: string }[] = [
    { label: block.project, value: 'EventCore', span: 'col-span-6 md:col-span-3' },
    { label: block.sheetTitle, value: sheet.title, span: 'col-span-6 md:col-span-3' },
    {
      label: block.sheet,
      value: (
        <span className="tabular">
          {pad(sheet.number)} {t.common.of} {pad(SHEET_COUNT)}
        </span>
      ),
      span: 'col-span-3 md:col-span-1',
    },
    { label: block.rev, value: SHEET_REVISION.letter, span: 'col-span-3 md:col-span-1' },
    { label: block.date, value: SHEET_REVISION.date, span: 'col-span-6 md:col-span-2' },
    { label: block.drawnBy, value: 'Igor Felipe', span: 'col-span-6 md:col-span-2' },
  ]
  return (
    <section aria-label={block.label} className="sheet-frame mt-24 pb-10">
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

export function SectionMarker({
  index,
  sheet,
}: {
  readonly index: string
  readonly sheet: string
}) {
  return (
    <span
      aria-hidden
      className="relative grid size-12 shrink-0 grid-rows-2 overflow-hidden rounded-full border border-ink font-mono text-[0.7rem] leading-none tabular"
    >
      <span className="grid place-items-end justify-center pb-1 font-medium text-ink">{index}</span>
      <span className="grid place-items-start justify-center border-t border-ink pt-1 text-ink-3">
        {sheet}
      </span>
    </span>
  )
}

export function SectionHeading({
  mark,
  title,
  lead,
  id,
  index,
  sheet = '01',
  stacked = false,
}: {
  readonly mark: string
  readonly title: ReactNode
  readonly lead?: ReactNode
  readonly id?: string
  readonly index?: string
  readonly sheet?: string
  readonly stacked?: boolean
}) {
  return (
    <header className="grid grid-cols-12 gap-x-4 gap-y-4 md:gap-x-6">
      <div className={stacked ? 'col-span-12' : 'col-span-12 md:col-span-3'}>
        <div className="flex items-center gap-3">
          {index ? <SectionMarker index={index} sheet={sheet} /> : null}
          <div className="min-w-0 flex-1">
            <div className="h-px origin-left animate-draw bg-ink" />
            <p className="label mt-3 text-ink-3">{mark}</p>
          </div>
        </div>
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

export async function Figure({
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
  const { t } = await getI18n()
  return (
    <figure className={`relative border border-ink bg-sheet ${className}`}>
      <CropMarks />
      {children}
      <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-ink px-4 py-3">
        <span className="label text-ink">
          {t.common.figure} {number}
        </span>
        <span className="label rounded-xs border border-ink-3/50 px-1.5 py-0.5 text-ink-3">
          {t.common.figureKinds[kind]}
        </span>
        <span className="text-sm text-ink-2">{caption}</span>
      </figcaption>
    </figure>
  )
}
