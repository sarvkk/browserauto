"use client"

import { useTransition } from "react"
import { Lock, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createWorkflowAction } from "@/features/workflows/actions"
import { generateSlug } from "@/features/workflows/lib/generate-slug"
import { useProPlan } from "@/features/workflows/hooks/use-pro-plan"

export function NewWorkflowButton() {
  const [isPending, startTransition] = useTransition()
  const { isLoaded, isPro, goToUpgrade } = useProPlan()
  const locked = isLoaded && !isPro

  const handleCreateWorkflow = () => {
    if (locked) {
      goToUpgrade()
      return
    }
    startTransition(async () => {
      await createWorkflowAction(generateSlug())
    })
  }

  return (
    <Button onClick={handleCreateWorkflow} disabled={isPending}>
      {locked ? <Lock /> : <PlusIcon />}
      {locked ? "Upgrade to create" : "New workflow"}
    </Button>
  )
}
