import { Activity, Cpu, Zap } from "lucide-react"

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

  return (
    <footer className="h-7 flex items-center justify-between px-3 sm:px-4 text-[11px] text-[color:var(--muted-foreground)] border-t border-[color:var(--border)] bg-black/30">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${runStatusLabel ? "bg-[color:var(--accent)] nc-pulse-dot" : "bg-[color:var(--success)]"}`} />
          <span>{runStatusLabel || "Ready"}</span>
        </span>
        {workspace && (
          <>
            <span className="opacity-30">•</span>
            <span className="truncate max-w-[220px]">{workspace}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {selectedModel && (
          <span className="hidden sm:flex items-center gap-1.5">
            <Cpu size={11} />
            <span className="font-mono truncate max-w-[180px]">{selectedModel}</span>
          </span>
        )}
        {selectedMode && (
          <span className="hidden sm:flex items-center gap-1.5 capitalize">
            <Zap size={11} />
            {selectedMode}
          </span>
        )}
        <span className="flex items-center gap-2">
          <Activity size={11} />
          <span className="font-mono">{contextUsedTokens}/{contextMaxTokens}</span>
          <span className="hidden sm:inline-block w-16 h-1 rounded-full bg-white/5 overflow-hidden">
            <span className="block h-full bg-[color:var(--accent)]" style={{ width: `${pct}%` }} />
          </span>
        </span>
      </div>
    </footer>
  )
}
