import * as Sentry from "@sentry/nextjs"
import { tasks } from "@trigger.dev/sdk"

import type { runWorkflowTask } from "@/features/workflows/tasks/run-workflow"
import { getWorkflowById } from "@/features/workflows/data"

// Public webhook trigger for a workflow. Auth is the shared secret stored on
// the workflow row (x-webhook-secret header), not Clerk — so external systems
// can fire a run without a user session.
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

  const handle = await tasks.trigger<typeof runWorkflowTask>(
    "run-workflow",
    { workflowId: workflow.id, orgId: workflow.orgId },
    { tags: [`workflow:${workflow.id}`] }
  )

  Sentry.logger.info("Webhook triggered workflow run", {
    workflowId: id,
    orgId: workflow.orgId,
    runId: handle.id,
  })

  return Response.json({ runId: handle.id })
}
