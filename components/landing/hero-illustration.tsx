export function HeroIllustration() {
  return (
    <div
      aria-hidden
      className="landing-hero-visual relative h-full min-h-[28rem] w-full overflow-hidden"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--landing-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--landing-grid)_1px,transparent_1px)] bg-size-[48px_48px] opacity-70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,transparent_0%,var(--landing-paper)_72%)]" />

      <div className="absolute inset-x-[4%] top-[8%] bottom-[6%] md:inset-x-[6%]">
        <div className="absolute top-[12%] left-[2%] z-10 hidden flex-col gap-3 sm:flex sm:left-[4%] md:left-[6%]">
          <WorkflowNode
            accent="bg-emerald-500"
            label="Open URL"
            detail="pricing.example.com"
            delay="0.15s"
          />
          <Connector delay="0.35s" />
          <WorkflowNode
            accent="bg-violet-500"
            label="Act"
            detail="Click Accept cookies"
            delay="0.45s"
          />
          <Connector delay="0.55s" />
          <WorkflowNode
            accent="bg-sky-500"
            label="Extract"
            detail="plans → name, price"
            delay="0.65s"
          />
          <Connector delay="0.75s" />
          <div className="flex flex-wrap gap-3">
            <WorkflowNode
              accent="bg-amber-500"
              label="Branch"
              detail="price < $50"
              delay="0.85s"
              compact
            />
            <WorkflowNode
              accent="bg-rose-500"
              label="Email"
              detail="send digest"
              delay="0.95s"
              compact
            />
          </div>
        </div>

        <div className="landing-float absolute top-[6%] right-[0%] left-[0%] z-20 mx-auto w-[min(100%,22rem)] sm:right-[2%] sm:left-auto sm:mx-0 sm:w-[min(52%,26rem)] md:w-[min(48%,30rem)] lg:right-[4%]">
          <div className="overflow-hidden rounded-xl border border-[var(--landing-ink)]/15 bg-[var(--landing-chrome)] shadow-[0_32px_80px_-24px_rgba(12,18,34,0.55)]">
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
              <div className="ml-2 flex flex-1 items-center gap-2 rounded-md bg-white/8 px-2.5 py-1 font-mono text-[10px] text-white/55">
                <span className="landing-pulse inline-block size-1.5 rounded-full bg-[var(--landing-live)]" />
                https://pricing.example.com
              </div>
            </div>
            <div className="relative aspect-4/3 bg-[#f4f7fb]">
              <div className="absolute inset-0 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-2.5 w-20 rounded-full bg-[var(--landing-ink)]/20" />
                  <div className="h-6 w-16 rounded-md bg-[var(--landing-signal)]/90" />
                </div>
                <div className="mb-3 h-3 w-2/3 rounded-full bg-[var(--landing-ink)]/25" />
                <div className="mb-6 h-2 w-1/2 rounded-full bg-[var(--landing-ink)]/15" />
                <div className="grid grid-cols-3 gap-2.5">
                  {["Starter", "Growth", "Scale"].map((plan, i) => (
                    <div
                      key={plan}
                      className="landing-scan rounded-lg border border-[var(--landing-ink)]/10 bg-white p-2.5 shadow-sm"
                      style={{ animationDelay: `${0.9 + i * 0.12}s` }}
                    >
                      <div className="mb-2 text-[10px] font-semibold tracking-wide text-[var(--landing-ink)]/70 uppercase">
                        {plan}
                      </div>
                      <div className="font-display text-lg font-semibold text-[var(--landing-ink)]">
                        ${[12, 49, 199][i]}
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--landing-ink)]/8" />
                      <div className="mt-1.5 h-1.5 w-3/4 rounded-full bg-[var(--landing-ink)]/8" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="landing-extract-beam pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-[var(--landing-live)]/25 to-transparent" />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-lg border border-[var(--landing-ink)]/10 bg-white/70 px-3 py-2 backdrop-blur-sm">
            <span className="landing-pulse size-2 rounded-full bg-[var(--landing-live)]" />
            <span className="font-mono text-[11px] text-[var(--landing-ink)]/70">
              live session · extracting plans[2].price
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-[var(--landing-paper)] to-transparent" />
      </div>
    </div>
  )
}

function WorkflowNode({
  accent,
  label,
  detail,
  delay,
  compact,
}: {
  accent: string
  label: string
  detail: string
  delay: string
  compact?: boolean
}) {
  return (
    <div
      className="landing-rise flex items-center gap-2.5 rounded-xl border border-[var(--landing-ink)]/12 bg-white/90 px-3 py-2.5 shadow-[0_10px_30px_-18px_rgba(12,18,34,0.45)] backdrop-blur-sm"
      style={{ animationDelay: delay }}
    >
      <span className={`size-7 shrink-0 rounded-lg ${accent}`} />
      <div className={compact ? "min-w-0" : "min-w-[9rem]"}>
        <div className="text-xs font-semibold text-[var(--landing-ink)]">
          {label}
        </div>
        <div className="truncate font-mono text-[10px] text-[var(--landing-ink)]/50">
          {detail}
        </div>
      </div>
    </div>
  )
}

function Connector({ delay }: { delay: string }) {
  return (
    <div
      className="landing-rise ml-[1.35rem] h-4 w-px bg-[var(--landing-ink)]/25"
      style={{ animationDelay: delay }}
    />
  )
}
