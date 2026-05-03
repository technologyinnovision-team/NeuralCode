import { Brain, FileText, FilePlus, FileEdit, Search, Trash2, Info, Pin, Zap, X } from "lucide-react"

export type ContextFile = {
  path: string
  chars: number
  tokens: number
  action: "read" | "edited" | "created"
}

export type SmartFile = {
  path: string
  chars: number
  tokens: number
}

export type PinnedFile = {
  path: string
  chars: number
  tokens: number
}

const ACTION_META: Record<ContextFile["action"], { label: string; color: string; bg: string; border: string }> = {
  read:    { label: "read",    color: "text-cyan-400",    bg: "bg-cyan-400/10",    border: "border-cyan-400/25" },
  edited:  { label: "edited",  color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/25" },
  created: { label: "created", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/25" },
}

const ACTION_ICON: Record<ContextFile["action"], React.ComponentType<{ size?: number; className?: string }>> = {
  read:    FileText,
  edited:  FileEdit,
  created: FilePlus,
}

function fmtSize(chars: number): string {
  if (chars < 1000) return `${chars} ch`
  return `${(chars / 1000).toFixed(1)}k ch`
}
function fmtTokens(tokens: number): string {
  if (tokens < 1000) return `~${tokens} tok`
  return `~${(tokens / 1000).toFixed(1)}k tok`
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--faint-foreground)] mb-2 px-1 flex items-center gap-1.5">
      {children}
    </div>
  )
}

function FileRow({
  path, chars, tokens, badge, badgeColor, badgeBg, badgeBorder, icon: Icon, iconColor, onRemove, removeTitle,
}: {
  path: string
  chars: number
  tokens: number
  badge?: string
  badgeColor?: string
  badgeBg?: string
  badgeBorder?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  iconColor: string
  onRemove?: () => void
  removeTitle?: string
}) {
  const filename = path.split(/[\\/]/).pop() ?? path
  const dir = (() => {
    const sep = path.includes("/") ? "/" : "\\"
    const i = path.lastIndexOf(sep)
    return i > 0 ? path.substring(0, i) : ""
  })()

  return (
    <li className="group rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2.5 hover:border-[color:var(--border-strong)] transition-colors nc-fade-in">
      <div className="flex items-start gap-2.5">
        <div className={`h-7 w-7 rounded-lg ${badgeBg} ${badgeBorder} border flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon size={13} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] font-semibold text-[color:var(--foreground)] truncate max-w-[150px]">{filename}</span>
            {badge && (
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${badgeBg} ${badgeColor} border ${badgeBorder}`}>
                {badge}
              </span>
            )}
          </div>
          {dir && <div className="text-[10px] text-[color:var(--faint-foreground)] font-mono truncate mt-0.5">{dir}</div>}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-[color:var(--muted-foreground)] font-mono">{fmtSize(chars)}</span>
            <span className="text-[color:var(--border)]">·</span>
            <span className="text-[10px] text-[color:var(--muted-foreground)] font-mono">{fmtTokens(tokens)}</span>
          </div>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            title={removeTitle}
            className="shrink-0 h-6 w-6 rounded-lg flex items-center justify-center text-[color:var(--muted-foreground)] hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition"
          >
            <X size={11} />
          </button>
        )}
      </div>
    </li>
  )
}

export default function ContextPanel({
  files,
  searchedQueries,
  totalChars,
  contextMaxTokens,
  onClear,
  pinnedFiles,
  onUnpinFile,
  smartFiles,
}: {
  files: ContextFile[]
  searchedQueries: string[]
  totalChars: number
  contextMaxTokens: number
  onClear: () => void
  pinnedFiles: PinnedFile[]
  onUnpinFile: (path: string) => void
  smartFiles: SmartFile[]
}) {
  const sessionTokens = Math.max(0, Math.ceil(totalChars / 4))
  const pinnedTokens = pinnedFiles.reduce((s, f) => s + (f.tokens || 0), 0)
  const smartTokens  = smartFiles.reduce((s, f) => s + (f.tokens || 0), 0)
  const totalTokens  = sessionTokens + pinnedTokens + smartTokens
  const pct = Math.min(100, Math.round((totalTokens / Math.max(1, contextMaxTokens)) * 100))
  const barColor = pct > 80 ? "bg-red-500" : pct > 55 ? "bg-amber-400" : "bg-[color:var(--accent)]"

  const hasAnything = pinnedFiles.length > 0 || smartFiles.length > 0 || files.length > 0 || searchedQueries.length > 0

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Brain size={15} className="text-[color:var(--accent)]" />
          Context Window
          {hasAnything && (
            <span className="text-xs text-[color:var(--muted-foreground)] font-normal">
              {[
                pinnedFiles.length && `${pinnedFiles.length} pinned`,
                smartFiles.length  && `${smartFiles.length} auto`,
                files.length       && `${files.length} session`,
              ].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
        {files.length > 0 && (
          <button onClick={onClear} className="nc-icon-btn w-8 h-8" title="Clear session context" aria-label="Clear session context">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Token bar */}
      {hasAnything && (
        <div className="px-4 py-2.5 border-b border-[color:var(--border)] bg-black/10 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[color:var(--muted-foreground)]">Estimated context usage</span>
            <span className="text-[11px] font-mono text-[color:var(--foreground)]">{fmtTokens(totalTokens)}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[color:var(--border)] overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-1 gap-4">
            <div className="flex items-center gap-3">
              {pinnedTokens > 0 && (
                <span className="text-[10px] text-violet-400 font-mono flex items-center gap-1">
                  <Pin size={8} /> {fmtTokens(pinnedTokens)}
                </span>
              )}
              {smartTokens > 0 && (
                <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                  <Zap size={8} /> {fmtTokens(smartTokens)}
                </span>
              )}
              {sessionTokens > 0 && (
                <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                  <FileEdit size={8} /> {fmtTokens(sessionTokens)}
                </span>
              )}
            </div>
            <span className="text-[10px] text-[color:var(--faint-foreground)]">{pct}%</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {!hasAnything ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-5 py-10">
            <div className="h-12 w-12 rounded-2xl bg-[color:var(--surface-2)] border border-[color:var(--border)] flex items-center justify-center mb-3">
              <Brain size={22} className="text-[color:var(--muted-foreground)]" />
            </div>
            <div className="text-sm font-semibold text-[color:var(--foreground)]">No files in context yet</div>
            <div className="text-xs text-[color:var(--muted-foreground)] mt-1.5 max-w-[240px] leading-relaxed">
              Files the agent reads, edits, or creates will appear here. Pin files from the Explorer to always include them.
            </div>
            <div className="mt-4 flex items-start gap-2 text-[11px] text-[color:var(--faint-foreground)] bg-[color:var(--surface-2)] border border-[color:var(--border)] rounded-xl px-3 py-2.5 max-w-[260px] text-left">
              <Info size={12} className="shrink-0 mt-0.5 text-[color:var(--accent)]" />
              <span>The agent also auto-loads up to 12 relevant files from your workspace index at the start of each task.</span>
            </div>
          </div>
        ) : (
          <>
            {/* ── Pinned files ─────────────────────────────────────────── */}
            {pinnedFiles.length > 0 && (
              <div>
                <SectionLabel>
                  <Pin size={10} className="text-violet-400" />
                  Pinned · always in context
                </SectionLabel>
                <ul className="space-y-1.5">
                  {pinnedFiles.map((f) => (
                    <FileRow
                      key={f.path}
                      path={f.path}
                      chars={f.chars}
                      tokens={f.tokens}
                      badge="pinned"
                      badgeColor="text-violet-400"
                      badgeBg="bg-violet-400/10"
                      badgeBorder="border-violet-400/25"
                      icon={Pin}
                      iconColor="text-violet-400"
                      onRemove={() => onUnpinFile(f.path)}
                      removeTitle="Unpin file"
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* ── Auto-loaded files ─────────────────────────────────────── */}
            {smartFiles.length > 0 && (
              <div>
                <SectionLabel>
                  <Zap size={10} className="text-cyan-400" />
                  Auto-loaded · this task
                </SectionLabel>
                <ul className="space-y-1.5">
                  {smartFiles.map((f) => (
                    <FileRow
                      key={f.path}
                      path={f.path}
                      chars={f.chars}
                      tokens={f.tokens}
                      badge="auto"
                      badgeColor="text-cyan-400"
                      badgeBg="bg-cyan-400/10"
                      badgeBorder="border-cyan-400/25"
                      icon={Zap}
                      iconColor="text-cyan-400"
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* ── Session files ─────────────────────────────────────────── */}
            {files.length > 0 && (
              <div>
                <SectionLabel>
                  <FileEdit size={10} className="text-amber-400" />
                  Session · read / edited / created
                </SectionLabel>
                <ul className="space-y-1.5">
                  {files.map((f) => {
                    const meta = ACTION_META[f.action]
                    const Icon = ACTION_ICON[f.action]
                    return (
                      <FileRow
                        key={f.path}
                        path={f.path}
                        chars={f.chars}
                        tokens={f.tokens}
                        badge={meta.label}
                        badgeColor={meta.color}
                        badgeBg={meta.bg}
                        badgeBorder={meta.border}
                        icon={Icon}
                        iconColor={meta.color}
                      />
                    )
                  })}
                </ul>
              </div>
            )}

            {/* ── Searches ─────────────────────────────────────────────── */}
            {searchedQueries.length > 0 && (
              <div>
                <SectionLabel>
                  <Search size={10} className="text-violet-400" />
                  Searches performed
                </SectionLabel>
                <ul className="space-y-1.5">
                  {searchedQueries.map((q, i) => (
                    <li key={i} className="flex items-center gap-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 nc-fade-in">
                      <Search size={11} className="text-violet-400 shrink-0" />
                      <span className="text-[11px] font-mono text-[color:var(--muted-foreground)] truncate">{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer tip */}
            <div className="flex items-start gap-2 text-[11px] text-[color:var(--faint-foreground)] bg-[color:var(--surface-2)] border border-[color:var(--border)] rounded-xl px-3 py-2.5">
              <Pin size={11} className="shrink-0 mt-0.5 text-violet-400" />
              <span>Pin files from the Explorer tab so the agent always has them in context, even across sessions.</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
