// Self-heal: retry flaky act/extract with observe → retry when configured.

export function parseRetries(text: string | undefined): number {
  const n = Number.parseInt((text ?? "0").trim(), 10)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, 3)
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
