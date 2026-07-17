import { auth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import { notFound } from "next/navigation"
import { ReactFlowProvider } from "@xyflow/react"

import { getLiveblocks } from "@/lib/liveblocks"
import { getWorkflow, listWorkflowRuns } from "@/features/workflows/data"
import { Room } from "@/features/workflows/components/room"
import { WorkflowShell } from "@/features/workflows/components/workflow-shell"
import { WorkflowRunsProvider } from "@/features/workflows/components/workflow-runs-provider"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { orgId } = await auth()
  if (!orgId) notFound()

  const workflow = await getWorkflow(orgId, id)
  if (!workflow) notFound()

  const [runsToken, storedRuns] = await Promise.all([
    // A read-only token scoped to this workflow's run tag, so the client can
    // subscribe to its runs in realtime. Good for ~an hour of an open canvas.
    triggerAuth.createPublicToken({
      scopes: {
        read: {
          tags: [`workflow:${id}`],
        },
      },
      expirationTime: "1hr",
    }),
    listWorkflowRuns(orgId, id),
  ])

  // Upsert so an existing room also picks up the latest Postgres name. Rooms are
  // private by default under ID-token auth; grant write access to the owning org,
  // matching the `groupIds: [orgId]` issued by the auth endpoint.
  await getLiveblocks().upsertRoom(id, {
    update: {
      metadata: {
        title: workflow.name,
      },
    },
    create: {
      organizationId: orgId,
      defaultAccesses: [],
      groupsAccesses: {
        [orgId]: ["room:write"],
      },
      metadata: {
        title: workflow.name,
      },
    },
  })

  // Serialize dates for the client boundary; the provider rehydrates them.
  const initialRuns = storedRuns.map((run) => ({
    id: run.id,
    status: run.status,
    steps: run.steps,
    browserbaseSessionId: run.browserbaseSessionId,
    createdAt: run.createdAt,
    error: run.error,
  }))

  // The canvas and the sidebar's node palette live in separate components, so a
  // single ReactFlowProvider wraps both to give them one shared React Flow store.
  return (
    <Room roomId={id}>
      <ReactFlowProvider>
        <WorkflowRunsProvider
          workflowId={id}
          accessToken={runsToken}
          initialRuns={initialRuns}
        >
          <WorkflowShell workflowId={id} workflowName={workflow.name} />
        </WorkflowRunsProvider>
      </ReactFlowProvider>
    </Room>
  )
}
