// Flow 로고 마크 — 체크(✓). 색은 currentColor를 따름.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <path
        d="M148 266 l72 74 l144 -158"
        fill="none"
        stroke="currentColor"
        strokeWidth="56"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
