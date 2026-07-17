"use server"

import { randomBytes } from "node:crypto"
import * as Sentry from "@sentry/nextjs"
import { auth } from "@clerk/nextjs/server"
import { runs, schedules, tasks } from "@trigger.dev/sdk"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import type { runWorkflowTask } from "@/features/workflows/tasks/run-workflow"
import type { runWorkflowScheduledTask } from "@/features/workflows/tasks/run-workflow-scheduled"
import type { RunTrigger } from "@/features/workflows/lib/trigger-payload"

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
  updateWorkflowAuthProfile,
  updateWorkflowSchedule,
  updateWorkflowWebhookSecret,
  createAuthProfile,
  deleteAuthProfile,
  getAuthProfile,
  listAuthProfiles,
  setAuthProfileLoginSession,
} from "@/features/workflows/data"
import {
  createAuthLoginSession,
  createBrowserbaseContext,
  deleteBrowserbaseContext,
  releaseBrowserbaseSession,
} from "@/lib/auth-profiles"
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

function parseManualTriggerBody(raw: string | undefined): unknown {
  const trimmed = raw?.trim()
  if (!trimmed) return undefined
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    throw new Error("Run input must be valid JSON.")
  }
}

export async function runWorkflowAction({
  id,
  graph,
  triggerBody,
  authProfileId,
}: {
  id: string
  graph: WorkflowGraph
  // Optional JSON string from the Run panel → {{ trigger.body }}
  triggerBody?: string
  // Manual override. Omit to use the workflow default; null = none for this run.
  authProfileId?: string | null
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

  if (authProfileId) {
    const profile = await getAuthProfile(orgId, authProfileId)
    if (!profile) throw new Error("Auth profile not found")
  }

  const trigger: RunTrigger = {
    source: "manual",
    body: parseManualTriggerBody(triggerBody),
  }

  const handle = await tasks.trigger<typeof runWorkflowTask>(
    "run-workflow",
    { workflowId: id, orgId, trigger, authProfileId },
    { tags: [`workflow:${id}`] }
  )

  Sentry.logger.info("Workflow run triggered", {
    workflowId: id,
    orgId,
    runId: handle.id,
    nodeCount: graph.nodes.length,
    authProfileId: authProfileId ?? "workflow-default",
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
    {
      workflowId,
      orgId,
      trigger: { source: "manual" },
    },
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

// ---------------------------------------------------------------------------
// Auth profiles
// ---------------------------------------------------------------------------

export async function listAuthProfilesAction() {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")
  return listAuthProfiles(orgId)
}

export async function createAuthProfileAction({ name }: { name: string }) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")

  const trimmed = name.trim()
  if (!trimmed) throw new Error("Profile name can't be empty.")
  if (trimmed.length > 80) {
    throw new Error("Profile name must be 80 characters or fewer.")
  }

  const existing = await listAuthProfiles(orgId)
  if (existing.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error("A profile with that name already exists.")
  }

  const context = await createBrowserbaseContext()
  try {
    const profile = await createAuthProfile({
      orgId,
      name: trimmed,
      browserbaseContextId: context.id,
    })
    revalidatePath("/auth-profiles")
    return profile
  } catch (error) {
    await deleteBrowserbaseContext(context.id).catch(() => undefined)
    throw error
  }
}

export async function startAuthProfileLoginAction(id: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")

  const profile = await getAuthProfile(orgId, id)
  if (!profile) throw new Error("Auth profile not found")

  if (profile.activeLoginSessionId) {
    await releaseBrowserbaseSession(profile.activeLoginSessionId)
  }

  const session = await createAuthLoginSession(profile.browserbaseContextId)
  await setAuthProfileLoginSession({
    orgId,
    id,
    activeLoginSessionId: session.id,
  })

  return { sessionId: session.id, profileId: id }
}

export async function finishAuthProfileLoginAction(id: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")

  const profile = await getAuthProfile(orgId, id)
  if (!profile) throw new Error("Auth profile not found")

  if (profile.activeLoginSessionId) {
    await releaseBrowserbaseSession(profile.activeLoginSessionId)
  }

  const updated = await setAuthProfileLoginSession({
    orgId,
    id,
    activeLoginSessionId: null,
    markAuthenticated: true,
  })

  // Give Browserbase a moment to persist the context before the next run.
  revalidatePath("/auth-profiles")
  return updated
}

export async function cancelAuthProfileLoginAction(id: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")

  const profile = await getAuthProfile(orgId, id)
  if (!profile) throw new Error("Auth profile not found")

  if (profile.activeLoginSessionId) {
    await releaseBrowserbaseSession(profile.activeLoginSessionId)
  }

  await setAuthProfileLoginSession({
    orgId,
    id,
    activeLoginSessionId: null,
  })

  revalidatePath("/auth-profiles")
}

export async function deleteAuthProfileAction(id: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")

  const profile = await getAuthProfile(orgId, id)
  if (!profile) throw new Error("Auth profile not found")

  if (profile.activeLoginSessionId) {
    await releaseBrowserbaseSession(profile.activeLoginSessionId)
  }

  const deleted = await deleteAuthProfile(orgId, id)
  if (!deleted) throw new Error("Auth profile not found")

  await deleteBrowserbaseContext(profile.browserbaseContextId).catch(() => undefined)

  revalidatePath("/auth-profiles")
  return deleted
}

export async function setWorkflowAuthProfileAction({
  id,
  authProfileId,
}: {
  id: string
  authProfileId: string | null
}) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")

  if (authProfileId) {
    const profile = await getAuthProfile(orgId, authProfileId)
    if (!profile) throw new Error("Auth profile not found")
  }

  const workflow = await updateWorkflowAuthProfile({
    orgId,
    id,
    authProfileId,
  })
  if (!workflow) throw new Error("Workflow not found")

  revalidatePath(`/workflows/${id}`)
  return { authProfileId: workflow.authProfileId }
}
