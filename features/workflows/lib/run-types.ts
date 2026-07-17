import type { NodeType } from "@/features/workflows/nodes/node-registry"

// One entry per node a run walks. Published to Trigger metadata for live UI and
// persisted on workflow_runs for durable history.
export type RunStep = {
  nodeId: string
  // The node's registry type (for its icon/accent) and title, denormalized so
  // the console can render a step without re-reading the graph.
  type: NodeType
  title: string
  status: "pending" | "running" | "done" | "failed"
  // Wall-clock time the executor took, set once the step leaves "running".
  durationMs?: number
  // Whatever the executor returned, kept for the console's per-step detail view.
  output?: unknown
  // The thrown error's message, set only when status is "failed".
  error?: string
}

export type WorkflowRunStatus =
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"
