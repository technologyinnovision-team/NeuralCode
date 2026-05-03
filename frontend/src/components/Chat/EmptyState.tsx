import { Sparkles, FileEdit, Search, TerminalSquare, ListChecks, ArrowRight } from "lucide-react"

const suggestions = [
  {
    icon: FileEdit,
    title: "Edit a file",
    desc: "Open a file and make focused, targeted changes",
    prompt: "Open src/App.tsx and refactor the header into its own component.",
    accent: "from-violet-500/20 to-violet-600/10",
    border: "hover:border-violet-500/40",
    iconBg: "bg-violet-500/15 text-violet-400",
    dot: "bg-violet-400",
  },
  {
    icon: Search,
    title: "Search the workspace",
    desc: "Find usages of any symbol or text across files",
    prompt: "Search the workspace for 'TODO' and list every match with file and line.",
    accent: "from-cyan-500/15 to-cyan-600/8",
    border: "hover:border-cyan-500/40",
    iconBg: "bg-cyan-500/15 text-cyan-400",
    dot: "bg-cyan-400",
  },
  {
    icon: TerminalSquare,
    title: "Run a command",
    desc: "Run npm scripts, tests, or any shell command",
    prompt: "Run `npm run build` and show me any errors.",
    accent: "from-emerald-500/15 to-emerald-600/8",
    border: "hover:border-emerald-500/40",
    iconBg: "bg-emerald-500/15 text-emerald-400",
    dot: "bg-emerald-400",
  },
  {
    icon: ListChecks,
    title: "Plan a feature",
    desc: "Break down a feature into steps, then build it",
    prompt: "Plan and build a small dashboard page with three stat widgets and a chart.",
    accent: "from-amber-500/15 to-amber-600/8",
    border: "hover:border-amber-500/40",
    iconBg: "bg-amber-500/15 text-amber-400",
    dot: "bg-amber-400",
  },
]

export default function EmptyState({
  onSelect,
  workspace,
}: {
  onSelect: (prompt: string) => void
  workspace?: string | null
}) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center px-4 py-6 overflow-y-auto">
      <div className="w-full max-w-[780px] nc-fade-in">

        {/* Hero section — compact */}
        <div className="flex flex-col items-center text-center gap-3 mb-7">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] blur-lg opacity-45 animate-[glowPulse_2.5s_ease-in-out_infinite] scale-125" />
            <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-[#7c5cff] via-[#6247f5] to-[#22d3ee] flex items-center justify-center nc-logo-glow">
              <Sparkles size={20} className="text-white drop-shadow-lg" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1.5">
              <span className="nc-gradient-text">What can I build</span>{" "}
              <span className="text-[color:var(--foreground)]">for you?</span>
            </h1>
            <p className="text-[13px] text-[color:var(--muted-foreground)] max-w-[420px] mx-auto leading-relaxed">
              I can read files, run commands, search your workspace, and plan features.{" "}
              {workspace ? (
                <span className="font-mono text-[color:var(--accent-2)] text-[12px]">{workspace}</span>
              ) : (
                <span className="text-amber-400/80">Open a workspace to unlock file tools.</span>
              )}
            </p>
          </div>
        </div>

        {/* Suggestion grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {suggestions.map((s, i) => (
            <button
              key={s.title}
              onClick={() => onSelect(s.prompt)}
              style={{ animationDelay: `${i * 55}ms` }}
              className={`nc-suggestion-card group text-left p-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] ${s.border} transition-all duration-200 hover:shadow-[0_8px_28px_rgba(0,0,0,0.32)] hover:-translate-y-0.5 nc-fade-in`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-8 w-8 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                  <s.icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="text-[13px] font-semibold text-[color:var(--foreground)] leading-tight">{s.title}</div>
                    <ArrowRight
                      size={12}
                      className="text-[color:var(--faint-foreground)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200 shrink-0"
                    />
                  </div>
                  <div className="text-[11px] text-[color:var(--muted-foreground)] leading-snug">{s.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-[color:var(--faint-foreground)]">
          <span className="inline-block h-1 w-1 rounded-full bg-[color:var(--accent)] nc-pulse-dot" />
          <span>Type anything below or pick a suggestion to get started</span>
        </div>

      </div>
    </div>
  )
}
