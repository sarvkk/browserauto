import type { Stagehand } from "@browserbasehq/stagehand"

import { sleep } from "@/features/workflows/lib/self-heal"

export async function act({
  stagehand,
  instruction,
  retries = 0,
}: {
  stagehand: Stagehand
  instruction: string
  retries?: number
}) {
  let lastError: Error | undefined
  let healAttempts = 0

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // After a failure: observe candidates, then act on the best match.
      if (attempt > 0) {
        healAttempts++
        await sleep(500 * attempt)
        const actions = await stagehand.observe(instruction)
        if (actions[0]) {
          const result = await stagehand.act(actions[0])
          const page = stagehand.context.pages()[0]
          if (result.success) {
            return {
              success: true,
              message: result.message,
              url: page.url(),
              healed: true,
              healAttempts,
            }
          }
          lastError = new Error(result.message || "Act failed after observe")
          continue
        }
      }

      const result = await stagehand.act(instruction)
      const page = stagehand.context.pages()[0]

      if (!result.success) {
        lastError = new Error(result.message || "Act failed")
        if (attempt < retries) continue
        return {
          success: false,
          message: result.message,
          url: page.url(),
          healAttempts,
        }
      }

      return {
        success: true,
        message: result.message,
        url: page.url(),
        ...(healAttempts > 0 ? { healed: true, healAttempts } : {}),
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt >= retries) break
    }
  }

  throw lastError ?? new Error("Act failed")
}
