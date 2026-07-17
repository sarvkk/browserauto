import * as cheerio from "cheerio"

import { assertSafePublicUrl } from "@/lib/playground/safe-url"
import { classifyPage } from "@/lib/playground/classify"

export type FetchedPage = {
  url: string
  finalUrl: string
  title: string
  html: string
  kind: "blog" | "portfolio" | "article"
  excerpt: string
}

export async function fetchPlaygroundPage(rawUrl: string): Promise<FetchedPage> {
  const url = await assertSafePublicUrl(rawUrl)

  const response = await fetch(url.toString(), {
    redirect: "follow",
    headers: {
      "user-agent":
        "BrowserautoPlayground/1.0 (+https://browserauto.local; blog/portfolio demo)",
      accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(12_000),
  })

  if (!response.ok) {
    throw new Error(`Could not open URL (HTTP ${response.status}).`)
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error("That URL did not return an HTML page.")
  }

  const finalUrl = response.url || url.toString()
  // Re-check after redirects
  await assertSafePublicUrl(finalUrl)

  const html = await response.text()
  if (html.length > 1_500_000) {
    throw new Error("Page is too large for the playground.")
  }

  const classification = classifyPage(html, finalUrl)
  if (!classification.ok) {
    throw new Error(classification.reason)
  }

  const $ = cheerio.load(html)
  $("script, style, noscript, iframe").remove()
  const title =
    $("meta[property='og:title']").attr("content")?.trim() ||
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    finalUrl

  const excerpt = $("article p, main p, p")
    .toArray()
    .map((el) => $(el).text().replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 40)
    .slice(0, 2)
    .join(" ")
    .slice(0, 280)

  return {
    url: url.toString(),
    finalUrl,
    title,
    html,
    kind: classification.kind,
    excerpt,
  }
}
