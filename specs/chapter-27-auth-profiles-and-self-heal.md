# Auth profiles + Self-heal

Sticky Browserbase logins across runs, and observe→retry recovery for flaky
Act / Extract steps. Billing was not touched.

Companion to [chapter-26](./chapter-26-for-each-and-run-inputs.md) (for-each +
run inputs). Auth profile plumbing also lives in that chapter’s file list;
this doc is the how-to for both features as shipped.

---

## 1. Auth profiles

### What

An **auth profile** is an org-scoped Browserbase **Context** wrapper. You log in
once via Live View; later workflow runs attach that context with `persist: true`
so cookies / localStorage come back.

### Setup

1. Sidebar → **Auth profiles** → create a name (e.g. `Gmail work`).
2. **Log in** opens a keep-alive session in Live View.
3. Sign in (including 2FA) in the live browser.
4. **Save & close** — session releases; wait a few seconds for context sync.
5. On a workflow’s **Start** node, set **Auth profile** (workflow default).
6. Optional: on **Run**, override with **Auth profile (this run)** —
   workflow default / None / a specific profile.

Schedules and webhooks always use the workflow default.

### Runner

```ts
new Stagehand({
  env: "BROWSERBASE",
  browserbaseSessionCreateParams: {
    browserSettings: {
      context: { id: profile.browserbaseContextId, persist: true },
    },
  },
  // ...
})
```

Resolution:

```ts
payload.authProfileId !== undefined
  ? payload.authProfileId   // manual override (null = none)
  : workflow.authProfileId
```

### Caveats

- Don’t run overlapping sessions on the same Context.
- Server-side cookie expiry still needs **Refresh login**.
- Set `BROWSERBASE_PROJECT_ID` if your API key doesn’t imply a project.

---

## 2. Self-heal retries

### What

On **Act** and **Extract**, an optional **Self-heal retries** field (0–3):

| Node | On failure |
|------|------------|
| **Act** | Short backoff → `observe(instruction)` → `act(firstCandidate)` (or plain retry) |
| **Extract** | Short backoff → light observe to settle DOM → retry extract |

New Act/Extract nodes from the palette default to **2 retries**. Existing nodes
without the field behave as **Off** (`0`).

Successful recovery adds to the step output:

```json
{ "healed": true, "healAttempts": 1 }
```

Those paths are also registry outputs (`healed`, `healAttempts`) for chips.

### Stagehand-level heal

Every run also sets Stagehand `selfHeal: true` so the SDK can recover flaky
element targeting independently of the per-node retry loop.

### When it still fails

After all retries, the step fails and the run finalizes as `FAILED` (same as
before). Self-heal does not skip the step or continue the graph.

---

## How to try

### Auth

1. `/auth-profiles` → create → Log in → Save & close.
2. Open a workflow → Start → pick the profile.
3. Run a flow that needs to be logged in (or override per-run to None to compare).

### Self-heal

1. Add an **Act** (defaults to 2 retries) with a slightly brittle instruction.
2. Or open **List → For each** — extract steps ship with `retries: "2"`.
3. Run and inspect step output for `healed` / `healAttempts` when recovery fired.

---

## Files

| Area | Path |
|------|------|
| Act self-heal | [`features/workflows/nodes/act.ts`](../features/workflows/nodes/act.ts) |
| Extract self-heal | [`features/workflows/nodes/extract.ts`](../features/workflows/nodes/extract.ts) |
| Retries helper | [`features/workflows/lib/self-heal.ts`](../features/workflows/lib/self-heal.ts) |
| Executors | [`features/workflows/nodes/node-executors.ts`](../features/workflows/nodes/node-executors.ts) |
| Registry fields | [`features/workflows/nodes/node-registry.ts`](../features/workflows/nodes/node-registry.ts) |
| Stagehand `selfHeal` + auth context | [`features/workflows/tasks/run-workflow.ts`](../features/workflows/tasks/run-workflow.ts) |
| Auth helpers | [`lib/auth-profiles.ts`](../lib/auth-profiles.ts) |
| Auth UI | [`features/workflows/components/auth-profiles-manager.tsx`](../features/workflows/components/auth-profiles-manager.tsx) |
| Schema | [`lib/db/schema.ts`](../lib/db/schema.ts) (`auth_profiles`, `workflows.auth_profile_id`) |

---

## Not in this change

- Billing / plan gates
- Programmatic credential fill (secrets → form) — Live View seed only
- Self-heal on Agent / HTTP / Slack
- Parallel for-each
