import { useEffect, useState } from "react"
import { Loader2, Wrench } from "lucide-react"

interface ToolLoadingStateProps {
  toolName: string
  toolCallId: string
  isLoading: boolean
  countdownSeconds?: number
}

export default function ToolLoadingState({
  toolName,
  toolCallId,
  isLoading,
  countdownSeconds = 3,
}: ToolLoadingStateProps) {
  const [countdown, setCountdown] = useState(countdownSeconds)

  useEffect(() => {
    if (!isLoading) return
    const timer = setInterval(() => {
      setCountdown((p) => (p <= 1 ? 0 : p - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [isLoading])

  const pct = Math.max(0, Math.min(100, ((countdownSeconds - countdown) / countdownSeconds) * 100))

  return (
    <div
      key={toolCallId}
      className="mt-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 nc-fade-in"
    >
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-xl bg-[color:var(--accent-bg)] text-[color:var(--accent)] flex items-center justify-center">
          <Wrench size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[color:var(--foreground)] flex items-center gap-1.5">
            Using {toolName}
            <Loader2 size={12} className="animate-spin text-[color:var(--accent)]" />
          </div>
          <div className="text-[11px] text-[color:var(--muted-foreground)]">Working…</div>
        </div>
        {isLoading && (
          <span className="text-[11px] text-[color:var(--muted-foreground)] font-mono">{countdown}s</span>
        )}
      </div>
      <div className="mt-2 h-1 rounded-full bg-black/40 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#7c5cff] to-[#22d3ee] transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
