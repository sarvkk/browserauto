import { isIP } from "node:net"
import { lookup } from "node:dns/promises"

const BLOCKED_HOST_SUFFIXES = [
  "amazon.com",
  "amazon.co.uk",
  "ebay.com",
  "etsy.com",
  "walmart.com",
  "target.com",
  "aliexpress.com",
  "shopify.com",
  "myshopify.com",
  "bestbuy.com",
  "wayfair.com",
  "ikea.com",
  "nike.com",
  "adidas.com",
  "zalando.com",
  "asos.com",
]

const BLOCKED_PATH_SNIPPETS = [
  "/cart",
  "/checkout",
  "/bag",
  "/product/",
  "/products/",
  "/collections/",
  "/shop/",
  "/store/",
]

function isPrivateIp(ip: string) {
  if (ip === "127.0.0.1" || ip === "::1") return true
  if (ip.startsWith("10.")) return true
  if (ip.startsWith("192.168.")) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true
  if (ip.startsWith("169.254.")) return true
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80"))
    return true
  return false
}

export async function assertSafePublicUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error("Enter a valid http(s) URL.")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed.")
  }

  if (url.username || url.password) {
    throw new Error("URLs with credentials are not allowed.")
  }

  const host = url.hostname.toLowerCase()
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0"
  ) {
    throw new Error("Local URLs are not allowed.")
  }

  if (isIP(host) && isPrivateIp(host)) {
    throw new Error("Private IP addresses are not allowed.")
  }

  if (
    BLOCKED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    )
  ) {
    throw new Error(
      "Ecommerce sites are not supported in the playground. Try a blog or portfolio."
    )
  }

  const path = `${url.pathname}${url.search}`.toLowerCase()
  if (BLOCKED_PATH_SNIPPETS.some((snippet) => path.includes(snippet))) {
    throw new Error(
      "Shop/cart pages are not supported. Open a blog post or portfolio page instead."
    )
  }

  if (!isIP(host)) {
    const records = await lookup(host, { all: true })
    if (records.length === 0) {
      throw new Error("Could not resolve that host.")
    }
    for (const record of records) {
      if (isPrivateIp(record.address)) {
        throw new Error("That host resolves to a private network address.")
      }
    }
  }

  return url
}
