// Payload attached to a workflow run so nodes can read {{ trigger.* }}.
export type RunTriggerSource = "manual" | "webhook" | "schedule"

export type RunTrigger = {
  source: RunTriggerSource
  // Parsed JSON body (webhook / manual), or undefined when absent.
  body?: unknown
}

export type RunWorkflowPayload = {
  workflowId: string
  orgId: string
  trigger?: RunTrigger
  // Manual-run override. `undefined` → use workflow.authProfileId;
  // `null` → no profile for this run; string → that profile id.
  authProfileId?: string | null
}
