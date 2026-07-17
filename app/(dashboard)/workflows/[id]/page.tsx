import { auth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import { notFound } from "next/navigation"
import { ReactFlowProvider } from "@xyflow/react"

import { getLiveblocks } from "@/lib/liveblocks"
import {
  getWorkflow,
  listAuthProfiles,
  listWorkflowRuns,
} from "@/features/workflows/data"
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

  const [runsToken, storedRuns, authProfiles] = await Promise.all([
    triggerAuth.createPublicToken({
      scopes: {
        read: {
          tags: [`workflow:${id}`],
        },
      },
      expirationTime: "1hr",
    }),
    listWorkflowRuns(orgId, id),
    listAuthProfiles(orgId),
  ])

  const room = await getLiveblocks().upsertRoom(id, {
    update: {
      metadata: { title: workflow.name },
    },
    create: {
      defaultAccesses: [],
      metadata: { title: workflow.name },
    },
  })

  if (room.organizationId !== "default") {
    await getLiveblocks().deleteRoom(id)
    await getLiveblocks().createRoom(id, {
      defaultAccesses: [],
      metadata: { title: workflow.name },
    })
  }

  const initialRuns = storedRuns.map((run) => ({
    id: run.id,
    status: run.status,
    steps: run.steps,
    browserbaseSessionId: run.browserbaseSessionId,
    createdAt: run.createdAt,
    error: run.error,
  }))

  return (
    <Room roomId={id}>
      <ReactFlowProvider>
        <WorkflowRunsProvider
          workflowId={id}
          accessToken={runsToken}
          initialRuns={initialRuns}
        >
          <WorkflowShell
            workflowId={id}
            workflowName={workflow.name}
            initialGraph={workflow.graph}
            scheduleCron={workflow.scheduleCron}
            webhookSecret={workflow.webhookSecret}
            authProfileId={workflow.authProfileId}
            authProfiles={authProfiles.map((p) => ({
              id: p.id,
              name: p.name,
            }))}
          />
        </WorkflowRunsProvider>
      </ReactFlowProvider>
    </Room>
  )
}
