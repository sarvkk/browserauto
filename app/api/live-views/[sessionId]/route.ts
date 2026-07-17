import * as Sentry from "@sentry/nextjs"
import { auth } from "@clerk/nextjs/server"

import { browserbase } from "@/lib/browserbase"
import {
  getAuthProfileByLoginSession,
  getWorkflowRunBySession,
} from "@/features/workflows/data"

// Proxies a Browserbase live-view URL so the browser can embed it. The debug
// endpoint needs the secret API key, so it can only happen server-side — the
// client never sees the key, only the resulting debuggerFullscreenUrl.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { sessionId } = await params

  Sentry.getIsolationScope().setAttributes({
    route: "GET /api/live-views/[sessionId]",
    userId,
    orgId,
    sessionId,
  })

  // Tenancy: workflow runs or auth-profile login/refresh sessions for this org.
  const [ownedRun, ownedProfile] = await Promise.all([
    getWorkflowRunBySession(orgId, sessionId),
    getAuthProfileByLoginSession(orgId, sessionId),
  ])
  if (!ownedRun && !ownedProfile) {
    Sentry.logger.warn("Live view denied — session not owned by org", {
      orgId,
      sessionId,
    })
    return new Response("Not found", { status: 404 })
  }

  const live = await browserbase.sessions.debug(sessionId)
  const url = live.debuggerFullscreenUrl

  Sentry.logger.info("Live view URL served", {
    sessionId,
    orgId,
    workflowId: ownedRun?.workflowId,
    runId: ownedRun?.id,
    authProfileId: ownedProfile?.id,
  })

  return Response.json(
    { url },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
