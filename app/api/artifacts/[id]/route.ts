import { auth } from "@clerk/nextjs/server"

import { getRunArtifact } from "@/features/workflows/data"

// Serves a run artifact (e.g. screenshot) to an authenticated org member.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { id } = await params
  const artifact = await getRunArtifact(orgId, id)
  if (!artifact) {
    return new Response("Not found", { status: 404 })
  }

  return new Response(new Uint8Array(artifact.data), {
    status: 200,
    headers: {
      "Content-Type": artifact.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  })
}
