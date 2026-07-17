"use server"

import * as Sentry from "@sentry/nextjs"
import { auth } from "@clerk/nextjs/server"
import { runs, tasks } from "@trigger.dev/sdk"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import type { runWorkflowTask } from "@/features/workflows/tasks/run-workflow"

import { getLiveblocks } from "@/lib/liveblocks"
import {
  createWorkflow,
  deleteWorkflow,
  markWorkflowRunCanceled,
  renameWorkflow,
  saveWorkflowGraph,
} from "@/features/workflows/data"
import { WorkflowGraph } from "@/lib/db/schema"

const WORKFLOW_NAME_MAX_LENGTH = 80

function normalizeWorkflowName(name: string) {
  const trimmed = name.trim()

  if (!trimmed) {
    throw new Error("Workflow name can't be empty.")
  }

  if (trimmed.length > WORKFLOW_NAME_MAX_LENGTH) {
    throw new Error(
      `Workflow name must be ${WORKFLOW_NAME_MAX_LENGTH} characters or fewer.`
    )
  }

  return trimmed
}

function revalidateWorkflowLayout() {
  // The sidebar lives under the dashboard layout at `/`, not `/workflows`.
  revalidatePath("/", "layout")
}

export async function createWorkflowAction(name: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  Sentry.getIsolationScope().setAttributes({ action: "createWorkflowAction", orgId })

  const workflow = await createWorkflow(orgId, normalizeWorkflowName(name))

  Sentry.logger.info("Workflow created", { workflowId: workflow.id, orgId })

  revalidateWorkflowLayout()
  redirect(`/workflows/${workflow.id}`)
}

export async function renameWorkflowAction(id: string, name: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  const normalizedName = normalizeWorkflowName(name)

  Sentry.getIsolationScope().setAttributes({
    action: "renameWorkflowAction",
    orgId,
    workflowId: id,
  })

  const workflow = await renameWorkflow({
    orgId,
    id,
    name: normalizedName,
  })

  if (!workflow) {
    Sentry.logger.warn("Workflow rename skipped — not found", {
      workflowId: id,
      orgId,
    })
    throw new Error("Workflow not found")
  }

  // Keep room metadata in sync when the room already exists. Creating the room
  // is still owned by the workflow page on open.
  try {
    await getLiveblocks().updateRoom(id, {
      metadata: { title: normalizedName },
    })
  } catch (error) {
    Sentry.logger.warn("Liveblocks room title update failed after rename", {
      workflowId: id,
      orgId,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  Sentry.logger.info("Workflow renamed", {
    workflowId: id,
    orgId,
    name: normalizedName,
  })

  revalidateWorkflowLayout()

  return workflow
}

export async function deleteWorkflowAction(id: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  Sentry.getIsolationScope().setAttributes({
    action: "deleteWorkflowAction",
    orgId,
    workflowId: id,
  })

  const workflow = await deleteWorkflow(orgId, id)

  if (!workflow) {
    Sentry.logger.warn("Workflow delete skipped — not found", {
      workflowId: id,
      orgId,
    })
    throw new Error("Workflow not found")
  }

  // The workflow id doubles as its Liveblocks room id — clean it up too.
  // Best-effort: the DB row is already gone, so don't fail the user-facing
  // delete if room cleanup fails.
  try {
    await getLiveblocks().deleteRoom(id)
  } catch (error) {
    Sentry.logger.warn("Liveblocks room cleanup failed after workflow delete", {
      workflowId: id,
      orgId,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  Sentry.logger.info("Workflow deleted", { workflowId: id, orgId })

  revalidateWorkflowLayout()

  return { id }
}

export async function runWorkflowAction({
  id,
  graph,
}: {
  id: string
  graph: WorkflowGraph
}) {
  const { orgId, has } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  // The Agent node is Pro-only. Enforce it here rather than in the run task: the
  // action holds the Clerk session (and has()), while the Trigger.dev task runs
  // with no auth context. has() evaluates the active org, confirmed above.
  Sentry.getIsolationScope().setAttributes({
    action: "runWorkflowAction",
    orgId,
    workflowId: id,
  })

  const hasAgentNode = graph.nodes.some((node) => node.data.type === "agent")
  if (hasAgentNode && !has({ plan: "pro" })) {
    Sentry.logger.warn("Workflow run denied — Agent node requires Pro plan", {
      workflowId: id,
      orgId,
    })
    throw new Error("The Agent node requires the Pro plan.")
  }

  try {
    await saveWorkflowGraph({ orgId, id, graph })
  } catch (error) {
    Sentry.logger.warn("Workflow run blocked — graph validation failed", {
      workflowId: id,
      orgId,
    })
    throw error
  }

  const handle = await tasks.trigger<typeof runWorkflowTask>(
    "run-workflow",
    { workflowId: id, orgId },
    { tags: [`workflow:${id}`] }
  )

  Sentry.logger.info("Workflow run triggered", {
    workflowId: id,
    orgId,
    runId: handle.id,
    nodeCount: graph.nodes.length,
    hasAgentNode,
  })

  return handle
}

export async function cancelWorkflowRunAction(runId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")

  Sentry.getIsolationScope().setAttributes({
    action: "cancelWorkflowRunAction",
    orgId,
    runId,
  })

  await runs.cancel(runId)

  // Best-effort durable status so history doesn't stay stuck on EXECUTING.
  try {
    await markWorkflowRunCanceled(orgId, runId)
  } catch (error) {
    Sentry.logger.warn("Failed to mark workflow run canceled in DB", {
      runId,
      orgId,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  Sentry.logger.info("Workflow run cancelled", { runId, orgId })
}
