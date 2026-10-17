'use client'

import { type LabVariant } from '@eventcore/contracts'
import { useI18n } from '@/i18n/provider'

export function SeatOutcome({ variant }: { readonly variant: LabVariant }) {
  const { t } = useI18n()
  const { capacity, confirmedRows, waitlistedRows } = variant.final
  const overbooked = Math.max(0, confirmedRows - capacity)
  const cells = Math.max(capacity, confirmedRows)
  const size = cells > 60 ? 'size-3' : cells > 24 ? 'size-4' : 'size-6'

  return (
    <div>
      <div
        role="img"
        aria-label={t.lab.outcome.summary(confirmedRows, capacity, overbooked, waitlistedRows)}
        className="flex flex-wrap gap-[3px]"
      >
        {Array.from({ length: cells }, (_, index) => {
          const withinCapacity = index < capacity
          const taken = index < confirmedRows
          return (
            <span
              key={index}
              className={`${size} rounded-[1px] border ${
                !withinCapacity
                  ? 'border-rejected bg-rejected-wash [background-image:repeating-linear-gradient(135deg,var(--color-rejected)_0_1px,transparent_1px_4px)]'
                  : taken
                    ? 'border-ink bg-ink'
                    : 'border-ink-3/60'
              }`}
            />
          )
        })}
      </div>
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs tabular">
        <div className="flex items-center gap-2">
          <span aria-hidden className="size-3 rounded-[1px] bg-ink" />
          <dt className="text-ink-3">{t.lab.outcome.confirmed}</dt>
          <dd className="text-ink">{Math.min(confirmedRows, capacity)}</dd>
        </div>
        {overbooked > 0 ? (
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-3 rounded-[1px] border border-rejected bg-rejected-wash"
            />
            <dt className="text-rejected">{t.lab.outcome.overbooked}</dt>
            <dd className="font-medium text-rejected">{overbooked}</dd>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-3 rounded-[1px] border border-waitlisted bg-waitlisted-wash"
          />
          <dt className="text-ink-3">{t.lab.outcome.waitlisted}</dt>
          <dd className="text-ink">{waitlistedRows}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-ink-3">{t.lab.outcome.capacity}</dt>
          <dd className="text-ink">{capacity}</dd>
        </div>
      </dl>
    </div>
  )
}
