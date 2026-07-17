export async function slack({
  webhookUrl,
  message,
}: {
  webhookUrl: string
  message: string
}) {
  if (!webhookUrl) throw new Error("Slack webhook URL is required")
  if (!message) throw new Error("Slack message is required")

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Slack webhook failed (${res.status}): ${text}`)
  }

  return { ok: true }
}
