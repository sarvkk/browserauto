"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Check,
  Globe,
  Loader2,
  Mail,
  Play,
  Pointer,
  RotateCcw,
  ScanText,
  type LucideIcon,
} from "lucide-react"

type NodeId = "open" | "act" | "extract" | "email"

type PlayNode = {
  id: NodeId
  label: string
  icon: LucideIcon
  accent: string
  fieldLabel: string
  placeholder: string
}

const NODES: PlayNode[] = [
  {
    id: "open",
    label: "Open URL",
    icon: Globe,
    accent: "bg-emerald-500",
    fieldLabel: "URL",
    placeholder: "https://your-blog-or-portfolio.com",
  },
  {
    id: "act",
    label: "Act",
    icon: Pointer,
    accent: "bg-violet-500",
    fieldLabel: "Instruction",
    placeholder: "Dismiss cookie banner",
  },
  {
    id: "extract",
    label: "Extract",
    icon: ScanText,
    accent: "bg-sky-500",
    fieldLabel: "Instruction",
    placeholder: "Extract the title and summary",
  },
  {
    id: "email",
    label: "Email",
    icon: Mail,
    accent: "bg-rose-500",
    fieldLabel: "To",
    placeholder: "you@company.com",
  },
]

type Values = {
  open: string
  act: string
  extract: string
  email: string
}

const DEFAULTS: Values = {
  open: "https://overreacted.io/a-complete-guide-to-useeffect/",
  act: "Dismiss any cookie banner if present",
  extract: "Extract the title, author, and a short summary",
  email: "",
}

type RunPhase = "idle" | "running" | "done" | "error"

type LogLine = { id: string; text: string; tone?: "ok" | "muted" | "error" }

type BrowserFrame =
  | { kind: "blank" }
  | { kind: "loading"; url: string }
  | {
      kind: "page"
      title: string
      excerpt: string
      siteKind: string
      highlight?: boolean
    }
  | { kind: "acting"; label: string }
  | { kind: "extracted"; fields: Record<string, string> }
  | {
      kind: "emailed"
      to: string
      sent: boolean
      subject: string
    }

type ApiError = { error?: string }

async function playgroundFetch<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/playground", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await response.json()) as T & ApiError
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`)
  }
  return data
}

export function Playground() {
  const [values, setValues] = useState<Values>(DEFAULTS)
  const [selected, setSelected] = useState<NodeId>("open")
  const [phase, setPhase] = useState<RunPhase>("idle")
  const [activeStep, setActiveStep] = useState<NodeId | null>(null)
  const [completed, setCompleted] = useState<Set<NodeId>>(new Set())
  const [logs, setLogs] = useState<LogLine[]>([
    {
      id: "ready",
      text: "real fetch playground · blogs & portfolios only",
      tone: "muted",
    },
  ])
  const [browser, setBrowser] = useState<BrowserFrame>({ kind: "blank" })
  const [sessionId, setSessionId] = useState<string | null>(null)

  const selectedNode = NODES.find((n) => n.id === selected)!

  function updateValue(id: NodeId, next: string) {
    setValues((prev) => ({ ...prev, [id]: next }))
  }

  function pushLog(text: string, tone?: LogLine["tone"]) {
    setLogs((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, text, tone },
    ])
  }

  function reset() {
    setPhase("idle")
    setActiveStep(null)
    setCompleted(new Set())
    setBrowser({ kind: "blank" })
    setSessionId(null)
    setLogs([
      {
        id: `reset-${Date.now()}`,
        text: "playground reset · ready to run again",
        tone: "muted",
      },
    ])
  }

  async function run() {
    if (!values.open.trim()) {
      pushLog("open-url needs a URL", "error")
      return
    }
    if (!values.email.trim()) {
      setSelected("email")
      pushLog("add an email address before running", "error")
      return
    }

    setPhase("running")
    setCompleted(new Set())
    setActiveStep(null)
    setLogs([])
    setBrowser({ kind: "blank" })
    setSessionId(null)

    try {
      // Open
      setActiveStep("open")
      setBrowser({ kind: "loading", url: values.open })
      pushLog(`open-url → ${values.open}`)
      const opened = await playgroundFetch<{
        sessionId: string
        url: string
        title: string
        kind: string
        excerpt: string
        message: string
      }>({ action: "open", url: values.open })
      setSessionId(opened.sessionId)
      setBrowser({
        kind: "page",
        title: opened.title,
        excerpt: opened.excerpt || "Page loaded.",
        siteKind: opened.kind,
      })
      pushLog(`${opened.message} · ${opened.url}`, "ok")
      setCompleted((prev) => new Set(prev).add("open"))

      // Act
      setActiveStep("act")
      setBrowser({ kind: "acting", label: values.act })
      pushLog(`act → ${values.act}`)
      const acted = await playgroundFetch<{
        sessionId: string
        url: string
        title: string
        kind: string
        excerpt: string
        message: string
      }>({
        action: "act",
        sessionId: opened.sessionId,
        instruction: values.act,
      })
      setBrowser({
        kind: "page",
        title: acted.title,
        excerpt: acted.excerpt || "Ready to extract.",
        siteKind: acted.kind,
      })
      pushLog(acted.message, "ok")
      setCompleted((prev) => new Set(prev).add("act"))

      // Extract
      setActiveStep("extract")
      setBrowser({
        kind: "page",
        title: acted.title,
        excerpt: acted.excerpt || "",
        siteKind: acted.kind,
        highlight: true,
      })
      pushLog(`extract → ${values.extract}`)
      const extracted = await playgroundFetch<{
        extraction: { fields: Record<string, string>; title: string }
        message: string
      }>({
        action: "extract",
        sessionId: opened.sessionId,
        instruction: values.extract,
      })
      setBrowser({ kind: "extracted", fields: extracted.extraction.fields })
      pushLog(
        `extract → ${JSON.stringify(extracted.extraction.fields)}`,
        "ok"
      )
      setCompleted((prev) => new Set(prev).add("extract"))

      // Email
      setActiveStep("email")
      pushLog(`email → to ${values.email}`)
      const emailed = await playgroundFetch<{
        sent: boolean
        id?: string
        message: string
        preview: { to: string; subject: string }
      }>({
        action: "email",
        sessionId: opened.sessionId,
        to: values.email,
      })
      setBrowser({
        kind: "emailed",
        to: emailed.preview.to,
        sent: emailed.sent,
        subject: emailed.preview.subject,
      })
      pushLog(emailed.message, emailed.sent ? "ok" : "muted")
      setCompleted((prev) => new Set(prev).add("email"))

      setActiveStep(null)
      setPhase("done")
      pushLog("run complete", "ok")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Playground run failed"
      pushLog(message, "error")
      setPhase("error")
      setActiveStep(null)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-(--landing-ink)/12 bg-white/75 shadow-[0_28px_80px_-40px_rgba(12,18,34,0.45)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--landing-ink)/10 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-semibold tracking-tight">
              Playground
            </span>
            <span className="rounded-md bg-(--landing-live)/15 px-2 py-0.5 font-mono text-[10px] text-(--landing-live) uppercase">
              live fetch
            </span>
            <span className="rounded-md bg-(--landing-ink)/6 px-2 py-0.5 font-mono text-[10px] text-(--landing-ink)/45 uppercase">
              blogs &amp; portfolios
            </span>
          </div>
          <p className="mt-0.5 text-xs text-(--landing-ink)/50">
            Fetches real pages (no Browserbase). Ecommerce/shop URLs are
            blocked.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={phase === "running"}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-(--landing-ink)/12 bg-white px-3 text-xs font-medium text-(--landing-ink)/70 transition-colors hover:bg-(--landing-paper) disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={phase === "running"}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-(--landing-signal) px-3.5 text-xs font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            {phase === "running" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5 fill-current" />
            )}
            {phase === "running"
              ? "Running…"
              : phase === "done" || phase === "error"
                ? "Run again"
                : "Run workflow"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
        <div className="border-b border-(--landing-ink)/10 lg:border-r lg:border-b-0">
          <div className="relative min-h-72 bg-[linear-gradient(to_right,var(--landing-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--landing-grid)_1px,transparent_1px)] bg-size-[36px_36px] p-5 sm:p-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,transparent_0%,rgba(230,237,244,0.85)_78%)]" />
            <div className="relative flex flex-col items-stretch gap-0">
              {NODES.map((node, index) => {
                const Icon = node.icon
                const isSelected = selected === node.id
                const isActive = activeStep === node.id
                const isDone = completed.has(node.id)
                return (
                  <div key={node.id} className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => setSelected(node.id)}
                      disabled={phase === "running"}
                      className={`group flex w-full max-w-sm items-center gap-3 rounded-xl border bg-white/95 px-3.5 py-3 text-left shadow-[0_10px_28px_-20px_rgba(12,18,34,0.5)] transition-[border-color,box-shadow,transform] ${
                        isSelected
                          ? "border-(--landing-signal) ring-2 ring-(--landing-signal)/20"
                          : "border-(--landing-ink)/10 hover:border-(--landing-ink)/25"
                      } ${isActive ? "scale-[1.02] border-(--landing-live) ring-2 ring-(--landing-live)/25" : ""}`}
                    >
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-white ${node.accent}`}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold tracking-tight">
                          {node.label}
                        </span>
                        <span className="block truncate font-mono text-[10px] text-(--landing-ink)/45">
                          {values[node.id] || node.placeholder}
                        </span>
                      </span>
                      <span className="shrink-0">
                        {isDone ? (
                          <Check className="size-4 text-(--landing-live)" />
                        ) : isActive ? (
                          <Loader2 className="size-4 animate-spin text-(--landing-live)" />
                        ) : (
                          <span className="font-mono text-[10px] text-(--landing-ink)/30">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        )}
                      </span>
                    </button>
                    {index < NODES.length - 1 ? (
                      <div
                        className={`my-1 h-5 w-px ${
                          completed.has(node.id)
                            ? "bg-(--landing-live)"
                            : "bg-(--landing-ink)/20"
                        }`}
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-(--landing-ink)/10 px-4 py-4 sm:px-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <label
                htmlFor={`play-field-${selected}`}
                className="text-[11px] font-semibold tracking-wide text-(--landing-ink)/45 uppercase"
              >
                {selectedNode.label} · {selectedNode.fieldLabel}
              </label>
              {sessionId ? (
                <span className="truncate font-mono text-[10px] text-(--landing-ink)/30">
                  {sessionId.slice(0, 8)}
                </span>
              ) : null}
            </div>
            {selectedNode.id === "act" || selectedNode.id === "extract" ? (
              <textarea
                id={`play-field-${selected}`}
                rows={2}
                disabled={phase === "running"}
                value={values[selected]}
                onChange={(e) => updateValue(selected, e.target.value)}
                placeholder={selectedNode.placeholder}
                className="w-full resize-none rounded-lg border border-(--landing-ink)/12 bg-white px-3 py-2 text-sm text-(--landing-ink) outline-none focus:border-(--landing-signal)/50 focus:ring-2 focus:ring-(--landing-signal)/15 disabled:opacity-60"
              />
            ) : (
              <input
                id={`play-field-${selected}`}
                type={selected === "email" ? "email" : "url"}
                disabled={phase === "running"}
                value={values[selected]}
                onChange={(e) => updateValue(selected, e.target.value)}
                placeholder={selectedNode.placeholder}
                className="w-full rounded-lg border border-(--landing-ink)/12 bg-white px-3 py-2 text-sm text-(--landing-ink) outline-none focus:border-(--landing-signal)/50 focus:ring-2 focus:ring-(--landing-signal)/15 disabled:opacity-60"
              />
            )}
            {selected === "open" ? (
              <p className="mt-2 text-[11px] leading-relaxed text-(--landing-ink)/45">
                Works on blogs, essays, and portfolio sites. Amazon, Shopify,
                carts, and product pages are rejected.
              </p>
            ) : null}
            {selected === "email" ? (
              <p className="mt-2 text-[11px] leading-relaxed text-(--landing-ink)/45">
                Without RESEND_API_KEY you still get a full preview. With Resend
                sandbox, delivery usually only works to your own inbox.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-80 flex-col bg-(--landing-ink) text-(--landing-paper)">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
            <div className="ml-2 flex flex-1 items-center gap-2 truncate rounded-md bg-white/8 px-2.5 py-1 font-mono text-[10px] text-white/50">
              {phase === "running" ? (
                <span className="landing-pulse size-1.5 shrink-0 rounded-full bg-(--landing-live)" />
              ) : null}
              <span className="truncate">
                {browser.kind === "blank"
                  ? "about:blank"
                  : browser.kind === "loading"
                    ? browser.url
                    : browser.kind === "emailed"
                      ? browser.sent
                        ? "mail://sent"
                        : "mail://preview"
                      : values.open}
              </span>
            </div>
          </div>

          <div className="relative min-h-44 flex-1 p-4">
            <BrowserPreview frame={browser} />
          </div>

          <div className="border-t border-white/10">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="font-mono text-[10px] tracking-wide text-white/35 uppercase">
                Logs
              </span>
              {phase === "done" ? (
                <Link
                  href="/sign-up"
                  className="text-[11px] font-semibold text-(--landing-live) hover:underline"
                >
                  Build this for real →
                </Link>
              ) : null}
            </div>
            <div className="max-h-36 space-y-1.5 overflow-y-auto px-4 pb-4 font-mono text-[11px] leading-relaxed">
              {logs.map((line) => (
                <div
                  key={line.id}
                  className={`flex gap-2 ${
                    line.tone === "ok"
                      ? "text-(--landing-live)"
                      : line.tone === "muted"
                        ? "text-white/35"
                        : line.tone === "error"
                          ? "text-red-300"
                          : "text-white/55"
                  }`}
                >
                  <span className="shrink-0 text-white/20">→</span>
                  <span className="break-all">{line.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BrowserPreview({ frame }: { frame: BrowserFrame }) {
  if (frame.kind === "blank") {
    return (
      <div className="flex h-full min-h-36 items-center justify-center text-center">
        <p className="max-w-[16rem] text-sm text-white/35">
          Idle. Run against a blog or portfolio URL to fetch a real page.
        </p>
      </div>
    )
  }

  if (frame.kind === "loading") {
    return (
      <div className="flex h-full min-h-36 flex-col items-center justify-center gap-3">
        <Loader2 className="size-5 animate-spin text-(--landing-live)" />
        <p className="font-mono text-[11px] text-white/45">Fetching page…</p>
      </div>
    )
  }

  if (frame.kind === "acting") {
    return (
      <div className="flex h-full min-h-36 flex-col justify-center gap-4">
        <div className="h-2.5 w-24 rounded-full bg-white/15" />
        <div className="h-2 w-2/3 rounded-full bg-white/10" />
        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-(--landing-live)/40 bg-(--landing-live)/10 px-3 py-2 text-xs text-(--landing-live)">
          <Pointer className="size-3.5" />
          Acting: {frame.label}
        </div>
      </div>
    )
  }

  if (frame.kind === "extracted") {
    return (
      <div className="flex h-full min-h-36 flex-col justify-center">
        <div className="rounded-xl border border-(--landing-live)/30 bg-(--landing-live)/8 p-4">
          <div className="text-[10px] font-semibold tracking-wide text-(--landing-live)/80 uppercase">
            Extraction
          </div>
          <pre className="mt-2 max-h-40 overflow-auto font-mono text-[11px] leading-relaxed text-white/80">
            {JSON.stringify(frame.fields, null, 2)}
          </pre>
        </div>
      </div>
    )
  }

  if (frame.kind === "emailed") {
    return (
      <div className="flex h-full min-h-36 flex-col items-center justify-center gap-3 text-center">
        <Mail className="size-6 text-(--landing-live)" />
        <div>
          <p className="text-sm font-medium text-white/80">
            {frame.sent ? "Email sent" : "Email preview ready"}
          </p>
          <p className="mt-1 font-mono text-[11px] text-white/40">{frame.to}</p>
          <p className="mt-2 max-w-xs text-[11px] text-white/35">{frame.subject}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-36 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-md bg-white/10 px-2 py-1 font-mono text-[10px] text-white/50 uppercase">
          {frame.siteKind}
        </span>
      </div>
      <div
        className={`rounded-xl border p-4 transition-colors ${
          frame.highlight
            ? "border-(--landing-live)/50 bg-(--landing-live)/10"
            : "border-white/10 bg-white/5"
        }`}
      >
        <p className="font-display text-lg font-semibold tracking-tight text-white">
          {frame.title}
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-white/55">
          {frame.excerpt}
        </p>
      </div>
    </div>
  )
}
