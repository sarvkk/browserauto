"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  deleteWorkflowAction,
  renameWorkflowAction,
} from "@/features/workflows/actions"

const WORKFLOW_NAME_MAX_LENGTH = 80

function validateWorkflowName(name: string) {
  const trimmed = name.trim()

  if (!trimmed) {
    return "Workflow name can't be empty."
  }

  if (trimmed.length > WORKFLOW_NAME_MAX_LENGTH) {
    return `Workflow name must be ${WORKFLOW_NAME_MAX_LENGTH} characters or fewer.`
  }

  return null
}

interface WorkflowActionsMenuProps {
  workflowId: string
  workflowName: string
  /** Trigger button for the dropdown. Defaults to a ghost icon button. */
  trigger?: React.ReactNode
  /** Dropdown content alignment. */
  align?: "start" | "center" | "end"
}

export function WorkflowActionsMenu({
  workflowId,
  workflowName,
  trigger,
  align = "start",
}: WorkflowActionsMenuProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState(workflowName)
  const [nameError, setNameError] = useState<string | null>(null)

  const openRename = () => {
    setName(workflowName)
    setNameError(null)
    setRenameOpen(true)
  }

  const handleRename = () => {
    const error = validateWorkflowName(name)
    if (error) {
      setNameError(error)
      return
    }

    startTransition(async () => {
      try {
        await renameWorkflowAction(workflowId, name)
        setRenameOpen(false)
        toast.success("Workflow renamed")
        router.refresh()
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Couldn't rename workflow."
        )
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteWorkflowAction(workflowId)
        setDeleteOpen(false)
        toast.success("Workflow deleted")

        const isActive = pathname === `/workflows/${workflowId}`
        if (isActive) {
          router.replace("/")
        } else {
          router.refresh()
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Couldn't delete workflow."
        )
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <Button size="icon" variant="ghost" aria-label="Workflow actions">
              <MoreHorizontal />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="min-w-48">
          <DropdownMenuItem
            disabled={isPending}
            className="text-xs [&_svg:not([class*='size-'])]:size-3.5"
            onSelect={(event) => {
              event.preventDefault()
              openRename()
            }}
          >
            <Pencil />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={isPending}
            className="text-xs [&_svg:not([class*='size-'])]:size-3.5"
            onSelect={(event) => {
              event.preventDefault()
              setDeleteOpen(true)
            }}
          >
            <Trash2 />
            Delete workflow
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename workflow</DialogTitle>
            <DialogDescription>
              Choose a clear name so this workflow is easy to find later.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              handleRename()
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor={`rename-workflow-${workflowId}`}>Name</Label>
              <Input
                id={`rename-workflow-${workflowId}`}
                value={name}
                maxLength={WORKFLOW_NAME_MAX_LENGTH}
                autoFocus
                disabled={isPending}
                aria-invalid={Boolean(nameError)}
                onChange={(event) => {
                  setName(event.target.value)
                  if (nameError) setNameError(null)
                }}
              />
              {nameError ? (
                <p className="text-xs text-destructive">{nameError}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes &quot;{workflowName}&quot; and its
              collaborative room. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={(event) => {
                // Keep the dialog open while the action runs so the pending
                // state stays visible; the action closes it on success.
                event.preventDefault()
                handleDelete()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
