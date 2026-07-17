import { schedules, tasks } from "@trigger.dev/sdk"

import type { runWorkflowTask } from "@/features/workflows/tasks/run-workflow"
import { getWorkflowById } from "@/features/workflows/data"

// Imperative schedules attach to this task (one schedule per workflow via
// externalId = workflow id). When a cron fires, start the same run-workflow
// task the Run button uses.
export const runWorkflowScheduledTask = schedules.task({
  id: "run-workflow-scheduled",
  run: async (payload) => {
    const workflowId = payload.externalId
    if (!workflowId) {
      throw new Error("Scheduled run missing externalId (workflow id)")
    }

    const workflow = await getWorkflowById(workflowId)
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }
    if (!workflow.graph) {
      throw new Error(`Workflow ${workflowId} has no saved graph`)
    }

    await tasks.trigger<typeof runWorkflowTask>(
      "run-workflow",
      {
        workflowId: workflow.id,
        orgId: workflow.orgId,
        trigger: { source: "schedule" },
      },
      { tags: [`workflow:${workflow.id}`] }
    )
  },
})
