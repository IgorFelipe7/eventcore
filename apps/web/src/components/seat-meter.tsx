'use client'

import { type Inventory } from '@eventcore/contracts'
import { useI18n } from '@/i18n/provider'

const CELL_LIMIT = 60

export function SeatMeter({
  inventory,
  size = 'sm',
  label,
}: {
  readonly inventory: Inventory
  readonly size?: 'sm' | 'lg'
  readonly label?: string
}) {
  const { t } = useI18n()
  const { capacity, confirmed, available, waitlisted } = inventory
  const summary = t.meter.summary(confirmed, capacity, available, waitlisted)
  const cell = size === 'lg' ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-2.5 w-2.5'

  return (
    <div className="min-w-0">
      {capacity > 0 && capacity <= CELL_LIMIT ? (
        <div role="img" aria-label={label ?? summary} className="flex flex-wrap gap-[3px]">
          {Array.from({ length: capacity }, (_, index) => {
            const taken = index < confirmed
            const last = available === 1 && index === confirmed
            return (
              <span
                key={index}
                className={`${cell} rounded-[1px] border ${
                  taken
                    ? 'border-ink bg-ink'
                    : last
                      ? 'border-signal bg-signal'
                      : 'border-ink-3/60 bg-transparent'
                }`}
              />
            )
          })}
        </div>
      ) : (
        <div
          role="img"
          aria-label={label ?? summary}
          className={`relative w-full overflow-hidden rounded-[1px] border border-ink-3/60 ${size === 'lg' ? 'h-5' : 'h-2.5'}`}
        >
          <span
            className="absolute inset-y-0 left-0 bg-ink"
            style={{ width: capacity === 0 ? '0%' : `${(confirmed / capacity) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
