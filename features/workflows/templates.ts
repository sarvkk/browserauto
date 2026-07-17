import type { Edge } from "@xyflow/react"

import type { WorkflowGraph } from "@/lib/db/schema"
import type { StepNodeType } from "@/features/workflows/nodes/node-registry"

export type WorkflowTemplateId =
  | "scrape-email"
  | "open-extract"
  | "branch-demo"

export type WorkflowTemplate = {
  id: WorkflowTemplateId
  name: string
  description: string
  graph: WorkflowGraph
}

function node(
  id: string,
  type: StepNodeType["data"]["type"],
  title: string,
  position: { x: number; y: number },
  values: Record<string, string> = {},
  kind: StepNodeType["data"]["kind"] = "action"
): StepNodeType {
  return {
    id,
    type: "step",
    position,
    data: { type, kind, title, values },
  }
}

function edge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string
): Edge {
  return {
    id,
    source,
    target,
    ...(sourceHandle ? { sourceHandle } : {}),
  }
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "open-extract",
    name: "Open & Extract",
    description: "Open a URL and extract data with natural language.",
    graph: {
      nodes: [
        node("start", "start", "Start", { x: 0, y: 120 }, {}, "trigger"),
        node("open-1", "open-url", "Open URL 1", { x: 260, y: 120 }, {
          url: "https://news.ycombinator.com",
        }),
        node("extract-1", "extract", "Extract 1", { x: 520, y: 120 }, {
          instruction: "Extract the top story title and points",
          schema: '{ "title": "string", "points": "string" }',
        }),
      ],
      edges: [
        edge("e1", "start", "open-1"),
        edge("e2", "open-1", "extract-1"),
      ],
    },
  },
  {
    id: "scrape-email",
    name: "Scrape → Email",
    description: "Extract page content and email yourself the result.",
    graph: {
      nodes: [
        node("start", "start", "Start", { x: 0, y: 120 }, {}, "trigger"),
        node("open-1", "open-url", "Open URL 1", { x: 260, y: 120 }, {
          url: "https://example.com",
        }),
        node("extract-1", "extract", "Extract 1", { x: 520, y: 120 }, {
          instruction: "Extract the main heading and a one-sentence summary",
        }),
        node("email-1", "send-email", "Send Email 1", { x: 780, y: 120 }, {
          to: "you@example.com",
          subject: "Scrape result",
          body: "Result:\n{{ extract-1.extraction }}",
        }),
      ],
      edges: [
        edge("e1", "start", "open-1"),
        edge("e2", "open-1", "extract-1"),
        edge("e3", "extract-1", "email-1"),
      ],
    },
  },
  {
    id: "branch-demo",
    name: "Branch Demo",
    description: "Branch on extracted text and take different paths.",
    graph: {
      nodes: [
        node("start", "start", "Start", { x: 0, y: 160 }, {}, "trigger"),
        node("open-1", "open-url", "Open URL 1", { x: 240, y: 160 }, {
          url: "https://example.com",
        }),
        node("extract-1", "extract", "Extract 1", { x: 480, y: 160 }, {
          instruction: "Extract the main heading text",
        }),
        node("branch-1", "branch", "Branch 1", { x: 720, y: 160 }, {
          left: "{{ extract-1.extraction }}",
          operator: "contains",
          right: "Example",
        }),
        node("email-true", "send-email", "Matched", { x: 980, y: 40 }, {
          to: "you@example.com",
          subject: "Matched",
          body: "Heading contained Example:\n{{ extract-1.extraction }}",
        }),
        node("email-false", "send-email", "No match", { x: 980, y: 280 }, {
          to: "you@example.com",
          subject: "No match",
          body: "Heading did not contain Example:\n{{ extract-1.extraction }}",
        }),
      ],
      edges: [
        edge("e1", "start", "open-1"),
        edge("e2", "open-1", "extract-1"),
        edge("e3", "extract-1", "branch-1"),
        edge("e4", "branch-1", "email-true", "true"),
        edge("e5", "branch-1", "email-false", "false"),
      ],
    },
  },
]
