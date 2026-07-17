import type { FetchedPage } from "@/lib/playground/fetch-page"
import type { Extraction } from "@/lib/playground/extract"

export type PlaygroundSession = {
  id: string
  createdAt: number
  page: FetchedPage | null
  extraction: Extraction | null
  ip: string
}

const TTL_MS = 15 * 60 * 1000
const sessions = new Map<string, PlaygroundSession>()

function prune() {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (now - session.createdAt > TTL_MS) sessions.delete(id)
  }
}

export function createSession(ip: string): PlaygroundSession {
  prune()
  const id = crypto.randomUUID()
  const session: PlaygroundSession = {
    id,
    createdAt: Date.now(),
    page: null,
    extraction: null,
    ip,
  }
  sessions.set(id, session)
  return session
}

export function getSession(id: string): PlaygroundSession | null {
  prune()
  return sessions.get(id) ?? null
}

export function saveSession(session: PlaygroundSession) {
  sessions.set(session.id, session)
}
