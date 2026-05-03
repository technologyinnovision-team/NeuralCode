import { Activity, Cpu, Zap, Circle } from "lucide-react"

type Props = {
  workspace?: string | null
  selectedModel?: string
  selectedMode?: string
  runStatusLabel?: string | null
  contextUsedTokens?: number
  contextMaxTokens?: number
}

export default function StatusBar({
  workspace,
  selectedModel,
  selectedMode,
  runStatusLabel,
  contextUsedTokens = 0,
  contextMaxTokens = 8192,
}: Props) {
  const pct = Math.min(
    100,
    Math.round((contextUsedTokens / Math.max(1, contextMaxTokens)) * 100)
  )

  const barColor = pct > 80 ? "bg-red-400" : pct > 60 ? "bg-amber-400" : "bg-[color:var(--accent)]"

  return (
    <footer className="h-7 flex items-center justify-between px-3 sm:px-4 text-[11px] text-[color:var(--muted-foreground)] border-t border-[color:var(--border)] bg-black/40 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center gap-1.5">
          <Circle
            size={6}
            className={`fill-current ${runStatusLabel ? "text-[color:var(--accent)] nc-pulse-dot" : "text-[color:var(--success)]"}`}
          />
          <span className={runStatusLabel ? "text-[color:var(--foreground)]" : ""}>
            {runStatusLabel || "Ready"}
          </span>
        </span>
        {workspace && (
          <>
            <span className="text-[color:var(--faint-foreground)]">·</span>
            <span className="truncate max-w-[200px] font-mono text-[color:var(--faint-foreground)]">{workspace}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {selectedModel && (
          <span className="hidden sm:flex items-center gap-1.5">
            <Cpu size={10} className="text-[color:var(--faint-foreground)]" />
            <span className="font-mono text-[color:var(--faint-foreground)] truncate max-w-[160px]">{selectedModel}</span>
          </span>
        )}
        {selectedMode && (
          <span className="hidden md:flex items-center gap-1.5 capitalize">
            <Zap size={10} className="text-[color:var(--faint-foreground)]" />
            <span className="text-[color:var(--faint-foreground)]">{selectedMode}</span>
          </span>
        )}
        <span className="flex items-center gap-2">
          <Activity size={10} className="text-[color:var(--faint-foreground)]" />
          <span className="font-mono text-[color:var(--faint-foreground)]">
            {contextUsedTokens.toLocaleString()}<span className="text-[color:var(--border-strong)]">/</span>{contextMaxTokens.toLocaleString()}
          </span>
          <span className="hidden sm:inline-block w-14 h-1 rounded-full bg-white/6 overflow-hidden">
            <span
              className={`block h-full ${barColor} rounded-full transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          </span>
        </span>
      </div>
    </footer>
  )
}
