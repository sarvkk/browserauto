import * as Sentry from "@sentry/nextjs"
import { tasks } from "@trigger.dev/sdk"

import type { runWorkflowTask } from "@/features/workflows/tasks/run-workflow"
import { getWorkflowById } from "@/features/workflows/data"

// Public webhook trigger for a workflow. Auth is the shared secret stored on
// the workflow row (x-webhook-secret header), not Clerk — so external systems
// can fire a run without a user session. JSON body is available as
// {{ trigger.body }} inside the workflow.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  Sentry.getIsolationScope().setAttributes({
    route: "POST /api/workflows/[id]/trigger",
    workflowId: id,
  })

  const workflow = await getWorkflowById(id)
  if (!workflow?.webhookSecret) {
    return new Response("Not found", { status: 404 })
  }

  const provided = request.headers.get("x-webhook-secret")
  if (!provided || provided !== workflow.webhookSecret) {
    Sentry.logger.warn("Webhook trigger denied — bad secret", {
      workflowId: id,
    })
    return new Response("Unauthorized", { status: 401 })
  }

  if (!workflow.graph) {
    return new Response("Workflow has no saved graph. Run it once first.", {
      status: 400,
    })
  }

  let body: unknown
  const contentType = request.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    try {
      body = await request.json()
    } catch {
      return new Response("Invalid JSON body", { status: 400 })
    }
  } else {
    const text = await request.text()
    if (text.trim()) {
      try {
        body = JSON.parse(text) as unknown
      } catch {
        body = text
      }
    }
  }

  const handle = await tasks.trigger<typeof runWorkflowTask>(
    "run-workflow",
    {
      workflowId: workflow.id,
      orgId: workflow.orgId,
      trigger: { source: "webhook", body },
    },
    { tags: [`workflow:${workflow.id}`] }
  )

  Sentry.logger.info("Webhook triggered workflow run", {
    workflowId: id,
    orgId: workflow.orgId,
    runId: handle.id,
  })

  return Response.json({ runId: handle.id })
}
