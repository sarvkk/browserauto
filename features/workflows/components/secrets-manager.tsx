"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createSecretAction,
  deleteSecretAction,
} from "@/features/workflows/actions"

type SecretRow = {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export function SecretsManager({
  initialSecrets,
}: {
  initialSecrets: SecretRow[]
}) {
  const [secrets, setSecrets] = useState(initialSecrets)
  const [name, setName] = useState("")
  const [value, setValue] = useState("")
  const [isPending, startTransition] = useTransition()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Secrets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Org-scoped credentials. Reference them in node fields as{" "}
          <code className="rounded bg-muted px-1">{`{{ secrets.NAME }}`}</code>.
          Values are encrypted at rest and never shown again.
        </p>
      </div>

      <form
        className="flex flex-col gap-3 rounded-lg border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault()
          startTransition(async () => {
            try {
              const secret = await createSecretAction({ name, value })
              setSecrets((prev) =>
                [...prev, secret].sort((a, b) => a.name.localeCompare(b.name))
              )
              setName("")
              setValue("")
              toast.success("Secret saved")
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Couldn't save secret"
              )
            }
          })
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="secret-name">Name</Label>
          <Input
            id="secret-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="API_KEY"
            className="font-mono"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="secret-value">Value</Label>
          <Input
            id="secret-value"
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <Button type="submit" disabled={isPending} className="w-fit">
          Add secret
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Stored secrets</h2>
        {secrets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No secrets yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {secrets.map((secret) => (
              <li
                key={secret.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="font-mono text-sm">{secret.name}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        await deleteSecretAction(secret.id)
                        setSecrets((prev) =>
                          prev.filter((s) => s.id !== secret.id)
                        )
                        toast.success("Secret deleted")
                      } catch {
                        toast.error("Couldn't delete secret")
                      }
                    })
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
