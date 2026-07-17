import type { Edge } from "@xyflow/react"
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import type {
  RunStep,
  WorkflowRunStatus,
} from "@/features/workflows/lib/run-types"
import type { StepNodeType } from "@/features/workflows/nodes/node-registry"

// Canonical, server-readable snapshot of the flow. Mirrors React Flow's own
// shape 1:1 so a future executor can read it without remapping. Persisted by the
// Run action; the live editing copy still lives in the Liveblocks room.
export type WorkflowGraph = { nodes: StepNodeType[]; edges: Edge[] }

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  graph: jsonb("graph").$type<WorkflowGraph>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type Workflow = typeof workflows.$inferSelect

// Durable copy of a Trigger.dev run. Primary key is the Trigger run id so live
// realtime rows and DB history merge 1:1 in the console.
export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: text("id").primaryKey(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    orgId: text("org_id").notNull(),
    status: text("status").$type<WorkflowRunStatus>().notNull(),
    steps: jsonb("steps").$type<RunStep[]>().notNull().default([]),
    browserbaseSessionId: text("browserbase_session_id"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
  },
  (table) => [
    index("workflow_runs_workflow_created_idx").on(
      table.workflowId,
      table.createdAt
    ),
    index("workflow_runs_org_session_idx").on(
      table.orgId,
      table.browserbaseSessionId
    ),
  ]
)

export type WorkflowRunRecord = typeof workflowRuns.$inferSelect
export type WorkflowRunInsert = typeof workflowRuns.$inferInsert
