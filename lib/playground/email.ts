import { getResend } from "@/lib/resend"
import type { Extraction } from "@/lib/playground/extract"

export type EmailResult = {
  sent: boolean
  id?: string
  preview: { to: string; subject: string; html: string }
  message: string
}

const LABEL_COPY: Record<string, string> = {
  title: "Title",
  url: "Source",
  summary: "Summary",
  author: "Author",
  headings: "Sections",
}

function humanLabel(key: string) {
  return LABEL_COPY[key] ?? key.replaceAll("_", " ")
}

function isUrlValue(value: string) {
  return /^https?:\/\//i.test(value)
}

function buildEmailHtml(extraction: Extraction) {
  const summary =
    extraction.fields.summary?.trim() || extraction.summary?.trim() || ""

  const detailEntries = Object.entries(extraction.fields).filter(
    ([key]) => key !== "summary" && key !== "title" && key !== "url"
  )

  const detailRows = detailEntries
    .map(([key, value], index) => {
      const border =
        index === detailEntries.length - 1
          ? "border:0"
          : "border-bottom:1px solid #e2e8f0"
      const content = isUrlValue(value)
        ? `<a href="${escapeHtml(value)}" style="color:#0c1222;text-decoration:underline;word-break:break-all">${escapeHtml(value)}</a>`
        : escapeHtml(value)

      return `
        <tr>
          <td style="padding:14px 0;${border};width:112px;vertical-align:top;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;font-weight:600">
            ${escapeHtml(humanLabel(key))}
          </td>
          <td style="padding:14px 0;${border};vertical-align:top;font-size:15px;line-height:1.55;color:#0c1222">
            ${content}
          </td>
        </tr>`
    })
    .join("")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Browserauto digest</title>
</head>
<body style="margin:0;padding:0;background:#e6edf4;color:#0c1222">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e6edf4;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #c8d3e0;border-radius:16px;overflow:hidden">
          <tr>
            <td style="background:#0c1222;padding:22px 28px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#ffffff">
                    Browserauto
                  </td>
                  <td align="right" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#2ec4a7">
                    Playground digest
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:#e23b14;font-size:0;line-height:0">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;font-weight:600">
                ${escapeHtml(extraction.kind)}
              </p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;letter-spacing:-0.02em;color:#0c1222;font-weight:700">
                ${escapeHtml(extraction.title)}
              </h1>
            </td>
          </tr>
          ${
            summary
              ? `<tr>
            <td style="padding:16px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7fb;border:1px solid #e2e8f0;border-radius:12px">
                <tr>
                  <td style="padding:18px 20px">
                    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#e23b14;font-weight:700">
                      Summary
                    </p>
                    <p style="margin:0;font-size:15px;line-height:1.65;color:#334155">
                      ${escapeHtml(summary)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
              : ""
          }
          ${
            detailRows
              ? `<tr>
            <td style="padding:12px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${detailRows}
              </table>
            </td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding:20px 28px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
              <a href="${escapeHtml(extraction.url)}" style="display:inline-block;background:#e23b14;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 18px;border-radius:10px">
                Open source page
              </a>
              <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#94a3b8;word-break:break-all">
                ${escapeHtml(extraction.url)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.5;color:#94a3b8">
              Sent from the Browserauto public playground — blogs &amp; portfolios only.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function isValidEmail(to: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)
}

export async function sendPlaygroundEmail(
  to: string,
  extraction: Extraction
): Promise<EmailResult> {
  if (!isValidEmail(to)) {
    throw new Error("Enter a valid email address.")
  }

  const subject = `Playground digest: ${extraction.title}`.slice(0, 120)
  const html = buildEmailHtml(extraction)
  const preview = { to, subject, html }

  if (!process.env.RESEND_API_KEY) {
    return {
      sent: false,
      preview,
      message:
        "Email preview ready. Set RESEND_API_KEY to deliver for real.",
    }
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Browserauto Playground <playground@sarvajit.com.np>"

  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send(
      {
        from,
        to,
        subject,
        html,
      },
      {
        idempotencyKey: `playground-digest/${to}/${extraction.url}/${Date.now()}`,
      }
    )

    if (error || !data) {
      return {
        sent: false,
        preview,
        message:
          error?.message ??
          "Resend could not send. Showing preview instead.",
      }
    }

    return {
      sent: true,
      id: data.id,
      preview,
      message: `Email sent (${data.id})`,
    }
  } catch (error) {
    return {
      sent: false,
      preview,
      message:
        error instanceof Error
          ? `${error.message} — showing preview instead.`
          : "Could not send email — showing preview instead.",
    }
  }
}
