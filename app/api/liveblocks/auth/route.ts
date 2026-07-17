import * as Sentry from "@sentry/nextjs"
import { auth, currentUser } from "@clerk/nextjs/server"

import { getWorkflow } from "@/features/workflows/data"
import { getLiveblocks } from "@/lib/liveblocks"

function forbidden(reason: string) {
  return Response.json({ error: "forbidden", reason }, { status: 403 })
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth()

  if (!userId || !orgId) {
    return forbidden("Unauthorized")
  }

  const user = await currentUser()

  if (!user) {
    return forbidden("Unauthorized")
  }

  const { room } = (await request.json().catch(() => ({}))) as {
    room?: string
  }

  Sentry.getIsolationScope().setAttributes({
    route: "POST /api/liveblocks/auth",
    userId,
    orgId,
    roomId: room,
  })

  // Access tokens put permissions in the token itself, so we don't depend on
  // room groupsAccesses / Liveblocks organizationId matching. Still verify the
  // workflow belongs to the active Clerk org before granting entry.
  if (room) {
    const workflow = await getWorkflow(orgId, room)
    if (!workflow) {
      Sentry.logger.warn("Liveblocks auth denied — workflow not in org", {
        userId,
        orgId,
        roomId: room,
      })
      return forbidden("No access to this room")
    }
  }

  const session = getLiveblocks().prepareSession(userId, {
    userInfo: {
      name:
        user.fullName ??
        user.username ??
        user.primaryEmailAddress?.emailAddress ??
        "Anonymous",
      avatar: user.imageUrl,
    },
  })

  if (room) {
    session.allow(room, session.FULL_ACCESS)
  }

  const { status, body } = await session.authorize()

  if (status >= 400) {
    Sentry.logger.error("Liveblocks session authorize failed", {
      userId,
      orgId,
      roomId: room,
      status,
    })
  } else {
    Sentry.logger.info("Liveblocks session authorized", {
      userId,
      orgId,
      roomId: room,
      status,
    })
  }

  return new Response(body, { status })
}
