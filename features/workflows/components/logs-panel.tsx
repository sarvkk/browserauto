"use client"

import { useMemo, useState, useTransition } from "react"
import prettyMilliseconds from "pretty-ms"
import {
  Download,
  Eye,
  Lock,
  MonitorPlay,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import { useParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { NodeIcon } from "@/features/workflows/components/node-icon"
import { useProPlan } from "@/features/workflows/hooks/use-pro-plan"
import {
  useConsoleRuns,
  type ConsoleRun,
} from "@/features/workflows/components/workflow-runs-provider"
import { retryWorkflowRunAction } from "@/features/workflows/actions"
import type { RunStep } from "@/features/workflows/tasks/run-workflow"

export interface StepSelection {
  kind: "step"
  runId: string
  nodeId: string
}

export interface ReplaySelection {
  kind: "replay"
  runId: string
}

export interface LiveSelection {
  kind: "live"
  runId: string
}

export type ConsoleSelection = StepSelection | ReplaySelection | LiveSelection

type StatusFilter = "all" | "COMPLETED" | "FAILED" | "CANCELED" | "live"

function StepRow({
  run,
  step,
  isSelected,
  onSelect,
}: {
  run: ConsoleRun
  step: RunStep
  isSelected: boolean
  onSelect: (selection: StepSelection) => void
}) {
  const isRunning = step.status === "running" && run.isLive
  const isFailed = step.status === "failed"
  const isInactive = step.status === "pending" || step.status === "skipped"

  return (
    <button
      type="button"
      onClick={() => onSelect({ kind: "step", runId: run.id, nodeId: step.nodeId })}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent",
        isSelected && "bg-accent",
        isInactive && "opacity-50"
      )}
    >
      <NodeIcon type={step.type} running={isRunning} />
      <span className={cn("truncate font-medium", isFailed && "text-destructive")}>
        {step.title}
        {step.status === "skipped" ? " (skipped)" : ""}
      </span>
      {step.durationMs != null && (
        <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
          {prettyMilliseconds(step.durationMs)}
        </span>
      )}
    </button>
  )
}

function ReplayRow({
  run,
  isSelected,
  onSelect,
}: {
  run: ConsoleRun
  isSelected: boolean
  onSelect: (selection: ReplaySelection) => void
}) {
  const { isLoaded, isPro, goToUpgrade } = useProPlan()
  const isLocked = isLoaded && !isPro

  return (
    <button
      type="button"
      onClick={() =>
        isLocked ? goToUpgrade() : onSelect({ kind: "replay", runId: run.id })
      }
      title={isLocked ? "Upgrade to Pro to watch replays" : undefined}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent",
        isSelected && "bg-accent"
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <MonitorPlay className="size-3.5" />
      </span>
      <span className="truncate font-medium">Replay</span>
      {isLocked && (
        <Lock className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
      )}
    </button>
  )
}

function LiveViewRow({
  run,
  isSelected,
  onSelect,
}: {
  run: ConsoleRun
  isSelected: boolean
  onSelect: (selection: LiveSelection) => void
}) {
  const { isLoaded, isPro, goToUpgrade } = useProPlan()
  const isLocked = isLoaded && !isPro

  return (
    <button
      type="button"
      onClick={() =>
        isLocked ? goToUpgrade() : onSelect({ kind: "live", runId: run.id })
      }
      title={isLocked ? "Upgrade to Pro to watch live view" : undefined}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent",
        isSelected && "bg-accent"
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Eye className="size-3.5" />
      </span>
      <span className="truncate font-medium">Live view</span>
      {isLocked && (
        <Lock className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
      )}
    </button>
  )
}

function matchesFilter(run: ConsoleRun, filter: StatusFilter): boolean {
  if (filter === "all") return true
  if (filter === "live") return run.isLive
  return run.status === filter
}

function exportRun(run: ConsoleRun) {
  const payload = {
    id: run.id,
    status: run.status,
    createdAt: run.createdAt.toISOString(),
    browserbaseSessionId: run.browserbaseSessionId,
    error: run.error,
    steps: run.steps,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `run-${run.id}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function LogsPanel({
  selected,
  onSelect,
}: {
  selected: ConsoleSelection | null
  onSelect: (selection: ConsoleSelection) => void
}) {
  const runs = useConsoleRuns()
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [isPending, startTransition] = useTransition()
  const params = useParams<{ id: string }>()
  const workflowId = params.id

  const filtered = useMemo(
    () => runs.filter((run) => matchesFilter(run, filter)),
    [runs, filter]
  )

  if (runs.length === 0) {
    return (
      <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
        No runs yet
      </div>
    )
  }

  return (
    <div className="flex size-full flex-col">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        {(
          [
            ["all", "All"],
            ["live", "Live"],
            ["COMPLETED", "Done"],
            ["FAILED", "Failed"],
            ["CANCELED", "Canceled"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent",
              filter === value && "bg-accent text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
            No runs match this filter
          </div>
        ) : (
          filtered.map((run) => (
            <div key={run.id} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                <span>{run.createdAt.toLocaleTimeString()}</span>
                <span className="lowercase">{run.status}</span>
                <div className="ml-auto flex items-center gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    title="Export JSON"
                    onClick={() => exportRun(run)}
                  >
                    <Download className="size-3" />
                  </Button>
                  {run.status === "FAILED" && workflowId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6"
                      title="Retry"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          try {
                            await retryWorkflowRunAction(workflowId)
                            toast.success("Retry started")
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Couldn't retry"
                            )
                          }
                        })
                      }}
                    >
                      <RotateCcw className="size-3" />
                    </Button>
                  )}
                </div>
              </div>
              {run.steps.map((step) => (
                <StepRow
                  key={step.nodeId}
                  run={run}
                  step={step}
                  isSelected={
                    selected?.kind === "step" &&
                    selected.runId === run.id &&
                    selected.nodeId === step.nodeId
                  }
                  onSelect={onSelect}
                />
              ))}
              {run.browserbaseSessionId && run.isLive && (
                <LiveViewRow
                  run={run}
                  isSelected={
                    selected?.kind === "live" && selected.runId === run.id
                  }
                  onSelect={onSelect}
                />
              )}
              {run.browserbaseSessionId && !run.isLive && (
                <ReplayRow
                  run={run}
                  isSelected={
                    selected?.kind === "replay" && selected.runId === run.id
                  }
                  onSelect={onSelect}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
