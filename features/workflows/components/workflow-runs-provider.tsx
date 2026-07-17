"use client"

import { createContext, useContext, useMemo } from "react"
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks"

import type { WorkflowRunRecord } from "@/lib/db/schema"
import type { RunStep } from "@/features/workflows/lib/run-types"

// Don't pass `typeof runWorkflowTask` into the hook generic — pnpm can resolve
// different @trigger.dev/core copies for sdk vs react-hooks, and BrandRun
// symbols then fail the AnyTask constraint at build time.
type TriggerWorkflowRun = ReturnType<
  typeof useRealtimeRunsWithTag
>["runs"][number]

type RunWorkflowOutput = {
  steps: RunStep[]
  browserbaseSessionId?: string
}

interface WorkflowRunsContextValue {
  runs: ConsoleRun[]
  error?: Error
}

const WorkflowRunsContext = createContext<WorkflowRunsContextValue | null>(null)

// Serializable snapshot handed down from the server so history survives when
// Trigger realtime no longer includes older runs.
export type InitialWorkflowRun = Pick<
  WorkflowRunRecord,
  "id" | "status" | "steps" | "browserbaseSessionId" | "createdAt" | "error"
>

interface WorkflowRunsProviderProps {
  workflowId: string
  // A Public Access Token scoped to read this workflow's runs, minted on the
  // server (auth.createPublicToken) and handed down as a prop.
  accessToken: string
  initialRuns?: InitialWorkflowRun[]
  children: React.ReactNode
}

// One shared realtime subscription to every run tagged workflow:<id>, merged
// with durable Postgres history. Any component on the canvas reads through the
// hooks below instead of opening its own socket.
export function WorkflowRunsProvider({
  workflowId,
  accessToken,
  initialRuns = [],
  children,
}: WorkflowRunsProviderProps) {
  const { runs: realtimeRuns, error } = useRealtimeRunsWithTag(
    `workflow:${workflowId}`,
    { accessToken }
  )

  const runs = useMemo(
    () => mergeRuns(initialRuns, realtimeRuns),
    [initialRuns, realtimeRuns]
  )

  const value = useMemo<WorkflowRunsContextValue>(
    () => ({ runs, error }),
    [runs, error]
  )

  return (
    <WorkflowRunsContext.Provider value={value}>
      {children}
    </WorkflowRunsContext.Provider>
  )
}

function useWorkflowRuns() {
  const ctx = useContext(WorkflowRunsContext)
  if (!ctx) {
    throw new Error(
      "useWorkflowRuns must be used within a WorkflowRunsProvider"
    )
  }
  return ctx
}

// A run is still producing steps while it's queued or executing.
function isRunLive(status: ConsoleRun["status"]): boolean {
  return status === "QUEUED" || status === "EXECUTING"
}

function stepsForTriggerRun(run: TriggerWorkflowRun): RunStep[] {
  const output = run.output as RunWorkflowOutput | undefined
  const metadataSteps = run.metadata?.steps as RunStep[] | undefined
  return output?.steps ?? metadataSteps ?? []
}

function sessionIdForTriggerRun(run: TriggerWorkflowRun): string | undefined {
  const output = run.output as RunWorkflowOutput | undefined
  // Prefer output (final), then metadata (mid-run live view), so the console
  // can open the live view as soon as the Browserbase session exists.
  const metadataSessionId = run.metadata?.browserbaseSessionId as
    | string
    | undefined
  return output?.browserbaseSessionId ?? metadataSessionId
}

// Map durable DB statuses onto the Trigger-shaped statuses the console already
// understands. Unknown values fall through as EXECUTING so we don't invent UI.
function normalizeStoredStatus(
  status: InitialWorkflowRun["status"]
): ConsoleRun["status"] {
  switch (status) {
    case "COMPLETED":
      return "COMPLETED"
    case "FAILED":
      return "FAILED"
    case "CANCELED":
      return "CANCELED"
    case "EXECUTING":
    default:
      return "EXECUTING"
  }
}

function consoleRunFromStored(run: InitialWorkflowRun): ConsoleRun {
  const status = normalizeStoredStatus(run.status)
  return {
    id: run.id,
    status,
    createdAt: new Date(run.createdAt),
    // History alone can't prove a run is still live — realtime sets isLive when
    // Trigger still has the run in QUEUED/EXECUTING.
    isLive: false,
    steps: run.steps ?? [],
    browserbaseSessionId: run.browserbaseSessionId ?? undefined,
    error: run.error ?? undefined,
  }
}

function consoleRunFromTrigger(run: TriggerWorkflowRun): ConsoleRun {
  return {
    id: run.id,
    status: run.status,
    createdAt: run.createdAt,
    isLive: isRunLive(run.status),
    steps: stepsForTriggerRun(run),
    browserbaseSessionId: sessionIdForTriggerRun(run),
  }
}

// Realtime wins for overlapping ids (live progress); DB fills gaps Trigger dropped.
function mergeRuns(
  initialRuns: InitialWorkflowRun[],
  realtimeRuns: TriggerWorkflowRun[]
): ConsoleRun[] {
  const byId = new Map<string, ConsoleRun>()

  for (const run of initialRuns) {
    byId.set(run.id, consoleRunFromStored(run))
  }

  for (const run of realtimeRuns) {
    const fromTrigger = consoleRunFromTrigger(run)
    const existing = byId.get(run.id)
    byId.set(run.id, {
      ...fromTrigger,
      // Keep a session id we already had from history if realtime hasn't
      // published one yet (or lost it during a metadata race).
      browserbaseSessionId:
        fromTrigger.browserbaseSessionId ?? existing?.browserbaseSessionId,
    })
  }

  return [...byId.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )
}

interface LatestRunSteps {
  steps: RunStep[]
  // True while the latest run is queued or executing — i.e. still producing steps.
  isLive: boolean
}

// The steps of the most recent run, plus whether it's still going.
export function useLatestRunSteps(): LatestRunSteps {
  const { runs } = useWorkflowRuns()

  return useMemo<LatestRunSteps>(() => {
    const latest = runs[0]
    if (!latest) return { steps: [], isLive: false }
    return { steps: latest.steps, isLive: latest.isLive }
  }, [runs])
}

// The run currently in flight, if any — at most one is live at a time. A Stop
// button reads this to know whether there's a run to cancel and, if so, its id.
export function useLiveRun(): ConsoleRun | undefined {
  const { runs } = useWorkflowRuns()

  return useMemo(() => runs.find((run) => run.isLive), [runs])
}

// One run flattened for the console: its identity and status, whether it's still
// live, and its steps with everything each one produced.
export interface ConsoleRun {
  id: string
  // Keep Trigger's status union so existing console styling stays valid, while
  // also accepting the durable subset we persist to Postgres.
  status:
    | TriggerWorkflowRun["status"]
    | "EXECUTING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELED"
  createdAt: Date
  isLive: boolean
  steps: RunStep[]
  // The Browserbase session id to replay, present once a session was opened.
  browserbaseSessionId?: string
  error?: string
}

// Every run, newest first, with its steps resolved — the full history a console
// panel below the canvas renders as a list of runs to drill into.
export function useConsoleRuns(): ConsoleRun[] {
  return useWorkflowRuns().runs
}
