import { and, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  WorkflowGraph,
  authProfiles,
  orgSecrets,
  runArtifacts,
  workflowRuns,
  workflows,
  type AuthProfile,
  type OrgSecret,
  type RunArtifact,
  type Workflow,
  type WorkflowRunInsert,
  type WorkflowRunRecord,
} from "@/lib/db/schema"
import type {
  RunStep,
  WorkflowRunStatus,
} from "@/features/workflows/lib/run-types"
import { validateGraph } from "@/features/workflows/lib/validate-graph"
import { decryptSecret, encryptSecret } from "@/lib/crypto"

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

// Lookup by id alone — used by scheduled/webhook triggers that already trust
// the external schedule or shared secret.
export async function getWorkflowById(id: string) {
  const [workflow] = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, id))

  return workflow
}

export async function createWorkflow(
  orgId: string,
  name: string,
  graph?: WorkflowGraph | null
) {
  const [workflow] = await db
    .insert(workflows)
    .values({ orgId, name, graph: graph ?? null })
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

export async function updateWorkflowSchedule({
  orgId,
  id,
  scheduleId,
  scheduleCron,
}: {
  orgId: string
  id: string
  scheduleId: string | null
  scheduleCron: string | null
}): Promise<Workflow | undefined> {
  const [workflow] = await db
    .update(workflows)
    .set({
      scheduleId,
      scheduleCron,
      updatedAt: new Date(),
    })
    .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)))
    .returning()

  return workflow
}

export async function updateWorkflowWebhookSecret({
  orgId,
  id,
  webhookSecret,
}: {
  orgId: string
  id: string
  webhookSecret: string | null
}): Promise<Workflow | undefined> {
  const [workflow] = await db
    .update(workflows)
    .set({ webhookSecret, updatedAt: new Date() })
    .where(and(eq(workflows.id, id), eq(workflows.orgId, orgId)))
    .returning()

  return workflow
}

export async function updateWorkflowAuthProfile({
  orgId,
  id,
  authProfileId,
}: {
  orgId: string
  id: string
  authProfileId: string | null
}): Promise<Workflow | undefined> {
  const [workflow] = await db
    .update(workflows)
    .set({ authProfileId, updatedAt: new Date() })
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

export async function getWorkflowRun(orgId: string, runId: string) {
  const [run] = await db
    .select()
    .from(workflowRuns)
    .where(and(eq(workflowRuns.id, runId), eq(workflowRuns.orgId, orgId)))

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

// ---------------------------------------------------------------------------
// Org secrets — list returns names only; values stay encrypted until run time.
// ---------------------------------------------------------------------------

export async function listOrgSecretNames(orgId: string) {
  return db
    .select({
      id: orgSecrets.id,
      name: orgSecrets.name,
      createdAt: orgSecrets.createdAt,
      updatedAt: orgSecrets.updatedAt,
    })
    .from(orgSecrets)
    .where(eq(orgSecrets.orgId, orgId))
    .orderBy(orgSecrets.name)
}

export async function createOrgSecret({
  orgId,
  name,
  value,
}: {
  orgId: string
  name: string
  value: string
}): Promise<Pick<OrgSecret, "id" | "name" | "createdAt" | "updatedAt">> {
  const [secret] = await db
    .insert(orgSecrets)
    .values({
      orgId,
      name,
      encryptedValue: encryptSecret(value),
    })
    .returning({
      id: orgSecrets.id,
      name: orgSecrets.name,
      createdAt: orgSecrets.createdAt,
      updatedAt: orgSecrets.updatedAt,
    })

  return secret
}

export async function updateOrgSecret({
  orgId,
  id,
  value,
}: {
  orgId: string
  id: string
  value: string
}) {
  const [secret] = await db
    .update(orgSecrets)
    .set({
      encryptedValue: encryptSecret(value),
      updatedAt: new Date(),
    })
    .where(and(eq(orgSecrets.id, id), eq(orgSecrets.orgId, orgId)))
    .returning({
      id: orgSecrets.id,
      name: orgSecrets.name,
      createdAt: orgSecrets.createdAt,
      updatedAt: orgSecrets.updatedAt,
    })

  return secret
}

export async function deleteOrgSecret(orgId: string, id: string) {
  const [secret] = await db
    .delete(orgSecrets)
    .where(and(eq(orgSecrets.id, id), eq(orgSecrets.orgId, orgId)))
    .returning({ id: orgSecrets.id, name: orgSecrets.name })

  return secret
}

// Decrypt every secret for an org into a plain name→value map for interpolation.
export async function getDecryptedOrgSecrets(
  orgId: string
): Promise<Record<string, string>> {
  const rows = await db
    .select({
      name: orgSecrets.name,
      encryptedValue: orgSecrets.encryptedValue,
    })
    .from(orgSecrets)
    .where(eq(orgSecrets.orgId, orgId))

  const result: Record<string, string> = {}
  for (const row of rows) {
    result[row.name] = decryptSecret(row.encryptedValue)
  }
  return result
}

// ---------------------------------------------------------------------------
// Auth profiles (Browserbase Context wrappers)
// ---------------------------------------------------------------------------

export function listAuthProfiles(orgId: string) {
  return db
    .select()
    .from(authProfiles)
    .where(eq(authProfiles.orgId, orgId))
    .orderBy(authProfiles.name)
}

export async function getAuthProfile(orgId: string, id: string) {
  const [profile] = await db
    .select()
    .from(authProfiles)
    .where(and(eq(authProfiles.id, id), eq(authProfiles.orgId, orgId)))

  return profile
}

export async function getAuthProfileByLoginSession(
  orgId: string,
  sessionId: string
) {
  const [profile] = await db
    .select()
    .from(authProfiles)
    .where(
      and(
        eq(authProfiles.orgId, orgId),
        eq(authProfiles.activeLoginSessionId, sessionId)
      )
    )

  return profile
}

export async function createAuthProfile({
  orgId,
  name,
  browserbaseContextId,
}: {
  orgId: string
  name: string
  browserbaseContextId: string
}): Promise<AuthProfile> {
  const [profile] = await db
    .insert(authProfiles)
    .values({ orgId, name, browserbaseContextId })
    .returning()

  return profile
}

export async function setAuthProfileLoginSession({
  orgId,
  id,
  activeLoginSessionId,
  markAuthenticated = false,
}: {
  orgId: string
  id: string
  activeLoginSessionId: string | null
  markAuthenticated?: boolean
}): Promise<AuthProfile | undefined> {
  const [profile] = await db
    .update(authProfiles)
    .set({
      activeLoginSessionId,
      updatedAt: new Date(),
      ...(markAuthenticated ? { lastAuthenticatedAt: new Date() } : {}),
    })
    .where(and(eq(authProfiles.id, id), eq(authProfiles.orgId, orgId)))
    .returning()

  return profile
}

export async function deleteAuthProfile(orgId: string, id: string) {
  const [profile] = await db
    .delete(authProfiles)
    .where(and(eq(authProfiles.id, id), eq(authProfiles.orgId, orgId)))
    .returning()

  return profile
}

// ---------------------------------------------------------------------------
// Run artifacts (screenshots, etc.)
// ---------------------------------------------------------------------------

export async function createRunArtifact({
  runId,
  orgId,
  contentType,
  data,
}: {
  runId: string
  orgId: string
  contentType: string
  data: Buffer
}): Promise<RunArtifact> {
  const [artifact] = await db
    .insert(runArtifacts)
    .values({ runId, orgId, contentType, data })
    .returning()

  return artifact
}

export async function getRunArtifact(orgId: string, id: string) {
  const [artifact] = await db
    .select()
    .from(runArtifacts)
    .where(and(eq(runArtifacts.id, id), eq(runArtifacts.orgId, orgId)))

  return artifact
}
