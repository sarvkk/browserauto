import { browserbase } from "@/lib/browserbase"

// Login/refresh sessions stay open so the user can finish 2FA in Live View.
const LOGIN_SESSION_TIMEOUT_SECONDS = 15 * 60

function projectId() {
  return process.env.BROWSERBASE_PROJECT_ID
}

export async function createBrowserbaseContext() {
  return browserbase.contexts.create(
    projectId() ? { projectId: projectId() } : undefined
  )
}

export async function deleteBrowserbaseContext(contextId: string) {
  await browserbase.contexts.delete(contextId)
}

export async function createAuthLoginSession(contextId: string) {
  return browserbase.sessions.create({
    ...(projectId() ? { projectId: projectId() } : {}),
    keepAlive: true,
    timeout: LOGIN_SESSION_TIMEOUT_SECONDS,
    browserSettings: {
      context: {
        id: contextId,
        persist: true,
      },
    },
  })
}

export async function releaseBrowserbaseSession(sessionId: string) {
  try {
    await browserbase.sessions.update(sessionId, {
      status: "REQUEST_RELEASE",
    })
  } catch {
    // Session may already be gone — ignore so profile cleanup still proceeds.
  }
}
