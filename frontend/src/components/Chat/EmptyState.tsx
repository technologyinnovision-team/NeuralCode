import { Sparkles, FileEdit, Search, TerminalSquare, ListChecks, MessageSquareText } from "lucide-react"

const suggestions = [
  {
    icon: FileEdit,
    title: "Edit a file",
    desc: "Open a file and make focused changes",
    prompt: "Open src/App.tsx and refactor the header into its own component.",
  },
  {
    icon: Search,
    title: "Search the workspace",
    desc: "Find usages of a symbol or text",
    prompt: "Search the workspace for 'TODO' and list every match with file and line.",
  },
  {
    icon: TerminalSquare,
    title: "Run a command",
    desc: "Run npm scripts, tests, or shell commands",
    prompt: "Run `npm run build` and show me any errors.",
  },
  {
    icon: ListChecks,
    title: "Plan a feature",
    desc: "Switch to Plan mode for a structured plan",
    prompt: "Plan a small dashboard page with three widgets and a chart.",
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
    <div className="h-full w-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[760px] nc-fade-in">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] flex items-center justify-center shadow-[0_0_40px_rgba(124,92,255,0.45)]">
            <Sparkles size={22} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            What can I build for you?
          </h1>
          <p className="text-sm text-[color:var(--muted-foreground)] max-w-[520px]">
            NeuralCode can read and modify files, search across your workspace, run commands, and plan
            features. {workspace ? `Workspace: ${workspace}.` : "Open a workspace to enable file and command tools."}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[color:var(--muted-foreground)]">
            <MessageSquareText size={12} />
            <span>Ask anything below — or start with a suggestion.</span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {suggestions.map((s) => (
            <button
              key={s.title}
              onClick={() => onSelect(s.prompt)}
              className="group text-left p-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-2)] transition"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="h-8 w-8 rounded-xl bg-[color:var(--accent-bg)] text-[color:var(--accent)] flex items-center justify-center">
                  <s.icon size={15} />
                </div>
                <div className="text-sm font-semibold">{s.title}</div>
              </div>
              <div className="text-xs text-[color:var(--muted-foreground)] leading-snug">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
