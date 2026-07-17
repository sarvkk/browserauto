"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

type Status = "loading" | "ready" | "disconnected" | "error"

// Embeds a Browserbase session's live view. The debug URL is fetched through
// /api/live-views/[sessionId] (which holds the secret key); once we have it we
// iframe the debuggerFullscreenUrl. Browserbase posts browserbase-disconnected
// when the session ends — surface that instead of a blank frame.
export function LiveView({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<Status>("loading")
  const [url, setUrl] = useState<string | null>(null)

  // Reset when the session changes so a new id starts fresh.
  const [renderedSessionId, setRenderedSessionId] = useState(sessionId)
  if (sessionId !== renderedSessionId) {
    setRenderedSessionId(sessionId)
    setStatus("loading")
    setUrl(null)
  }

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch(`/api/live-views/${sessionId}`)
        if (cancelled) return
        if (!res.ok) {
          setStatus("error")
          return
        }
        const data = (await res.json()) as { url?: string }
        if (!data.url) {
          setStatus("error")
          return
        }
        setUrl(data.url)
        setStatus("ready")
      } catch {
        if (!cancelled) setStatus("error")
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data === "browserbase-disconnected") {
        setStatus("disconnected")
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  return (
    <div className="relative flex size-full items-center justify-center bg-black">
      {status === "ready" && url && (
        <iframe
          src={url}
          title="Browser live view"
          className="size-full border-0"
          sandbox="allow-same-origin allow-scripts"
          allow="clipboard-read; clipboard-write"
        />
      )}
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Opening live view…</span>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-muted-foreground">
          This live view couldn&apos;t be loaded.
        </div>
      )}
      {status === "disconnected" && (
        <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-muted-foreground">
          The browser session has ended.
        </div>
      )}
    </div>
  )
}
