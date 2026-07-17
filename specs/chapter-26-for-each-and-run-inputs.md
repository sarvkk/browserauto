# For each + Run inputs + Auth profiles

What shipped: workflows can loop over lists, runs can take external JSON via the
Run button or webhooks, and orgs can save logged-in Browserbase contexts
(auth profiles) for reuse across runs. Billing was not touched.

---

## Summary

| Feature | What it does |
|---------|----------------|
| **For each** node | Runs a body subgraph once per array item (`Each` / `Done` handles) |
| **Run input (JSON)** | Optional JSON on the right sidebar → `{{ trigger.body }}` |
| **Webhook body** | POST JSON is injected the same way as run input |
| **Auth profiles** | Org-scoped Browserbase Contexts — log in once via Live View, reuse cookies on later runs |
| **Template** | Home → **List → For each** (HN list → open each story → extract) |

---

## For each

### Canvas shape

```
Extract list ──► For each ──Each──► Open URL ──► Extract detail
                    │
                    └──Done──► (after all iterations)
```

- Connect the loop body from the **Each** handle (not the default unlabeled handle).
- Connect post-loop work from the **Done** handle.
- Do not wire Done back into the Each body (validation rejects that).
- Cycles are still forbidden — this is fan-out over an array, not a back-edge.

### Fields

| Field | Purpose |
|-------|---------|
| `items` | JSON array after interpolation, e.g. `{{ extract-list.extraction.stories }}` |
| `maxItems` | Cap (default `25`, hard max `200`) |

### Outputs (usable in templates)

| Path | When | Meaning |
|------|------|---------|
| `item` | During Each body | Current element |
| `index` | During Each body | 0-based index |
| `count` | During / after | Number of items this run iterates |
| `results` | After Done | Array of each iteration’s **last body step** output |

Example inside the body:

```
{{ loop.item.url }}
{{ loop.index }}
```

After the loop:

```
{{ loop.results }}
```

### Nested loops

A For each inside another For each’s Each body is supported. Inner body nodes are
owned by the inner loop and are not executed by the outer runner directly.

### Validation

- Exactly one Start trigger (unchanged).
- No cycles (unchanged).
- Every For each must have at least one **Each** edge.
- Done targets must not also sit inside a For each body.

---

## Run inputs (`{{ trigger.* }}`)

Every run gets a pseudo-node `trigger` in the interpolate map:

```ts
{
  source: "manual" | "webhook" | "schedule",
  body?: unknown  // parsed JSON when provided
}
```

### Manual Run

1. Open a workflow.
2. In the right sidebar, fill **Run input (JSON)** (optional), e.g.:

```json
{ "url": "https://example.com" }
```

3. Press **Run**.
4. Reference fields in any node:

```
{{ trigger.body }}
{{ trigger.body.url }}
{{ trigger.source }}
```

Connection chips in the editor include **Trigger · body** and **Trigger · source**.

### Webhook

`POST /api/workflows/:id/trigger` with header `x-webhook-secret`.

- `Content-Type: application/json` → body parsed as JSON → `{{ trigger.body }}`
- Non-JSON text is stored as a string (or parsed if it happens to be JSON)
- `trigger.source` is `"webhook"`

Example:

```bash
curl -X POST "$ORIGIN/api/workflows/$ID/trigger" \
  -H "x-webhook-secret: $SECRET" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://news.ycombinator.com","limit":3}'
```

Then in the graph: Open URL → `{{ trigger.body.url }}`.

### Schedule

Cron runs set `trigger.source` to `"schedule"` and leave `body` undefined unless
you later extend the schedule payload.

### Retry

Retry starts a new run with `source: "manual"` and no body (original webhook
payload is not replayed).

---

## Auth profiles (sticky sessions)

Browserbase **Contexts** persist cookies, localStorage, and related user-data
across sessions. An auth profile is an org-scoped row that stores the Context id
plus metadata; the encrypted browsing data stays on Browserbase.

### Flow

```
Create profile → Live View log in (persist: true) → Save & close
       │
       ├── Workflow default (Start node / schedule / webhook)
       └── Manual Run override (this run only)
```

1. Sidebar → **Auth profiles** → create a named profile (creates a Browserbase Context).
2. **Log in** / **Refresh login** opens a keep-alive session with that context and
   `persist: true`, embedded via Live View (same proxy as run live views).
3. Sign in in the live browser (including 2FA). Click **Save & close** so the
   session releases and the context is written. Wait a few seconds before the
   next run so Browserbase can sync.
4. Attach the profile as the workflow default on the **Start** node (**Auth profile**).
5. On manual Run, optionally override with **Auth profile (this run)**:
   - **Workflow default** — use `workflows.auth_profile_id` (omit override)
   - **None** — no context for this run (`authProfileId: null`)
   - A specific profile — pass that id

Schedules and webhooks always use the workflow default (no per-trigger override).

### Runner wiring

When a profile resolves, Stagehand is created with:

```ts
browserbaseSessionCreateParams: {
  browserSettings: {
    context: { id: profile.browserbaseContextId, persist: true },
  },
}
```

Resolution order:

```ts
payload.authProfileId !== undefined
  ? payload.authProfileId   // manual override (incl. null = none)
  : workflow.authProfileId  // default for schedule / webhook / unset override
```

### Caveats

- Avoid overlapping sessions on the same Context (Browserbase can invalidate logins).
- Sites can still expire cookies server-side — use **Refresh login**.
- Optional env: `BROWSERBASE_PROJECT_ID` (inferred from the API key when omitted).

---

## Files touched

| Area | Path |
|------|------|
| Runner | [`features/workflows/tasks/run-workflow.ts`](../features/workflows/tasks/run-workflow.ts) |
| Scheduled trigger | [`features/workflows/tasks/run-workflow-scheduled.ts`](../features/workflows/tasks/run-workflow-scheduled.ts) |
| For-each helpers | [`features/workflows/lib/for-each.ts`](../features/workflows/lib/for-each.ts) |
| Trigger payload types | [`features/workflows/lib/trigger-payload.ts`](../features/workflows/lib/trigger-payload.ts) |
| Graph validation | [`features/workflows/lib/validate-graph.ts`](../features/workflows/lib/validate-graph.ts) |
| Registry | [`features/workflows/nodes/node-registry.ts`](../features/workflows/nodes/node-registry.ts) |
| Executors (`for-each` is runner-only) | [`features/workflows/nodes/node-executors.ts`](../features/workflows/nodes/node-executors.ts) |
| Server actions | [`features/workflows/actions.ts`](../features/workflows/actions.ts) |
| Data / schema | [`features/workflows/data.ts`](../features/workflows/data.ts), [`lib/db/schema.ts`](../lib/db/schema.ts) |
| Browserbase context helpers | [`lib/auth-profiles.ts`](../lib/auth-profiles.ts) |
| Auth profiles UI | [`app/(dashboard)/auth-profiles/page.tsx`](../app/(dashboard)/auth-profiles/page.tsx), [`features/workflows/components/auth-profiles-manager.tsx`](../features/workflows/components/auth-profiles-manager.tsx) |
| Live view tenancy | [`app/api/live-views/[sessionId]/route.ts`](../app/api/live-views/[sessionId]/route.ts) |
| Webhook API | [`app/api/workflows/[id]/trigger/route.ts`](../app/api/workflows/[id]/trigger/route.ts) |
| Sidebar UI | [`features/workflows/components/right-sidebar.tsx`](../features/workflows/components/right-sidebar.tsx) |
| Connection chips | [`features/workflows/hooks/use-upstream-connections.ts`](../features/workflows/hooks/use-upstream-connections.ts) |
| Templates | [`features/workflows/templates.ts`](../features/workflows/templates.ts) |
| Home cards | [`app/(dashboard)/home/page.tsx`](../app/(dashboard)/home/page.tsx) |

---

## How to try it

1. Go to `/home` → create **List → For each**.
2. Press **Run** (opens HN, extracts a few stories, loops, extracts each title).
3. Or set Run input / webhook JSON and point Open URL at `{{ trigger.body.url }}`.
4. Watch the console: body steps re-run each iteration; For each finishes with `results`.
5. Auth profiles: `/auth-profiles` → create → Log in → Save & close → set default on Start → Run (optionally override for this run).

---

## Not in this change

- Billing / plan gates
- Self-healing retries — see [chapter-27](./chapter-27-auth-profiles-and-self-heal.md)
- Programmatic credential fill (secrets → login form) — Live View seed/refresh only
- Parallel fan-out (iterations are sequential)
- Persisting webhook bodies onto retry
