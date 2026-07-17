"use client"

import { useState, useTransition } from "react"
import { useReactFlow, useStore } from "@xyflow/react"
import { Copy, Play, Square } from "lucide-react"
import { toast } from "sonner"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResizablePanel } from "@/components/ui/resizable"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

import {
  cancelWorkflowRunAction,
  disableWorkflowScheduleAction,
  runWorkflowAction,
  setWebhookEnabledAction,
  setWorkflowAuthProfileAction,
  setWorkflowScheduleAction,
} from "@/features/workflows/actions"
import { NodeIcon } from "@/features/workflows/components/node-icon"
import { WorkflowActionsMenu } from "@/features/workflows/components/workflow-actions-menu"
import { useLiveRun } from "@/features/workflows/components/workflow-runs-provider"
import { useUpstreamConnections } from "@/features/workflows/hooks/use-upstream-connections"
import { validateGraph } from "@/features/workflows/lib/validate-graph"
import {
  nodeRegistry,
  type NodeDefinition,
  type NodeField,
  type NodeType,
  type StepNodeKind,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-y border-border bg-card px-3 py-1.5 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}

function Field({
  field,
  value,
  onChange,
  onFocus,
}: {
  field: NodeField
  value: string
  onChange: (value: string) => void
  onFocus: () => void
}) {
  if (field.kind === "select" && field.options) {
    return (
      <Select
        value={value || field.options[0]?.value}
        onValueChange={onChange}
      >
        <SelectTrigger id={field.key} className="w-full" onFocus={onFocus}>
          <SelectValue placeholder={field.placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (field.multiline) {
    return (
      <Textarea
        id={field.key}
        value={value}
        placeholder={field.placeholder}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  return (
    <Input
      id={field.key}
      value={value}
      placeholder={field.placeholder}
      onFocus={onFocus}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

const AUTH_PROFILE_NONE = "__none__"
const AUTH_PROFILE_DEFAULT = "__default__"

type AuthProfileOption = {
  id: string
  name: string
}

function TriggersPanel({
  workflowId,
  scheduleCron,
  webhookSecret,
  authProfileId,
  authProfiles,
}: {
  workflowId: string
  scheduleCron: string | null
  webhookSecret: string | null
  authProfileId: string | null
  authProfiles: AuthProfileOption[]
}) {
  const { getNodes, getEdges } = useReactFlow<StepNodeType>()
  const [cron, setCron] = useState(scheduleCron ?? "0 9 * * *")
  const [localWebhookSecret, setLocalWebhookSecret] = useState(webhookSecret)
  const [localScheduleCron, setLocalScheduleCron] = useState(scheduleCron)
  const [localAuthProfileId, setLocalAuthProfileId] = useState(authProfileId)
  const [isPending, startTransition] = useTransition()
  const webhookEnabled = Boolean(localWebhookSecret)
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/workflows/${workflowId}/trigger`
      : `/api/workflows/${workflowId}/trigger`

  // Sync when the server props change. Adjust during render rather than in an
  // effect to avoid cascading setState warnings.
  const [prevScheduleCron, setPrevScheduleCron] = useState(scheduleCron)
  if (scheduleCron !== prevScheduleCron) {
    setPrevScheduleCron(scheduleCron)
    setCron(scheduleCron ?? "0 9 * * *")
    setLocalScheduleCron(scheduleCron)
  }
  const [prevWebhookSecret, setPrevWebhookSecret] = useState(webhookSecret)
  if (webhookSecret !== prevWebhookSecret) {
    setPrevWebhookSecret(webhookSecret)
    setLocalWebhookSecret(webhookSecret)
  }
  const [prevAuthProfileId, setPrevAuthProfileId] = useState(authProfileId)
  if (authProfileId !== prevAuthProfileId) {
    setPrevAuthProfileId(authProfileId)
    setLocalAuthProfileId(authProfileId)
  }

  return (
    <div className="flex flex-col gap-4 border-t border-border p-3">
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold">Auth profile</Label>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Default logged-in Browserbase context for this workflow (schedules and
          webhooks). Create profiles under Auth profiles, then pick one here.
        </p>
        <Select
          value={localAuthProfileId ?? AUTH_PROFILE_NONE}
          disabled={isPending}
          onValueChange={(value) => {
            const next = value === AUTH_PROFILE_NONE ? null : value
            startTransition(async () => {
              try {
                const result = await setWorkflowAuthProfileAction({
                  id: workflowId,
                  authProfileId: next,
                })
                setLocalAuthProfileId(result.authProfileId)
                toast.success(
                  next ? "Auth profile saved" : "Auth profile cleared"
                )
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Couldn't save auth profile"
                )
              }
            })
          }}
        >
          <SelectTrigger className="w-full text-xs">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={AUTH_PROFILE_NONE}>None</SelectItem>
            {authProfiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold">Schedule (cron)</Label>
        <div className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <p>
            Automatically runs this workflow on a timer — same as pressing{" "}
            <span className="font-medium text-foreground">Run</span>, but
            without you being here.
          </p>
          <p>
            <span className="font-medium text-foreground">Enable schedule</span>{" "}
            saves the current canvas and registers the cron with Trigger.dev.
            Runs show up in the bottom runs panel when they fire.
          </p>
          <p>
            Format:{" "}
            <code className="rounded bg-muted px-1 font-mono text-[10px]">
              minute hour day month weekday
            </code>{" "}
            (UTC). Example{" "}
            <code className="rounded bg-muted px-1 font-mono text-[10px]">
              0 9 * * *
            </code>{" "}
            = every day at 09:00 UTC.
          </p>
        </div>
        <Input
          value={cron}
          onChange={(e) => setCron(e.target.value)}
          placeholder="0 9 * * *"
          className="font-mono text-xs"
          aria-describedby="cron-help"
        />
        <p id="cron-help" className="text-[10px] text-muted-foreground">
          Common:{" "}
          <button
            type="button"
            className="font-mono underline-offset-2 hover:underline"
            onClick={() => setCron("0 9 * * *")}
          >
            0 9 * * *
          </button>{" "}
          daily ·{" "}
          <button
            type="button"
            className="font-mono underline-offset-2 hover:underline"
            onClick={() => setCron("0 */6 * * *")}
          >
            0 */6 * * *
          </button>{" "}
          every 6h ·{" "}
          <button
            type="button"
            className="font-mono underline-offset-2 hover:underline"
            onClick={() => setCron("0 9 * * 1-5")}
          >
            0 9 * * 1-5
          </button>{" "}
          weekdays
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => {
              const graph = { nodes: getNodes(), edges: getEdges() }
              const problems = validateGraph(graph)
              if (problems.length > 0) {
                toast.error(problems[0])
                return
              }
              startTransition(async () => {
                try {
                  const result = await setWorkflowScheduleAction({
                    id: workflowId,
                    cron,
                    graph,
                  })
                  setLocalScheduleCron(result.cron)
                  toast.success("Schedule saved")
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Couldn't save schedule"
                  )
                }
              })
            }}
          >
            {localScheduleCron ? "Update" : "Enable"} schedule
          </Button>
          {localScheduleCron && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await disableWorkflowScheduleAction(workflowId)
                    setLocalScheduleCron(null)
                    toast.success("Schedule disabled")
                  } catch {
                    toast.error("Couldn't disable schedule")
                  }
                })
              }}
            >
              Disable
            </Button>
          )}
        </div>
        {localScheduleCron && (
          <p className="text-[11px] text-muted-foreground">
            Active: <span className="font-mono">{localScheduleCron}</span>
            {" · "}
            next runs appear below when Trigger fires this workflow.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-semibold">Webhook</Label>
          <Switch
            checked={webhookEnabled}
            disabled={isPending}
            onCheckedChange={(checked) => {
              startTransition(async () => {
                try {
                  const result = await setWebhookEnabledAction({
                    id: workflowId,
                    enabled: checked,
                  })
                  setLocalWebhookSecret(result.webhookSecret)
                  toast.success(
                    checked ? "Webhook enabled" : "Webhook disabled"
                  )
                } catch {
                  toast.error("Couldn't update webhook")
                }
              })
            }}
          />
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Let another app start this workflow with a POST. Turn on the switch to
          get a URL and secret — send{" "}
          <code className="rounded bg-muted px-1">x-webhook-secret</code> as a
          header. JSON body fields are available as{" "}
          <code className="rounded bg-muted px-1">{"{{ trigger.body }}"}</code>{" "}
          (and nested paths like{" "}
          <code className="rounded bg-muted px-1">
            {"{{ trigger.body.url }}"}
          </code>
          ).
        </p>
        {webhookEnabled && localWebhookSecret && (
          <>
            <div className="flex gap-1">
              <Input
                readOnly
                value={webhookUrl}
                className="font-mono text-[11px]"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(webhookUrl)
                  toast.success("URL copied")
                }}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
            <div className="flex gap-1">
              <Input
                readOnly
                value={localWebhookSecret}
                className="font-mono text-[11px]"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(localWebhookSecret)
                  toast.success("Secret copied")
                }}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Inspector({
  node,
  workflowId,
  scheduleCron,
  webhookSecret,
  authProfileId,
  authProfiles,
}: {
  node: StepNodeType | undefined
  workflowId: string
  scheduleCron: string | null
  webhookSecret: string | null
  authProfileId: string | null
  authProfiles: AuthProfileOption[]
}) {
  const { updateNodeData } = useReactFlow<StepNodeType>()
  const connections = useUpstreamConnections()
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null)

  if (!node) {
    return (
      <Section title="Editor">
        <p className="p-3 text-sm text-muted-foreground">No node selected</p>
      </Section>
    )
  }

  const { type, title, values } = node.data
  const def: NodeDefinition = nodeRegistry[type]
  const targetKey = activeFieldKey ?? def.fields[0]?.key
  const isStart = type === "start"

  const insertToken = (token: string) => {
    if (!targetKey) return
    updateNodeData(node.id, {
      values: { ...values, [targetKey]: (values[targetKey] ?? "") + token },
    })
  }

  return (
    <Section title={title} icon={<NodeIcon type={type} />}>
      <div className="flex flex-col gap-3 p-3">
        {def.fields.length === 0 && !isStart ? (
          <p className="text-xs text-muted-foreground">No properties</p>
        ) : (
          def.fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={field.key} className="text-xs">
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </Label>
              <Field
                field={field}
                value={values[field.key] ?? ""}
                onFocus={() => setActiveFieldKey(field.key)}
                onChange={(value) => {
                  updateNodeData(node.id, {
                    values: { ...values, [field.key]: value },
                  })
                }}
              />
            </div>
          ))
        )}

        {connections.length > 0 && def.fields.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Connections</Label>
            <div className="flex flex-wrap gap-1.5">
              {connections.map((connection) => (
                <button
                  key={connection.token}
                  type="button"
                  onClick={() => insertToken(connection.token)}
                  className="flex max-w-full items-center gap-1.5 rounded-md border border-border bg-card px-1.5 py-1 text-xs hover:bg-accent"
                >
                  {connection.nodeType ? (
                    <NodeIcon type={connection.nodeType} className="size-4" />
                  ) : null}
                  <span className="truncate">{connection.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isStart && (
        <TriggersPanel
          workflowId={workflowId}
          scheduleCron={scheduleCron}
          webhookSecret={webhookSecret}
          authProfileId={authProfileId}
          authProfiles={authProfiles}
        />
      )}
    </Section>
  )
}

const sections: { kind: StepNodeKind; label: string }[] = [
  { kind: "trigger", label: "Triggers" },
  { kind: "action", label: "Actions" },
]

const definitions = Object.values(nodeRegistry)

function Palette() {
  const { getNodes, getViewport, addNodes } = useReactFlow<StepNodeType>()
  const width = useStore((s) => s.width)
  const height = useStore((s) => s.height)

  const add = (type: NodeType) => {
    const def = nodeRegistry[type] as NodeDefinition
    const nodes = getNodes()

    if (def.kind === "trigger" && nodes.some((n) => n.data.kind === "trigger")) {
      toast.error("A workflow can only have one trigger.")
      return
    }

    const count = nodes.filter((n) => n.data.type === type).length
    const title = `${def.label} ${count + 1}`

    const { x, y, zoom } = getViewport()
    const position = {
      x: (width / 2 - x) / zoom,
      y: (height / 2 - y) / zoom,
    }

    const defaultValues: Record<string, string> = {}
    for (const field of def.fields) {
      if (field.kind === "select" && field.options?.[0]) {
        // Prefer a sensible self-heal default for act/extract.
        if (field.key === "retries") {
          defaultValues[field.key] = "2"
        } else {
          defaultValues[field.key] = field.options[0].value
        }
      }
    }

    addNodes({
      id: crypto.randomUUID(),
      type: "step",
      position,
      data: { type, kind: def.kind, title, values: defaultValues },
    })
  }

  return (
    <Section title="Toolbar">
      <Accordion
        type="multiple"
        defaultValue={sections.map((s) => s.kind)}
        className="px-3 py-2"
      >
        {sections.map((section) => (
          <AccordionItem
            key={section.kind}
            value={section.kind}
            className="not-last:border-b-0"
          >
            <AccordionTrigger className="py-2 text-xs font-medium text-muted-foreground hover:no-underline">
              {section.label}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-0.5">
              {definitions
                .filter((def) => def.kind === section.kind)
                .map((def) => {
                  const type = def.type as NodeType
                  return (
                    <Button
                      key={def.type}
                      variant="ghost"
                      onClick={() => add(type)}
                      className="justify-start gap-2.5 px-1.5 text-xs"
                    >
                      <NodeIcon type={type} />
                      {def.label}
                    </Button>
                  )
                })}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  )
}

function resolveRunAuthProfileId(
  override: string
): string | null | undefined {
  if (override === AUTH_PROFILE_DEFAULT) return undefined
  if (override === AUTH_PROFILE_NONE) return null
  return override
}

function RunButton({
  workflowId,
  triggerBody,
  authProfileOverride,
}: {
  workflowId: string
  triggerBody: string
  authProfileOverride: string
}) {
  const { getNodes, getEdges } = useReactFlow<StepNodeType>()
  const [isPending, startTransition] = useTransition()
  const liveRun = useLiveRun()

  if (liveRun) {
    return (
      <Button
        size="sm"
        variant="destructive"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            try {
              await cancelWorkflowRunAction(liveRun.id)
            } catch {
              toast.error("Couldn't stop the run.")
            }
          })
        }}
      >
        <Square fill="currentColor" />
        Stop
      </Button>
    )
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={isPending}
      onClick={() => {
        const graph = { nodes: getNodes(), edges: getEdges() }
        const problems = validateGraph(graph)
        if (problems.length > 0) {
          toast.error(problems[0])
          return
        }

        startTransition(async () => {
          try {
            await runWorkflowAction({
              id: workflowId,
              graph,
              triggerBody,
              authProfileId: resolveRunAuthProfileId(authProfileOverride),
            })
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Couldn't start the run."
            )
          }
        })
      }}
    >
      <Play fill="primary" />
      Run
    </Button>
  )
}

export function RightSidebar({
  workflowId,
  workflowName,
  scheduleCron,
  webhookSecret,
  authProfileId,
  authProfiles,
}: {
  workflowId: string
  workflowName: string
  scheduleCron: string | null
  webhookSecret: string | null
  authProfileId: string | null
  authProfiles: AuthProfileOption[]
}) {
  const [tab, setTab] = useState("toolbar")
  const [triggerBody, setTriggerBody] = useState("")
  const [authProfileOverride, setAuthProfileOverride] =
    useState(AUTH_PROFILE_DEFAULT)
  const selected = useStore((s) =>
    s.nodes.find((n) => n.selected)
  ) as StepNodeType | undefined

  const [prevSelectedId, setPrevSelectedId] = useState(selected?.id)
  if (selected && selected.id !== prevSelectedId) {
    setPrevSelectedId(selected.id)
    setTab("editor")
  }

  const defaultProfileName =
    authProfiles.find((p) => p.id === authProfileId)?.name ?? "None"

  return (
    <ResizablePanel
      className="bg-background"
      defaultSize="16rem"
      minSize="14rem"
      maxSize="36rem"
      groupResizeBehavior="preserve-pixel-size"
    >
      <Tabs value={tab} onValueChange={setTab} className="size-full gap-0">
        <div className="flex items-center justify-between border-b border-border p-2">
          <WorkflowActionsMenu
            workflowId={workflowId}
            workflowName={workflowName}
          />
          <RunButton
            workflowId={workflowId}
            triggerBody={triggerBody}
            authProfileOverride={authProfileOverride}
          />
        </div>
        <div className="space-y-2 border-b border-border px-2 py-2">
          <div>
            <Label
              htmlFor="run-auth-profile"
              className="text-[11px] font-medium"
            >
              Auth profile (this run)
            </Label>
            <Select
              value={authProfileOverride}
              onValueChange={setAuthProfileOverride}
            >
              <SelectTrigger
                id="run-auth-profile"
                className="mt-1.5 w-full text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTH_PROFILE_DEFAULT}>
                  Workflow default ({defaultProfileName})
                </SelectItem>
                <SelectItem value={AUTH_PROFILE_NONE}>None</SelectItem>
                {authProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label
              htmlFor="run-trigger-body"
              className="text-[11px] font-medium"
            >
              Run input (JSON)
            </Label>
            <Textarea
              id="run-trigger-body"
              value={triggerBody}
              onChange={(e) => setTriggerBody(e.target.value)}
              placeholder='{ "url": "https://example.com" }'
              className="mt-1.5 min-h-14 font-mono text-[11px]"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Optional. Available as{" "}
              <code className="rounded bg-muted px-1">
                {"{{ trigger.body }}"}
              </code>{" "}
              when you press Run.
            </p>
          </div>
        </div>
        <TabsList className="m-2 w-fit bg-background">
          <TabsTrigger
            value="toolbar"
            className="flex-none rounded-sm data-active:bg-accent! data-active:text-accent-foreground! data-active:shadow-none! dark:data-active:border-transparent!"
          >
            Toolbar
          </TabsTrigger>
          <TabsTrigger
            value="editor"
            className="flex-none rounded-sm data-active:bg-accent! data-active:text-accent-foreground! data-active:shadow-none! dark:data-active:border-transparent!"
          >
            Editor
          </TabsTrigger>
        </TabsList>
        <TabsContent value="toolbar" className="flex min-h-0 flex-col">
          <Palette />
        </TabsContent>
        <TabsContent value="editor" className="flex min-h-0 flex-col">
          <Inspector
            key={selected?.id}
            node={selected}
            workflowId={workflowId}
            scheduleCron={scheduleCron}
            webhookSecret={webhookSecret}
            authProfileId={authProfileId}
            authProfiles={authProfiles}
          />
        </TabsContent>
      </Tabs>
    </ResizablePanel>
  )
}
