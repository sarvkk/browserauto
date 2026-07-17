import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { listAuthProfiles } from "@/features/workflows/data"
import { AuthProfilesManager } from "@/features/workflows/components/auth-profiles-manager"

export default async function AuthProfilesPage() {
  const { orgId } = await auth()
  if (!orgId) redirect("/home")

  const profiles = await listAuthProfiles(orgId)

  return <AuthProfilesManager initialProfiles={profiles} />
}
