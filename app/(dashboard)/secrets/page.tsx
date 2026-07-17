import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { listOrgSecretNames } from "@/features/workflows/data"
import { SecretsManager } from "@/features/workflows/components/secrets-manager"

export default async function SecretsPage() {
  const { orgId } = await auth()
  if (!orgId) redirect("/")

  const secrets = await listOrgSecretNames(orgId)

  return <SecretsManager initialSecrets={secrets} />
}
