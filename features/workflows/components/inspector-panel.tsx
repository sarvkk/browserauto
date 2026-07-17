"use client"

import { LiveView } from "@/features/workflows/components/live-view"
import { NodeIcon } from "@/features/workflows/components/node-icon"
import { SessionReplay } from "@/features/workflows/components/session-replay"
import {
  useConsoleRuns,
} from "@/features/workflows/components/workflow-runs-provider"
import type { ConsoleSelection } from "@/features/workflows/components/logs-panel"

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex size-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
      {children}
    </div>
  )
}

function ScreenshotOutput({
  url,
  rest,
}: {
  url: string
  rest: Record<string, unknown>
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Screenshot"
        className="max-h-80 w-full rounded-md border border-border object-contain bg-muted"
      />
      <pre className="font-mono text-xs">{JSON.stringify(rest, null, 2)}</pre>
    </div>
  )
}

export function InspectorPanel({ selection }: { selection: ConsoleSelection }) {
  const runs = useConsoleRuns()
  const run = runs.find((r) => r.id === selection.runId)

  if (selection.kind === "replay") {
    if (!run?.browserbaseSessionId) {
      return <Note>This recording is no longer available.</Note>
    }
    return <SessionReplay sessionId={run.browserbaseSessionId} />
  }

  if (selection.kind === "live") {
    if (!run?.browserbaseSessionId) {
      return <Note>This live view is no longer available.</Note>
    }
    return <LiveView sessionId={run.browserbaseSessionId} />
  }

  const step = run?.steps.find((s) => s.nodeId === selection.nodeId)

  if (!step) return <Note>This step is no longer available.</Note>

  const screenshotUrl =
    step.output &&
    typeof step.output === "object" &&
    step.output !== null &&
    "url" in step.output &&
    typeof (step.output as { url: unknown }).url === "string"
      ? (step.output as { url: string }).url
      : null

  return (
    <div className="flex size-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <NodeIcon type={step.type} />
        <span className="truncate text-xs font-semibold">{step.title}</span>
      </div>
      {step.error ? (
        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs text-destructive">
          {step.error}
        </pre>
      ) : screenshotUrl && step.type === "screenshot" ? (
        <ScreenshotOutput
          url={screenshotUrl}
          rest={
            Object.fromEntries(
              Object.entries(step.output as Record<string, unknown>).filter(
                ([key]) => key !== "url"
              )
            )
          }
        />
      ) : step.output !== undefined ? (
        <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs">
          {JSON.stringify(step.output, null, 2)}
        </pre>
      ) : step.status === "pending" ? (
        <Note>This step hasn&apos;t run yet.</Note>
      ) : step.status === "skipped" ? (
        <Note>This step was skipped (inactive branch).</Note>
      ) : step.status === "running" ? (
        <Note>Waiting for this step to finish…</Note>
      ) : (
        <Note>This step produced no output.</Note>
      )}
    </div>
  )
}
