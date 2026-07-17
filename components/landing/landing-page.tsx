import Link from "next/link"
import {
  Camera,
  GitBranch,
  Globe,
  KeyRound,
  Pointer,
  ScanText,
  Users,
  Webhook,
} from "lucide-react"

import { HeroIllustration } from "@/components/landing/hero-illustration"
import { Playground } from "@/components/landing/playground"

export function LandingPage() {
  return (
    <div className="min-h-svh bg-(--landing-paper) text-(--landing-ink)">
      <header className="landing-rise relative z-30 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight"
        >
          Browserauto
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <a
            href="#playground"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-(--landing-ink)/55 transition-colors hover:text-(--landing-ink) md:inline-flex"
          >
            Playground
          </a>
          <a
            href="#observe"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-(--landing-ink)/55 transition-colors hover:text-(--landing-ink) md:inline-flex"
          >
            Live runs
          </a>
          <Link
            href="/sign-in"
            className="rounded-lg px-3 py-2 text-sm font-medium text-(--landing-ink)/70 transition-colors hover:text-(--landing-ink)"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-(--landing-ink) px-3.5 py-2 text-sm font-medium text-(--landing-paper) transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero — one composition */}
        <section className="relative flex min-h-[calc(100svh-4.5rem)] flex-col">
          <div className="relative z-20 mx-auto w-full max-w-6xl px-5 pt-6 sm:px-8 sm:pt-10 lg:px-12">
            <p
              className="landing-rise font-display text-5xl leading-[0.95] font-semibold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
              style={{ animationDelay: "0.05s" }}
            >
              Browserauto
            </p>
            <h1
              className="landing-rise mt-5 max-w-xl font-display text-2xl leading-snug font-medium tracking-tight text-(--landing-ink)/85 sm:text-3xl"
              style={{ animationDelay: "0.12s" }}
            >
              Visual workflows that drive real browsers.
            </h1>
            <p
              className="landing-rise mt-4 max-w-md text-base leading-relaxed text-(--landing-ink)/60 sm:text-lg"
              style={{ animationDelay: "0.18s" }}
            >
              Compose AI act, extract, and branch steps on a canvas — then run
              them in the cloud with live view and session replay.
            </p>
            <div
              className="landing-rise mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "0.24s" }}
            >
              <Link
                href="/sign-up"
                className="inline-flex h-11 items-center rounded-lg bg-(--landing-signal) px-5 text-sm font-semibold text-white transition-[transform,opacity] hover:opacity-95 active:translate-y-px"
              >
                Start building
              </Link>
              <a
                href="#playground"
                className="inline-flex h-11 items-center rounded-lg border border-(--landing-ink)/15 bg-white/50 px-5 text-sm font-medium text-(--landing-ink)/80 backdrop-blur-sm transition-colors hover:bg-white/80"
              >
                Try the playground
              </a>
            </div>
          </div>

          <div
            className="landing-rise relative mt-8 min-h-0 flex-1"
            style={{ animationDelay: "0.3s" }}
          >
            <HeroIllustration />
          </div>
        </section>

        {/* Interactive playground */}
        <section
          id="playground"
          className="scroll-mt-8 border-t border-(--landing-ink)/10 px-5 py-20 sm:px-8 lg:px-12"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Try a workspace before you sign up.
            </h2>
            <p className="mt-3 max-w-xl text-(--landing-ink)/60">
              Point it at a blog or portfolio, hit run, and we really fetch the
              page, clean consent chrome, extract fields, and email a digest —
              without Browserbase or Stagehand.
            </p>
            <div className="mt-10">
              <Playground />
            </div>
            <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-8">
              {steps.map((step, i) => (
                <li key={step.title} className="relative">
                  <span className="font-display text-4xl font-semibold text-(--landing-signal)/25 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 font-display text-lg font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-(--landing-ink)/55">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Compose */}
        <section className="border-t border-(--landing-ink)/10 px-5 py-20 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Compose the run, don&apos;t script it.
            </h2>
            <p className="mt-3 max-w-xl text-(--landing-ink)/60">
              Drop nodes for navigation, AI actions, structured extraction, and
              notifications. Wire them once — reuse forever.
            </p>
            <ul className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span
                    className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-white ${item.accent}`}
                  >
                    <item.icon className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-semibold tracking-tight">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-(--landing-ink)/55">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Variables & secrets */}
        <section className="border-t border-(--landing-ink)/10 px-5 py-20 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Pass data forward. Keep secrets out of the graph.
              </h2>
              <p className="mt-4 max-w-md text-(--landing-ink)/60">
                Reference upstream outputs and org secrets with the same token
                syntax. Credentials stay in the vault — nodes only see what
                they need at run time.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-(--landing-ink)/65">
                <li className="flex gap-2">
                  <KeyRound className="mt-0.5 size-4 shrink-0 text-(--landing-signal)" />
                  Org-scoped secrets for API keys and passwords
                </li>
                <li className="flex gap-2">
                  <ScanText className="mt-0.5 size-4 shrink-0 text-(--landing-signal)" />
                  Typed inserts from prior step outputs
                </li>
              </ul>
            </div>
            <div
              aria-hidden
              className="overflow-hidden rounded-2xl border border-(--landing-ink)/10 bg-white/70 p-5 shadow-[0_24px_60px_-36px_rgba(12,18,34,0.4)] backdrop-blur-sm"
            >
              <div className="mb-4 text-[11px] font-semibold tracking-wide text-(--landing-ink)/40 uppercase">
                Instruction
              </div>
              <div className="rounded-lg border border-(--landing-ink)/10 bg-(--landing-paper)/80 p-4 font-mono text-[12px] leading-relaxed text-(--landing-ink)/80">
                Type{" "}
                <span className="landing-token rounded bg-(--landing-signal)/12 px-1.5 py-0.5 text-(--landing-signal)">
                  {"{{ extract.email }}"}
                </span>{" "}
                into the login field, then submit with{" "}
                <span className="landing-token rounded bg-(--landing-ink)/8 px-1.5 py-0.5">
                  {"{{ secrets.PORTAL_PASSWORD }}"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["extract.email", "extract.name", "secrets.PORTAL_PASSWORD"].map(
                  (token) => (
                    <span
                      key={token}
                      className="rounded-md border border-(--landing-ink)/10 bg-white px-2.5 py-1 font-mono text-[11px] text-(--landing-ink)/55"
                    >
                      {`{{ ${token} }}`}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Collaborate */}
        <section className="border-t border-(--landing-ink)/10 bg-(--landing-ink) px-5 py-20 text-(--landing-paper) sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div
              aria-hidden
              className="relative min-h-64 overflow-hidden rounded-2xl border border-white/10 bg-[#151d2b]"
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[40px_40px]" />
              <div className="absolute top-[22%] left-[14%] flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-2 backdrop-blur-sm">
                <span className="size-6 rounded-md bg-emerald-500" />
                <span className="text-xs font-medium">Open URL</span>
              </div>
              <div className="absolute top-[48%] left-[38%] flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-2 backdrop-blur-sm">
                <span className="size-6 rounded-md bg-sky-500" />
                <span className="text-xs font-medium">Extract</span>
              </div>
              <div className="absolute top-[30%] left-[58%] landing-cursor-a">
                <CursorChip name="Maya" color="#2ec4a7" />
              </div>
              <div className="absolute top-[58%] left-[28%] landing-cursor-b">
                <CursorChip name="Jon" color="#e23b14" />
              </div>
              <div className="absolute right-4 bottom-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/55 backdrop-blur-sm">
                <Users className="size-3.5 text-(--landing-live)" />
                2 editing · live
              </div>
            </div>
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Same canvas. Same cursors. Same truth.
              </h2>
              <p className="mt-4 max-w-md text-(--landing-paper)/65">
                Workflows are multiplayer by default. Teammates see nodes move
                as you place them — no export, no &quot;who has the latest
                JSON?&quot;
              </p>
            </div>
          </div>
        </section>

        {/* Observe */}
        <section
          id="observe"
          className="scroll-mt-8 border-t border-(--landing-ink)/10 px-5 py-20 sm:px-8 lg:px-12"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Watch the browser think out loud.
            </h2>
            <p className="mt-3 max-w-xl text-(--landing-ink)/60">
              Every run streams a live session view, step logs, and a
              replayable recording — so debugging feels like scrubbing a
              timeline, not reading a stack trace.
            </p>

            <div className="mt-12 grid gap-6 lg:grid-cols-5">
              <div className="overflow-hidden rounded-2xl border border-(--landing-ink)/10 bg-(--landing-ink) text-(--landing-paper) lg:col-span-3">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <span className="font-mono text-[11px] text-white/45">
                    run_01JXK · step 3/7
                  </span>
                  <span className="flex items-center gap-2 font-mono text-[11px] text-(--landing-live)">
                    <span className="landing-pulse size-1.5 rounded-full bg-(--landing-live)" />
                    LIVE
                  </span>
                </div>
                <div className="space-y-2 p-4 font-mono text-[11px] leading-relaxed">
                  {logs.map((line) => (
                    <div key={line} className="flex gap-3 text-white/55">
                      <span className="shrink-0 text-white/25">→</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 px-4 py-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="landing-progress h-full w-3/5 rounded-full bg-(--landing-live)" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-(--landing-ink)/10 bg-white/70 p-5 lg:col-span-2">
                <div>
                  <div className="text-[11px] font-semibold tracking-wide text-(--landing-ink)/40 uppercase">
                    Session replay
                  </div>
                  <p className="mt-2 text-sm text-(--landing-ink)/60">
                    Scrub the recording after the session closes. See exactly
                    what the agent saw.
                  </p>
                </div>
                <div className="mt-8" aria-hidden>
                  <div className="relative aspect-video overflow-hidden rounded-lg border border-(--landing-ink)/10 bg-[#0c1222]">
                    <div className="absolute inset-3 rounded border border-dashed border-white/15" />
                    <div className="absolute inset-x-6 top-1/3 h-2 rounded-full bg-white/10" />
                    <div className="absolute inset-x-10 top-1/2 h-2 w-1/2 rounded-full bg-white/8" />
                    <div className="landing-replay-playhead absolute top-0 bottom-0 w-px bg-(--landing-signal)">
                      <span className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-(--landing-signal)" />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between font-mono text-[10px] text-(--landing-ink)/40">
                    <span>0:00</span>
                    <span>0:42</span>
                    <span>1:18</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="border-t border-(--landing-ink)/10 px-5 py-20 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for the jobs you already want done.
            </h2>
            <p className="mt-3 max-w-xl text-(--landing-ink)/60">
              Start from a template or wire your own. Same canvas either way.
            </p>
            <ul className="mt-12 grid gap-8 sm:grid-cols-3">
              {useCases.map((item) => (
                <li key={item.title}>
                  <span className="font-mono text-[11px] tracking-wide text-(--landing-signal) uppercase">
                    {item.tag}
                  </span>
                  <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-(--landing-ink)/55">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Trigger */}
        <section className="border-t border-(--landing-ink)/10 px-5 py-20 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Trigger on your schedule.
            </h2>
            <p className="mt-3 max-w-xl text-(--landing-ink)/60">
              Kick off workflows from the canvas, a webhook, or a schedule.
              Durable runs keep going even when your laptop doesn&apos;t.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Manual",
                  body: "Run from the canvas while you iterate.",
                },
                {
                  label: "Webhook",
                  body: "Fire a run from your app or Zapier with one POST.",
                },
                {
                  label: "Cron",
                  body: "Schedule digests, checks, and scrapes on a timer.",
                },
              ].map((item) => (
                <div key={item.label}>
                  <h3 className="font-semibold tracking-tight">{item.label}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-(--landing-ink)/55">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-(--landing-ink)/10 px-5 py-24 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Your next workflow
              <br />
              starts on a blank canvas.
            </h2>
            <p className="mt-4 max-w-md text-(--landing-ink)/55">
              Free for every organization — live view, session replay, and all
              nodes included.
            </p>
            <Link
              href="/sign-up"
              className="mt-8 inline-flex h-12 items-center rounded-lg bg-(--landing-signal) px-6 text-sm font-semibold text-white transition-opacity hover:opacity-95"
            >
              Create a free workspace
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-(--landing-ink)/10 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display text-sm font-semibold">Browserauto</span>
          <p className="text-xs text-(--landing-ink)/45">
            Browser automation for teams who think in workflows.
          </p>
        </div>
      </footer>
    </div>
  )
}

function CursorChip({ name, color }: { name: string; color: string }) {
  return (
    <div className="relative">
      <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
        <path
          d="M1 1L16.5 10.2L9.2 11.8L6.4 20.5L1 1Z"
          fill={color}
          stroke="white"
          strokeWidth="1.2"
        />
      </svg>
      <span
        className="absolute top-4 left-3 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </div>
  )
}

const steps = [
  {
    title: "Open a writing site",
    body: "Paste a blog, essay, or portfolio URL. Shop and ecommerce pages are rejected on purpose.",
  },
  {
    title: "Act + extract for real",
    body: "We fetch the HTML, strip cookie banners, optionally follow a read-more link, then pull structured fields.",
  },
  {
    title: "Email the digest",
    body: "The playground emails your extraction via Resend when configured, or shows a full preview if not.",
  },
]

const capabilities = [
  {
    title: "Open URL",
    body: "Navigate cloud browsers to any page, with session state you can inspect.",
    icon: Globe,
    accent: "bg-emerald-500",
  },
  {
    title: "Act",
    body: "Tell the agent what to click, type, or select — in plain language.",
    icon: Pointer,
    accent: "bg-violet-500",
  },
  {
    title: "Extract",
    body: "Pull structured fields with schemas your downstream steps can reference.",
    icon: ScanText,
    accent: "bg-sky-500",
  },
  {
    title: "Branch",
    body: "Route the graph on extracted values — true path, false path, done.",
    icon: GitBranch,
    accent: "bg-amber-500",
  },
  {
    title: "Screenshot",
    body: "Capture artifacts mid-run for audits, emails, or human review.",
    icon: Camera,
    accent: "bg-teal-500",
  },
  {
    title: "Notify",
    body: "Ship results to email or Slack the moment a run finishes.",
    icon: Webhook,
    accent: "bg-rose-500",
  },
]

const useCases = [
  {
    tag: "Open & Extract",
    title: "Structured scrapes",
    body: "Open a page, pull the fields you care about, and hand them to email or HTTP.",
  },
  {
    tag: "Scrape → Email",
    title: "Morning digests",
    body: "Schedule a nightly crawl and wake up to a summary in your inbox.",
  },
  {
    tag: "Branch Demo",
    title: "Conditional paths",
    body: "Extract a value, branch on it, and take different actions without writing if-else glue.",
  },
]

const logs = [
  "open-url → loaded pricing.example.com (842ms)",
  'act → clicked "Accept cookies"',
  "extract → matched 3 plans",
  "branch → price < 50 → true",
  "email → queued digest to ops@…",
]
