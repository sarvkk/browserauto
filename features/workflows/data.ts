import { and, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  WorkflowGraph,
  workflowRuns,
  workflows,
  type WorkflowRunInsert,
  type WorkflowRunRecord,
} from "@/lib/db/schema"
import type {
  RunStep,
  WorkflowRunStatus,
} from "@/features/workflows/lib/run-types"
import { validateGraph } from "@/features/workflows/lib/validate-graph"

const WORKFLOW_RUN_HISTORY_LIMIT = 50

export async function saveWorkflowGraph({
  orgId,
  id,
  graph,
}: {
  orgId: string
  id: string
  graph: WorkflowGraph
}) {
  const problems = validateGraph(graph)
  if (problems.length > 0) throw new Error(problems.join(" "))
  await db
    .update(workflows)
    .set({ graph, updatedAt: new Date() })
    .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)))
}

export function listWorkflows(orgId: string) {
  return db
    .select()
    .from(workflows)
    .where(eq(workflows.orgId, orgId))
    .orderBy(desc(workflows.createdAt))
}

export async function getWorkflow(orgId: string, id: string) {
  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)))

  return workflow
}

export async function createWorkflow(orgId: string, name: string) {
  const [workflow] = await db
    .insert(workflows)
    .values({ orgId, name })
    .returning()

  return workflow
}

export async function renameWorkflow({
  orgId,
  id,
  name,
}: {
  orgId: string
  id: string
  name: string
}) {
  const [workflow] = await db
    .update(workflows)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)))
    .returning()

  return workflow
}

export async function deleteWorkflow(orgId: string, id: string) {
  const [workflow] = await db
    .delete(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)))
    .returning()

  return workflow
}

export function listWorkflowRuns(orgId: string, workflowId: string) {
  return db
    .select()
    .from(workflowRuns)
    .where(
      and(
        eq(workflowRuns.orgId, orgId),
        eq(workflowRuns.workflowId, workflowId)
      )
    )
    .orderBy(desc(workflowRuns.createdAt))
    .limit(WORKFLOW_RUN_HISTORY_LIMIT)
}

export async function getWorkflowRunBySession(
  orgId: string,
  browserbaseSessionId: string
) {
  const [run] = await db
    .select()
    .from(workflowRuns)
    .where(
      and(
        eq(workflowRuns.orgId, orgId),
        eq(workflowRuns.browserbaseSessionId, browserbaseSessionId)
      )
    )
    .limit(1)

  return run
}

export async function upsertWorkflowRun({
  id,
  workflowId,
  orgId,
  status,
  steps,
  browserbaseSessionId,
  error,
}: {
  id: string
  workflowId: string
  orgId: string
  status: WorkflowRunStatus
  steps: RunStep[]
  browserbaseSessionId?: string | null
  error?: string | null
}): Promise<WorkflowRunRecord> {
  const now = new Date()
  const values: WorkflowRunInsert = {
    id,
    workflowId,
    orgId,
    status,
    steps,
    browserbaseSessionId: browserbaseSessionId ?? null,
    error: error ?? null,
    updatedAt: now,
  }

  const [run] = await db
    .insert(workflowRuns)
    .values(values)
    .onConflictDoUpdate({
      target: workflowRuns.id,
      set: {
        status,
        steps,
        browserbaseSessionId: browserbaseSessionId ?? null,
        error: error ?? null,
        updatedAt: now,
      },
    })
    .returning()

  return run
}

export async function finalizeWorkflowRun({
  id,
  workflowId,
  orgId,
  status,
  steps,
  browserbaseSessionId,
  error,
}: {
  id: string
  workflowId: string
  orgId: string
  status: Extract<WorkflowRunStatus, "COMPLETED" | "FAILED" | "CANCELED">
  steps: RunStep[]
  browserbaseSessionId?: string | null
  error?: string | null
}): Promise<WorkflowRunRecord> {
  const now = new Date()

  const [run] = await db
    .insert(workflowRuns)
    .values({
      id,
      workflowId,
      orgId,
      status,
      steps,
      browserbaseSessionId: browserbaseSessionId ?? null,
      error: error ?? null,
      updatedAt: now,
      finishedAt: now,
    })
    .onConflictDoUpdate({
      target: workflowRuns.id,
      set: {
        status,
        steps,
        browserbaseSessionId: browserbaseSessionId ?? null,
        error: error ?? null,
        updatedAt: now,
        finishedAt: now,
      },
    })
    .returning()

  return run
}

export async function markWorkflowRunCanceled(orgId: string, runId: string) {
  const now = new Date()
  const [run] = await db
    .update(workflowRuns)
    .set({
      status: "CANCELED",
      updatedAt: now,
      finishedAt: now,
    })
    .where(and(eq(workflowRuns.id, runId), eq(workflowRuns.orgId, orgId)))
    .returning()

  return run
}
