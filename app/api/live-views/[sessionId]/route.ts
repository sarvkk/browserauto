import * as Sentry from "@sentry/nextjs"
import { auth } from "@clerk/nextjs/server"

import { browserbase } from "@/lib/browserbase"
import { getWorkflowRunBySession } from "@/features/workflows/data"

// Proxies a Browserbase live-view URL so the browser can embed it. The debug
// endpoint needs the secret API key, so it can only happen server-side — the
// client never sees the key, only the resulting debuggerFullscreenUrl.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { userId, orgId, has } = await auth()
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

  // Live view is a Pro feature (same as session replay). Gate it here so a
  // non-pro org can't pull a debug URL by calling the route directly.
  if (!has({ plan: "pro" })) {
    Sentry.logger.warn("Live view denied — Pro plan required", {
      orgId,
      sessionId,
    })
    return new Response("Pro plan required", { status: 403 })
  }

  // Tenancy: only serve live views for sessions this org actually ran.
  const ownedRun = await getWorkflowRunBySession(orgId, sessionId)
  if (!ownedRun) {
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
    workflowId: ownedRun.workflowId,
    runId: ownedRun.id,
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
