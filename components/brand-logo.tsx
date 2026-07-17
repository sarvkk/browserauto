import { cn } from "@/lib/utils"

/** Favicon mark — browser window with teal live dot + red act block. */
export function BrandLogo({
  className,
  title = "Browserauto",
}: {
  className?: string
  title?: string
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={cn("size-8 shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect width="32" height="32" rx="8" fill="#0c1222" />
      <rect
        x="6"
        y="7"
        width="20"
        height="18"
        rx="2.5"
        stroke="#e6edf4"
        strokeWidth="2"
      />
      <path d="M6 12.5h20" stroke="#e6edf4" strokeWidth="2" />
      <circle cx="22.5" cy="9.75" r="1.75" fill="#2ec4a7" />
      <rect x="10" y="16.5" width="7" height="5" rx="1.25" fill="#e23b14" />
    </svg>
  )
}

export function BrandMark({
  className,
  wordmark = true,
}: {
  className?: string
  wordmark?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandLogo className="size-8" />
      {wordmark ? (
        <span className="font-display text-xl font-semibold tracking-tight">
          Browserauto
        </span>
      ) : null}
    </span>
  )
}
