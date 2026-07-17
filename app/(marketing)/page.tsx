import type { Metadata } from "next"
import { Bricolage_Grotesque, IBM_Plex_Sans } from "next/font/google"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { LandingPage } from "@/components/landing/landing-page"
import { cn } from "@/lib/utils"

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-landing-display",
})

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-landing-body",
})

export const metadata: Metadata = {
  title: "Browserauto — Visual browser automation",
  description:
    "Build AI-powered browser workflows on a canvas. Act, extract, branch, and notify — then watch every run live.",
  openGraph: {
    title: "Browserauto — Visual browser automation",
    description:
      "Visual workflows that drive real browsers. Compose AI act, extract, and branch steps — then run them in the cloud.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browserauto — Visual browser automation",
    description:
      "Visual workflows that drive real browsers. Compose AI act, extract, and branch steps — then run them in the cloud.",
  },
}

export default async function Page() {
  const { userId } = await auth()
  if (userId) {
    redirect("/home")
  }

  return (
    <div
      className={cn(
        "landing font-landing antialiased",
        display.variable,
        body.variable
      )}
    >
      <LandingPage />
    </div>
  )
}
