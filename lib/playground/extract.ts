import * as cheerio from "cheerio"

import type { FetchedPage } from "@/lib/playground/fetch-page"

export type Extraction = {
  title: string
  summary: string
  headings: string[]
  url: string
  kind: FetchedPage["kind"]
  fields: Record<string, string>
}

export function extractFromPage(
  page: FetchedPage,
  instruction: string
): Extraction {
  const $ = cheerio.load(page.html)
  $("script, style, noscript, svg, iframe").remove()

  const title =
    $("meta[property='og:title']").attr("content")?.trim() ||
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    page.title

  const paragraphs = $("article p, main p, .post-content p, .entry-content p, p")
    .toArray()
    .map((el) => $(el).text().replace(/\s+/g, " ").trim())
    .filter((t) => {
      if (t.length < 40 || t.length > 800) return false
      if (/vulnerabilit|cookie|subscribe|sign up|newsletter|©|all rights/i.test(t))
        return false
      return true
    })

  const summary = paragraphs.slice(0, 3).join(" ").slice(0, 600)

  const headings = $("h2, h3")
    .toArray()
    .map((el) => $(el).text().replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 8)

  const fields: Record<string, string> = {
    title,
    url: page.finalUrl,
  }

  const lower = instruction.toLowerCase()
  if (/summary|excerpt|about|description/.test(lower) || !instruction.trim()) {
    fields.summary = summary || page.excerpt
  }
  if (/heading|section|outline|topics?/.test(lower)) {
    fields.headings = headings.join(" · ")
  }
  if (/author/.test(lower)) {
    const author =
      $("meta[name='author']").attr("content")?.trim() ||
      $("[rel='author']").first().text().replace(/\s+/g, " ").trim() ||
      $("[itemprop='author']").first().text().replace(/\s+/g, " ").trim()
    if (author) fields.author = author
  }
  if (/title/.test(lower) || Object.keys(fields).length === 2) {
    fields.title = title
  }
  // Always include a readable body snippet for digests.
  if (!fields.summary) {
    fields.summary = summary || page.excerpt || title
  }

  return {
    title,
    summary: fields.summary,
    headings,
    url: page.finalUrl,
    kind: page.kind,
    fields,
  }
}
