# Console Panel — prompts

The canvas already lights up nodes live (running / failed). Now we add the bottom
**console**: a logs list of every run's steps, and an output inspector for whichever
step you click. Three prompts, run one at a time.

First, install the duration formatter:

```
npm install pretty-ms
```

---

## Prompt 1 — get the run data in place

```
I want a console under the canvas that shows what each run did — a list of every
run and its steps, and clicking a step shows what that step produced, or its
error if it failed, plus how long it took.

Right now a run step only records its node id and status in
@features/workflows/tasks/run-workflow.ts, so there's nothing to show yet. Capture
what the panel will need as the run walks its steps, then expose that run data
from @features/workflows/components/workflow-runs-provider.tsx so a panel can read
every run and its steps. Don't build the UI yet — just get the data in place.
```

---

## Prompt 2 — the logs list

```
Build a console panel below the canvas that lists workflow runs: every run and,
below it, its steps. Each step shows its node's icon, its title, and how long it
took (format the duration with pretty-ms), and spins while it's running; steps
that never actually ran should look inactive. Clicking a step selects it, clicking
again deselects.

The accent-colored node icon already exists as NodeIcon in
@features/workflows/components/right-sidebar.tsx — reuse it instead of building
another. Build the runs list as a LogsPanel and wrap it in a ConsolePanel that
owns the selection, both new components in the workflows feature's components
folder. Then mount the ConsolePanel in
@features/workflows/components/workflow-shell.tsx, where it currently shows a "Logs"
placeholder.
```

---

## Prompt 3 — the output inspector

```
The workflow console below the canvas
(@features/workflows/components/console-panel.tsx) lists each run's steps and lets
you select one. Add an output view showing the selected step's result: its output,
its error if it failed, or a short note when there's nothing. Build it as an
InspectorPanel in the workflows feature's components folder, rendered inside the
ConsolePanel next to the logs and only while a step is selected.
```
