"use server"

import { randomBytes } from "node:crypto"
import * as Sentry from "@sentry/nextjs"
import { auth } from "@clerk/nextjs/server"
import { runs, schedules, tasks } from "@trigger.dev/sdk"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import type { runWorkflowTask } from "@/features/workflows/tasks/run-workflow"
import type { runWorkflowScheduledTask } from "@/features/workflows/tasks/run-workflow-scheduled"

import { getLiveblocks } from "@/lib/liveblocks"
import {
  createOrgSecret,
  createWorkflow,
  deleteOrgSecret,
  deleteWorkflow,
  getWorkflow,
  listOrgSecretNames,
  markWorkflowRunCanceled,
  renameWorkflow,
  saveWorkflowGraph,
  updateOrgSecret,
  updateWorkflowSchedule,
  updateWorkflowWebhookSecret,
} from "@/features/workflows/data"
import {
  WORKFLOW_TEMPLATES,
  type WorkflowTemplateId,
} from "@/features/workflows/templates"
import { WorkflowGraph } from "@/lib/db/schema"

const WORKFLOW_NAME_MAX_LENGTH = 80
const SECRET_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/

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
  // Sidebar lives in the dashboard layout (e.g. /home, /workflows/*).
  revalidatePath("/home", "layout")
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

export async function createWorkflowFromTemplateAction(
  templateId: WorkflowTemplateId
) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId)
  if (!template) {
    throw new Error("Unknown template")
  }

  Sentry.getIsolationScope().setAttributes({
    action: "createWorkflowFromTemplateAction",
    orgId,
    templateId,
  })

  const workflow = await createWorkflow(orgId, template.name, template.graph)

  Sentry.logger.info("Workflow created from template", {
    workflowId: workflow.id,
    orgId,
    templateId,
  })

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

  const existing = await getWorkflow(orgId, id)
  if (!existing) {
    throw new Error("Workflow not found")
  }

  // Best-effort: detach the Trigger schedule before deleting the row.
  if (existing.scheduleId) {
    try {
      await schedules.del(existing.scheduleId)
    } catch (error) {
      Sentry.logger.warn("Failed to delete Trigger schedule on workflow delete", {
        workflowId: id,
        scheduleId: existing.scheduleId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const workflow = await deleteWorkflow(orgId, id)

  if (!workflow) {
    Sentry.logger.warn("Workflow delete skipped — not found", {
      workflowId: id,
      orgId,
    })
    throw new Error("Workflow not found")
  }

  // The workflow id doubles as its Liveblocks room id — clean it up too.
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
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  Sentry.getIsolationScope().setAttributes({
    action: "runWorkflowAction",
    orgId,
    workflowId: id,
  })

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
  })

  return handle
}

export async function retryWorkflowRunAction(workflowId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")

  const workflow = await getWorkflow(orgId, workflowId)
  if (!workflow?.graph) {
    throw new Error("Workflow has no saved graph to retry.")
  }

  const handle = await tasks.trigger<typeof runWorkflowTask>(
    "run-workflow",
    { workflowId, orgId },
    { tags: [`workflow:${workflowId}`] }
  )

  Sentry.logger.info("Workflow run retried", {
    workflowId,
    orgId,
    runId: handle.id,
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

// ---------------------------------------------------------------------------
// Schedule + webhook triggers
// ---------------------------------------------------------------------------

export async function setWorkflowScheduleAction({
  id,
  cron,
  graph,
}: {
  id: string
  cron: string
  graph: WorkflowGraph
}) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")

  const trimmed = cron.trim()
  if (!trimmed) throw new Error("Cron expression is required.")

  // Persist the graph so scheduled runs have something to execute.
  await saveWorkflowGraph({ orgId, id, graph })

  const created = await schedules.create({
    task: "run-workflow-scheduled" satisfies typeof runWorkflowScheduledTask.id,
    cron: trimmed,
    externalId: id,
    deduplicationKey: `workflow:${id}`,
  })

  await updateWorkflowSchedule({
    orgId,
    id,
    scheduleId: created.id,
    scheduleCron: trimmed,
  })

  revalidatePath(`/workflows/${id}`)

  return { scheduleId: created.id, cron: trimmed }
}

export async function disableWorkflowScheduleAction(id: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")

  const workflow = await getWorkflow(orgId, id)
  if (!workflow) throw new Error("Workflow not found")

  if (workflow.scheduleId) {
    try {
      await schedules.del(workflow.scheduleId)
    } catch (error) {
      Sentry.logger.warn("Failed to delete Trigger schedule", {
        workflowId: id,
        scheduleId: workflow.scheduleId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  await updateWorkflowSchedule({
    orgId,
    id,
    scheduleId: null,
    scheduleCron: null,
  })

  revalidatePath(`/workflows/${id}`)
}

export async function setWebhookEnabledAction({
  id,
  enabled,
}: {
  id: string
  enabled: boolean
}) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")

  const workflow = await getWorkflow(orgId, id)
  if (!workflow) throw new Error("Workflow not found")

  const webhookSecret = enabled
    ? (workflow.webhookSecret ?? randomBytes(24).toString("hex"))
    : null

  await updateWorkflowWebhookSecret({ orgId, id, webhookSecret })

  revalidatePath(`/workflows/${id}`)

  return { webhookSecret }
}

// ---------------------------------------------------------------------------
// Secrets vault
// ---------------------------------------------------------------------------

export async function listSecretsAction() {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")
  return listOrgSecretNames(orgId)
}

export async function createSecretAction({
  name,
  value,
}: {
  name: string
  value: string
}) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")

  const normalized = name.trim().toUpperCase()
  if (!SECRET_NAME_PATTERN.test(normalized)) {
    throw new Error(
      "Secret names must be UPPER_SNAKE_CASE starting with a letter."
    )
  }
  if (!value) throw new Error("Secret value can't be empty.")

  const secret = await createOrgSecret({
    orgId,
    name: normalized,
    value,
  })

  revalidatePath("/secrets")
  return secret
}

export async function updateSecretAction({
  id,
  value,
}: {
  id: string
  value: string
}) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")
  if (!value) throw new Error("Secret value can't be empty.")

  const secret = await updateOrgSecret({ orgId, id, value })
  if (!secret) throw new Error("Secret not found")

  revalidatePath("/secrets")
  return secret
}

export async function deleteSecretAction(id: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")

  const secret = await deleteOrgSecret(orgId, id)
  if (!secret) throw new Error("Secret not found")

  revalidatePath("/secrets")
  return secret
}
