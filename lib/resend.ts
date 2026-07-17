import { Resend } from "resend"

let resendInstance: Resend | undefined

export function getResend() {
  if (resendInstance) return resendInstance

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set")
  }

  resendInstance = new Resend(apiKey)
  return resendInstance
}
