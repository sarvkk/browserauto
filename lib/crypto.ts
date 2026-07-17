import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

// AES-256-GCM for org secrets. The key is a 32-byte hex string in
// SECRETS_ENCRYPTION_KEY — generate with: openssl rand -hex 32
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

function getKey(): Buffer {
  const hex = process.env.SECRETS_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)."
    )
  }
  return Buffer.from(hex, "hex")
}

// Returns `iv:authTag:ciphertext` as hex segments so the blob is text-safe.
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`
}

export function decryptSecret(blob: string): string {
  const [ivHex, tagHex, dataHex] = blob.split(":")
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted secret format")
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivHex, "hex")
  )
  decipher.setAuthTag(Buffer.from(tagHex, "hex"))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}
