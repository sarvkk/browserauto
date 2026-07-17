import type { Stagehand } from "@browserbasehq/stagehand"

import { createRunArtifact } from "@/features/workflows/data"

export async function screenshot({
  stagehand,
  runId,
  orgId,
}: {
  stagehand: Stagehand
  runId: string
  orgId: string
}) {
  const page = stagehand.context.pages()[0]
  const buffer = await page.screenshot({ type: "png" })
  const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)

  const artifact = await createRunArtifact({
    runId,
    orgId,
    contentType: "image/png",
    data,
  })

  return {
    artifactId: artifact.id,
    url: `/api/artifacts/${artifact.id}`,
  }
}
