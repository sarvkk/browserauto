import * as cheerio from "cheerio"

import { fetchPlaygroundPage, type FetchedPage } from "@/lib/playground/fetch-page"

const CONSENT_SELECTORS = [
  "[id*='cookie']",
  "[class*='cookie']",
  "[id*='consent']",
  "[class*='consent']",
  "[id*='gdpr']",
  "[class*='gdpr']",
  "#onetrust-banner-sdk",
  ".cc-window",
  ".osano-cm-window",
]

export type ActResult = {
  page: FetchedPage
  message: string
  removed: number
  followedUrl?: string
}

export async function actOnPage(
  page: FetchedPage,
  instruction: string
): Promise<ActResult> {
  const $ = cheerio.load(page.html)
  let removed = 0

  for (const selector of CONSENT_SELECTORS) {
    try {
      const matches = $(selector)
      removed += matches.length
      matches.remove()
    } catch {
      // Invalid selector variants are ignored.
    }
  }

  // Cheerio's case-insensitive attribute selectors aren't always available —
  // also sweep by attribute substring.
  $("[id], [class], [aria-label]").each((_, el) => {
    const node = $(el)
    const hay = `${node.attr("id") ?? ""} ${node.attr("class") ?? ""} ${node.attr("aria-label") ?? ""}`.toLowerCase()
    if (
      hay.includes("cookie") ||
      hay.includes("consent") ||
      hay.includes("gdpr") ||
      hay.includes("onetrust")
    ) {
      node.remove()
      removed += 1
    }
  })

  const lowered = instruction.toLowerCase()
  const wantsFollow =
    /click|open|follow|read more|continue|view (post|article|project)/i.test(
      instruction
    )

  let followedUrl: string | undefined
  let nextPage = page

  if (wantsFollow) {
    const link =
      $("article a[href], main a[href], .post a[href], a[href]")
        .toArray()
        .map((el) => {
          const href = $(el).attr("href")
          const text = $(el).text().replace(/\s+/g, " ").trim()
          return { href, text }
        })
        .find(({ href, text }) => {
          if (!href || href.startsWith("#") || href.startsWith("mailto:"))
            return false
          if (/read more|continue|view project|view post|full (post|article)/i.test(text))
            return true
          if (
            lowered.includes("project") &&
            /project/i.test(text + (href ?? ""))
          )
            return true
          return false
        })

    if (link?.href) {
      try {
        const absolute = new URL(link.href, page.finalUrl).toString()
        if (absolute !== page.finalUrl) {
          nextPage = await fetchPlaygroundPage(absolute)
          followedUrl = nextPage.finalUrl
        }
      } catch {
        // Keep the current page if follow fails.
      }
    }
  }

  const cleanedHtml = $.html()
  if (!followedUrl) {
    nextPage = { ...page, html: cleanedHtml }
  }

  const parts = [
    removed > 0
      ? `Removed ${removed} cookie/consent overlay node${removed === 1 ? "" : "s"}`
      : "No cookie banner nodes found",
  ]
  if (followedUrl) {
    parts.push(`Followed through to ${followedUrl}`)
  } else if (wantsFollow) {
    parts.push("No followable article/project link matched")
  }

  return {
    page: nextPage,
    message: parts.join(" · "),
    removed,
    followedUrl,
  }
}
