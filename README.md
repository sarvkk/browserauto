# Browserauto

## Trigger.dev setup

Most of Trigger.dev is already wired into this repo:

- `trigger.config.ts` points at project `proj_ntfnxpyhigpgyqvfkoso`
- task files live under `features/`
- app code already triggers the `run-workflow` task
- `.env.example` and `.env.local` include `TRIGGER_SECRET_KEY`

The remaining local setup is:

```bash
npx trigger.dev@latest login
```

Then copy your Trigger.dev DEV secret key from the dashboard API Keys page into:

```bash
.env.local
```

```bash
TRIGGER_SECRET_KEY=tr_dev_...
```

Start the app and the Trigger.dev worker in separate terminals:

```bash
pnpm dev
pnpm trigger:dev
```

Once both are running, Trigger.dev should register the tasks from `features/` in the dashboard.
