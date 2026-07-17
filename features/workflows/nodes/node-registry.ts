import type { Node } from "@xyflow/react"
import {
  Bot,
  Camera,
  Eye,
  GitBranch,
  Globe,
  Hourglass,
  Mail,
  MessageSquare,
  MousePointerClick,
  Pointer,
  ScanText,
  Send,
  type LucideIcon,
} from "lucide-react"

export type StepNodeKind = "trigger" | "action"

export type NodeFieldOption = {
  value: string
  label: string
}

// One editable field on a node, rendered in the inspector.
export type NodeField = {
  key: string
  label: string
  placeholder?: string
  // Render as a multi-line textarea instead of a single-line input.
  multiline?: boolean
  // Render as a select with the given options.
  kind?: "text" | "select"
  options?: NodeFieldOption[]
  required?: boolean
}

export type NodeOutput = {
  path: string
  label: string
}

export type SourceHandleDef = {
  id: string
  label: string
}

// A node type's manifest entry. Add a node by adding an entry to nodeRegistry.
export type NodeDefinition = {
  type: string
  kind: StepNodeKind
  label: string
  icon: LucideIcon
  accent: string // Tailwind classes for the icon chip color
  fields: NodeField[]
  outputs: NodeOutput[]
  // When set, the step node renders multiple labeled source handles instead of
  // the default single unlabeled one (used by branch).
  sourceHandles?: SourceHandleDef[]
}

export const nodeRegistry = {
  start: {
    type: "start",
    kind: "trigger",
    label: "Start",
    icon: MousePointerClick,
    accent: "bg-blue-500 text-white",
    fields: [],
    outputs: [],
  },
  "open-url": {
    type: "open-url",
    kind: "action",
    label: "Open URL",
    icon: Globe,
    accent: "bg-emerald-500 text-white",
    fields: [
      { key: "url", label: "URL", placeholder: "https://youtube.com", required: true },
    ],
    outputs: [
      { path: "url", label: "URL" },
      { path: "title", label: "Title" },
    ],
  },
  act: {
    type: "act",
    kind: "action",
    label: "Act",
    icon: Pointer,
    accent: "bg-violet-500 text-white",
    fields: [
      {
        key: "instruction",
        label: "Instruction",
        placeholder: "Click the sign in button",
        multiline: true,
        required: true,
      },
    ],
    outputs: [
      { path: "success", label: "Success" },
      { path: "message", label: "Message" },
      { path: "url", label: "URL" },
    ],
  },
  extract: {
    type: "extract",
    kind: "action",
    label: "Extract",
    icon: ScanText,
    accent: "bg-amber-500 text-white",
    fields: [
      {
        key: "instruction",
        label: "Instruction",
        placeholder: "Extract the product price",
        multiline: true,
        required: true,
      },
      {
        key: "schema",
        label: "Schema (optional JSON)",
        placeholder: '{ "price": "string", "items": ["string"] }',
        multiline: true,
      },
    ],
    outputs: [{ path: "extraction", label: "Extraction" }],
  },
  observe: {
    type: "observe",
    kind: "action",
    label: "Observe",
    icon: Eye,
    accent: "bg-sky-500 text-white",
    fields: [
      {
        key: "instruction",
        label: "Instruction",
        placeholder: "Find the sign in button",
        multiline: true,
        required: true,
      },
    ],
    outputs: [
      { path: "matches", label: "Matches" },
      { path: "matches[0].selector", label: "Selector" },
      { path: "matches[0].description", label: "Description" },
    ],
  },
  agent: {
    type: "agent",
    kind: "action",
    label: "Agent",
    icon: Bot,
    accent: "bg-rose-500 text-white",
    fields: [
      {
        key: "instruction",
        label: "Instruction",
        placeholder: "Search for the stock price of NVDA",
        multiline: true,
        required: true,
      },
    ],
    outputs: [
      { path: "success", label: "Success" },
      { path: "message", label: "Message" },
      { path: "completed", label: "Completed" },
    ],
  },
  "send-email": {
    type: "send-email",
    kind: "action",
    label: "Send Email",
    icon: Mail,
    accent: "bg-teal-500 text-white",
    fields: [
      { key: "to", label: "To", placeholder: "person@example.com", required: true },
      { key: "subject", label: "Subject", placeholder: "Hello", required: true },
      {
        key: "body",
        label: "Body",
        placeholder: "Write your message…",
        multiline: true,
        required: true,
      },
    ],
    outputs: [{ path: "id", label: "Email ID" }],
  },
  branch: {
    type: "branch",
    kind: "action",
    label: "Branch",
    icon: GitBranch,
    accent: "bg-orange-500 text-white",
    fields: [
      {
        key: "left",
        label: "Left value",
        placeholder: "{{ node.extraction }}",
        required: true,
      },
      {
        key: "operator",
        label: "Operator",
        kind: "select",
        options: [
          { value: "equals", label: "Equals" },
          { value: "not_equals", label: "Not equals" },
          { value: "contains", label: "Contains" },
          { value: "greater_than", label: "Greater than" },
          { value: "less_than", label: "Less than" },
          { value: "is_empty", label: "Is empty" },
        ],
        required: true,
      },
      {
        key: "right",
        label: "Right value",
        placeholder: "expected value",
      },
    ],
    outputs: [
      { path: "result", label: "Result" },
      { path: "branch", label: "Branch" },
    ],
    sourceHandles: [
      { id: "true", label: "True" },
      { id: "false", label: "False" },
    ],
  },
  wait: {
    type: "wait",
    kind: "action",
    label: "Wait",
    icon: Hourglass,
    accent: "bg-stone-500 text-white",
    fields: [
      {
        key: "seconds",
        label: "Seconds",
        placeholder: "5",
        required: true,
      },
    ],
    outputs: [{ path: "seconds", label: "Seconds" }],
  },
  "http-request": {
    type: "http-request",
    kind: "action",
    label: "HTTP Request",
    icon: Send,
    accent: "bg-indigo-500 text-white",
    fields: [
      {
        key: "url",
        label: "URL",
        placeholder: "https://api.example.com/data",
        required: true,
      },
      {
        key: "method",
        label: "Method",
        kind: "select",
        options: [
          { value: "GET", label: "GET" },
          { value: "POST", label: "POST" },
          { value: "PUT", label: "PUT" },
          { value: "PATCH", label: "PATCH" },
          { value: "DELETE", label: "DELETE" },
        ],
        required: true,
      },
      {
        key: "headers",
        label: "Headers (JSON)",
        placeholder: '{ "Authorization": "Bearer {{ secrets.API_KEY }}" }',
        multiline: true,
      },
      {
        key: "body",
        label: "Body",
        placeholder: '{ "hello": "world" }',
        multiline: true,
      },
    ],
    outputs: [
      { path: "status", label: "Status" },
      { path: "body", label: "Body" },
    ],
  },
  slack: {
    type: "slack",
    kind: "action",
    label: "Slack",
    icon: MessageSquare,
    accent: "bg-fuchsia-500 text-white",
    fields: [
      {
        key: "webhookUrl",
        label: "Webhook URL",
        placeholder: "{{ secrets.SLACK_WEBHOOK_URL }}",
        required: true,
      },
      {
        key: "message",
        label: "Message",
        placeholder: "Workflow finished",
        multiline: true,
        required: true,
      },
    ],
    outputs: [{ path: "ok", label: "OK" }],
  },
  screenshot: {
    type: "screenshot",
    kind: "action",
    label: "Screenshot",
    icon: Camera,
    accent: "bg-cyan-500 text-white",
    fields: [],
    outputs: [
      { path: "url", label: "URL" },
      { path: "artifactId", label: "Artifact ID" },
    ],
  },
} satisfies Record<string, NodeDefinition>

export type NodeType = keyof typeof nodeRegistry

// Plain JSON only (synced through Liveblocks). type keys into the registry;
// kind and title are denormalized so the server can read them without the registry.
export type StepNodeData = {
  type: NodeType
  kind: StepNodeKind
  title: string
  values: Record<string, string>
}

export type StepNodeType = Node<StepNodeData, "step">

export type ActionNodeType = {
  [K in NodeType]: (typeof nodeRegistry)[K]["kind"] extends "action" ? K : never
}[NodeType]
