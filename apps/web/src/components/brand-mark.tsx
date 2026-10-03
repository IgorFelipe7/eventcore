export function BrandMark({ className = 'size-5' }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={className}>
      <rect x="1" y="1" width="8" height="8" fill="currentColor" />
      <rect x="11" y="1" width="8" height="8" fill="currentColor" />
      <rect x="1" y="11" width="8" height="8" fill="currentColor" />
      <rect
        x="11.75"
        y="11.75"
        width="6.5"
        height="6.5"
        fill="var(--color-signal)"
        stroke="var(--color-signal)"
        strokeWidth="1.5"
      />
    </svg>
  )
}
