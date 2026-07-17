import { NextResponse } from "next/server"
import { z } from "zod"

import { actOnPage } from "@/lib/playground/act"
import { sendPlaygroundEmail } from "@/lib/playground/email"
import { extractFromPage } from "@/lib/playground/extract"
import { fetchPlaygroundPage } from "@/lib/playground/fetch-page"
import { clientIp, rateLimit } from "@/lib/playground/rate-limit"
import {
  createSession,
  getSession,
  saveSession,
} from "@/lib/playground/session"

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("open"),
    url: z.string().min(1).max(2000),
    sessionId: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal("act"),
    sessionId: z.string().uuid(),
    instruction: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal("extract"),
    sessionId: z.string().uuid(),
    instruction: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal("email"),
    sessionId: z.string().uuid(),
    to: z.string().min(3).max(200),
  }),
])

export async function POST(request: Request) {
  const ip = clientIp(request)
  const limited = rateLimit(`playground:${ip}`, 30, 60 * 60 * 1000)
  if (!limited.ok) {
    return NextResponse.json(
      {
        error: `Rate limit reached. Try again in ${limited.retryAfterSec}s.`,
      },
      { status: 429 }
    )
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const body = parsed.data

    if (body.action === "open") {
      const page = await fetchPlaygroundPage(body.url)
      const session = body.sessionId
        ? getSession(body.sessionId)
        : null
      const active = session ?? createSession(ip)
      active.page = page
      active.extraction = null
      saveSession(active)

      return NextResponse.json({
        sessionId: active.id,
        url: page.finalUrl,
        title: page.title,
        kind: page.kind,
        excerpt: page.excerpt,
        message: `Opened ${page.kind} page`,
      })
    }

    const session = getSession(body.sessionId)
    if (!session?.page) {
      return NextResponse.json(
        { error: "Session expired. Run Open URL again." },
        { status: 400 }
      )
    }

    if (body.action === "act") {
      const result = await actOnPage(session.page, body.instruction)
      session.page = result.page
      saveSession(session)
      return NextResponse.json({
        sessionId: session.id,
        url: result.page.finalUrl,
        title: result.page.title,
        kind: result.page.kind,
        excerpt: result.page.excerpt,
        message: result.message,
        followedUrl: result.followedUrl ?? null,
        removed: result.removed,
      })
    }

    if (body.action === "extract") {
      const extraction = extractFromPage(session.page, body.instruction)
      session.extraction = extraction
      saveSession(session)
      return NextResponse.json({
        sessionId: session.id,
        extraction,
        message: "Extraction complete",
      })
    }

    const emailLimited = rateLimit(`playground-email:${ip}`, 5, 60 * 60 * 1000)
    if (!emailLimited.ok) {
      return NextResponse.json(
        {
          error: `Email rate limit reached. Try again in ${emailLimited.retryAfterSec}s.`,
        },
        { status: 429 }
      )
    }

    if (!session.extraction) {
      return NextResponse.json(
        { error: "Extract something before emailing." },
        { status: 400 }
      )
    }

    const email = await sendPlaygroundEmail(body.to, session.extraction)
    return NextResponse.json({
      sessionId: session.id,
      ...email,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Playground step failed."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
