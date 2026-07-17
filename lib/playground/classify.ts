import * as cheerio from "cheerio"

const ECOMMERCE_PATTERNS = [
  /add to cart/i,
  /buy now/i,
  /shop now/i,
  /free shipping/i,
  /shopping cart/i,
  /myshopify/i,
  /cdn\.shopify/i,
  /product-price/i,
  /data-product-id/i,
  /woocommerce/i,
  /\$\d+\.\d{2}/,
]

const BLOG_PORTFOLIO_PATTERNS = [
  /<article[\s>]/i,
  /rel=["']author["']/i,
  /itemprop=["']headline["']/i,
  /blog/i,
  /portfolio/i,
  /about me/i,
  /projects?/i,
  /writing/i,
  /newsletter/i,
  /posted on/i,
  /published/i,
  /entry-content/i,
  /post-content/i,
]

export type PageClass =
  | { ok: true; kind: "blog" | "portfolio" | "article"; score: number }
  | { ok: false; reason: string }

export function classifyPage(html: string, url: string): PageClass {
  let shopHits = 0
  for (const pattern of ECOMMERCE_PATTERNS) {
    if (pattern.test(html)) shopHits += 1
  }

  let contentHits = 0
  for (const pattern of BLOG_PORTFOLIO_PATTERNS) {
    if (pattern.test(html)) contentHits += 1
  }

  const $ = cheerio.load(html)
  const text = $("body").text().replace(/\s+/g, " ").trim()
  const wordCount = text.split(" ").filter(Boolean).length
  const hasArticle = $("article").length > 0 || $("main").length > 0
  const headingCount = $("h1, h2").length

  if (shopHits >= 3 && contentHits <= 1) {
    return {
      ok: false,
      reason:
        "This looks like an ecommerce page. The playground only supports blogs, writing sites, and portfolios.",
    }
  }

  const looksLikeContent =
    contentHits >= 1 ||
    hasArticle ||
    (wordCount >= 120 && headingCount >= 1) ||
    /blog|portfolio|writing|notes|essays/i.test(url)

  if (!looksLikeContent && shopHits >= 1) {
    return {
      ok: false,
      reason:
        "Could not confirm this is a blog or portfolio. Try a personal site, essay, or blog post.",
    }
  }

  if (!looksLikeContent && wordCount < 80) {
    return {
      ok: false,
      reason:
        "Not enough readable content. Open a blog post or portfolio page with text.",
    }
  }

  const kind = /portfolio|projects?/i.test(html + url)
    ? "portfolio"
    : hasArticle || contentHits >= 2
      ? "article"
      : "blog"

  return { ok: true, kind, score: contentHits * 2 + (hasArticle ? 3 : 0) }
}
