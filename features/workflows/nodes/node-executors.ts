import type { Stagehand } from "@browserbasehq/stagehand"

import type {
  ActionNodeType,
  NodeType,
} from "@/features/workflows/nodes/node-registry"
import { act } from "./act"
import { agent } from "./agent"
import { branch } from "./branch"
import { extract } from "./extract"
import { httpRequest } from "./http-request"
import { observe } from "./observe"
import { openUrl } from "./open-url"
import { screenshot } from "./screenshot"
import { sendEmail } from "./send-email"
import { slack } from "./slack"
import { waitSeconds } from "./wait"

export type NodeContext = {
  values: Record<string, string>
  getStagehand: () => Promise<Stagehand>
  runId: string
  orgId: string
}

export type NodeExecutor = (ctx: NodeContext) => Promise<unknown>

export const nodeExecutors: Partial<Record<NodeType, NodeExecutor>> = {
  "open-url": async ({ values, getStagehand }) =>
    openUrl({ stagehand: await getStagehand(), url: values.url }),
  act: async ({ values, getStagehand }) =>
    act({ stagehand: await getStagehand(), instruction: values.instruction }),
  extract: async ({ values, getStagehand }) =>
    extract({
      stagehand: await getStagehand(),
      instruction: values.instruction,
      schema: values.schema,
    }),
  observe: async ({ values, getStagehand }) =>
    observe({ stagehand: await getStagehand(), instruction: values.instruction }),
  agent: async ({ values, getStagehand }) =>
    agent({ stagehand: await getStagehand(), instruction: values.instruction }),
  "send-email": async ({ values }) =>
    sendEmail({ to: values.to, subject: values.subject, body: values.body }),
  branch: async ({ values }) =>
    branch({
      left: values.left ?? "",
      operator: values.operator || "equals",
      right: values.right ?? "",
    }),
  wait: async ({ values }) => waitSeconds({ seconds: values.seconds }),
  "http-request": async ({ values }) =>
    httpRequest({
      url: values.url,
      method: values.method || "GET",
      headers: values.headers ?? "",
      body: values.body ?? "",
    }),
  slack: async ({ values }) =>
    slack({ webhookUrl: values.webhookUrl, message: values.message }),
  screenshot: async ({ getStagehand, runId, orgId }) =>
    screenshot({
      stagehand: await getStagehand(),
      runId,
      orgId,
    }),
} satisfies Record<ActionNodeType, NodeExecutor>
