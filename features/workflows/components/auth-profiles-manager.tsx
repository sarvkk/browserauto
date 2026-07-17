"use client"

import { useRef, useState, useTransition } from "react"
import { LogIn, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  cancelAuthProfileLoginAction,
  createAuthProfileAction,
  deleteAuthProfileAction,
  finishAuthProfileLoginAction,
  startAuthProfileLoginAction,
} from "@/features/workflows/actions"
import { LiveView } from "@/features/workflows/components/live-view"

type ProfileRow = {
  id: string
  name: string
  browserbaseContextId: string
  activeLoginSessionId: string | null
  lastAuthenticatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

function formatWhen(value: Date | null) {
  if (!value) return "Never"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function AuthProfilesManager({
  initialProfiles,
}: {
  initialProfiles: ProfileRow[]
}) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [name, setName] = useState("")
  const [isPending, startTransition] = useTransition()
  const [login, setLogin] = useState<{
    profileId: string
    sessionId: string
    profileName: string
  } | null>(null)
  const skipCancelOnClose = useRef(false)

  const openLogin = (profile: ProfileRow) => {
    startTransition(async () => {
      try {
        const result = await startAuthProfileLoginAction(profile.id)
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === profile.id
              ? { ...p, activeLoginSessionId: result.sessionId }
              : p
          )
        )
        setLogin({
          profileId: profile.id,
          sessionId: result.sessionId,
          profileName: profile.name,
        })
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Couldn't start login"
        )
      }
    })
  }

  const cancelLogin = (profileId: string) => {
    startTransition(async () => {
      try {
        await cancelAuthProfileLoginAction(profileId)
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === profileId ? { ...p, activeLoginSessionId: null } : p
          )
        )
      } catch {
        // ignore — dialog still closes
      } finally {
        setLogin(null)
      }
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auth profiles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saved Browserbase logins. Log in once via Live View, then attach a
          profile to a workflow so runs reuse cookies and session state.
        </p>
      </div>

      <form
        className="flex flex-col gap-3 rounded-lg border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault()
          startTransition(async () => {
            try {
              const profile = await createAuthProfileAction({ name })
              setProfiles((prev) =>
                [...prev, profile].sort((a, b) => a.name.localeCompare(b.name))
              )
              setName("")
              toast.success("Profile created — log in to save the session")
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Couldn't create profile"
              )
            }
          })
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-name">Name</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Gmail work"
            required
          />
        </div>
        <Button type="submit" disabled={isPending} className="w-fit">
          Create profile
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Profiles</h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No profiles yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {profiles.map((profile) => (
              <li
                key={profile.id}
                className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Last login: {formatWhen(profile.lastAuthenticatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => openLogin(profile)}
                  >
                    {profile.lastAuthenticatedAt ? (
                      <>
                        <RefreshCw className="size-3.5" />
                        Refresh login
                      </>
                    ) : (
                      <>
                        <LogIn className="size-3.5" />
                        Log in
                      </>
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          await deleteAuthProfileAction(profile.id)
                          setProfiles((prev) =>
                            prev.filter((p) => p.id !== profile.id)
                          )
                          toast.success("Profile deleted")
                        } catch {
                          toast.error("Couldn't delete profile")
                        }
                      })
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={login != null}
        onOpenChange={(open) => {
          if (open || !login) return
          if (skipCancelOnClose.current) {
            skipCancelOnClose.current = false
            setLogin(null)
            return
          }
          cancelLogin(login.profileId)
        }}
      >
        <DialogContent className="flex h-[min(90vh,52rem)] w-[min(96vw,64rem)] max-w-none flex-col gap-0 p-0 sm:max-w-none">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle>Log in — {login?.profileName}</DialogTitle>
            <DialogDescription>
              Use the live browser to sign in (including 2FA). When you&apos;re
              done, click Save &amp; close so cookies persist for future runs.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 bg-black">
            {login && <LiveView sessionId={login.sessionId} />}
          </div>
          <DialogFooter className="border-t border-border px-4 py-3">
            <Button
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                if (login) cancelLogin(login.profileId)
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={isPending || !login}
              onClick={() => {
                if (!login) return
                const profileId = login.profileId
                startTransition(async () => {
                  try {
                    const updated =
                      await finishAuthProfileLoginAction(profileId)
                    if (updated) {
                      setProfiles((prev) =>
                        prev.map((p) => (p.id === profileId ? updated : p))
                      )
                    }
                    skipCancelOnClose.current = true
                    setLogin(null)
                    toast.success(
                      "Login saved — wait a few seconds before running workflows"
                    )
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Couldn't save login"
                    )
                  }
                })
              }}
            >
              Save &amp; close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
