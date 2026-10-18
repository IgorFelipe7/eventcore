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
  const cell = size === 'lg' ? 'size-4 sm:size-5 rounded-[5px]' : 'size-2.5 rounded-[3px]'

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
                className={`${cell} border transition-colors duration-500 ${
                  taken
                    ? 'border-transparent bg-ink/80'
                    : last
                      ? 'border-signal bg-signal shadow-[0_0_14px_var(--color-signal)]'
                      : 'border-rule bg-transparent'
                }`}
              />
            )
          })}
        </div>
      ) : (
        <div
          role="img"
          aria-label={label ?? summary}
          className={`relative w-full overflow-clip rounded-full border border-rule ${size === 'lg' ? 'h-5' : 'h-2.5'}`}
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,var(--color-signal),var(--color-ink))]"
            style={{ width: capacity === 0 ? '0%' : `${(confirmed / capacity) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
