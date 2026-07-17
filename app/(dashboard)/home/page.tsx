"use client"

import { useTransition } from "react"
import { Mail, GitBranch, ScanText, Repeat } from "lucide-react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { NewWorkflowButton } from "@/features/workflows/components/new-workflow-button"
import { createWorkflowFromTemplateAction } from "@/features/workflows/actions"
import type { WorkflowTemplateId } from "@/features/workflows/templates"

const templates: {
  id: WorkflowTemplateId
  title: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    id: "open-extract",
    title: "Open & Extract",
    description: "Open a URL and extract structured data.",
    icon: <ScanText className="size-5" />,
  },
  {
    id: "scrape-email",
    title: "Scrape → Email",
    description: "Extract page content and email the result.",
    icon: <Mail className="size-5" />,
  },
  {
    id: "branch-demo",
    title: "Branch Demo",
    description: "Branch on extracted text and take different paths.",
    icon: <GitBranch className="size-5" />,
  },
  {
    id: "for-each-list",
    title: "List → For each",
    description: "Loop over extracted links and scrape each page.",
    icon: <Repeat className="size-5" />,
  },
]

function TemplateCard({
  id,
  title,
  description,
  icon,
}: {
  id: WorkflowTemplateId
  title: string
  description: string
  icon: React.ReactNode
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await createWorkflowFromTemplateAction(id)
        })
      }}
      className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
          {icon}
        </span>
        <span className="font-semibold">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </button>
  )
}

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-10 p-8">
      <Empty className="border-none py-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ScanText />
          </EmptyMedia>
          <EmptyTitle>Build a browser workflow</EmptyTitle>
          <EmptyDescription>
            Start from a template or create a blank canvas. Automate browsing,
            extraction, and notifications — then schedule or webhook it.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <NewWorkflowButton />
        </EmptyContent>
      </Empty>

      <div className="w-full max-w-3xl">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Templates
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((template) => (
            <TemplateCard key={template.id} {...template} />
          ))}
        </div>
      </div>
    </div>
  )
}
