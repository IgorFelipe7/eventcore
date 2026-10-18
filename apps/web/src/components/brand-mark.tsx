export function BrandMark({ className = 'size-5' }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={className}>
      <rect x="1" y="1" width="8" height="8" rx="2.5" fill="currentColor" opacity="0.9" />
      <rect x="11" y="1" width="8" height="8" rx="2.5" fill="currentColor" opacity="0.9" />
      <rect x="1" y="11" width="8" height="8" rx="2.5" fill="currentColor" opacity="0.9" />
      <rect x="11" y="11" width="8" height="8" rx="2.5" fill="var(--color-signal)" />
      <rect
        x="11"
        y="11"
        width="8"
        height="8"
        rx="2.5"
        fill="var(--color-signal)"
        className="blur-[3px]"
        opacity="0.8"
      />
    </svg>
  )
}
