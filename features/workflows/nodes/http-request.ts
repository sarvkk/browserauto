export async function httpRequest({
  url,
  method,
  headers,
  body,
}: {
  url: string
  method: string
  headers: string
  body: string
}) {
  if (!url) throw new Error("URL is required")

  let parsedHeaders: Record<string, string> = {}
  if (headers.trim()) {
    try {
      const value = JSON.parse(headers) as unknown
      if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
      ) {
        throw new Error("Headers must be a JSON object")
      }
      parsedHeaders = Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, String(v)])
      )
    } catch (error) {
      throw new Error(
        `Invalid headers JSON: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  const verb = (method || "GET").toUpperCase()
  const init: RequestInit = {
    method: verb,
    headers: parsedHeaders,
  }

  if (body.trim() && verb !== "GET" && verb !== "HEAD") {
    init.body = body
    if (!parsedHeaders["Content-Type"] && !parsedHeaders["content-type"]) {
      init.headers = { ...parsedHeaders, "Content-Type": "application/json" }
    }
  }

  const res = await fetch(url, init)
  const text = await res.text()
  let parsed: unknown = text
  try {
    parsed = JSON.parse(text)
  } catch {
    // Keep raw text when the body isn't JSON.
  }

  return { status: res.status, body: parsed }
}
