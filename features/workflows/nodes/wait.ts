import { wait } from "@trigger.dev/sdk"

export async function waitSeconds({ seconds }: { seconds: string }) {
  const n = Number(seconds)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid wait seconds: ${seconds}`)
  }
  // Cap at 1 hour so a typo can't park a run forever.
  const capped = Math.min(Math.floor(n), 3600)
  if (capped > 0) {
    await wait.for({ seconds: capped })
  }
  return { seconds: capped }
}
