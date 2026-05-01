import { History, Trash2, FileEdit, FilePlus, FileText, Search, ListTree, Terminal as TerminalIcon, Wrench, CheckCircle2, XCircle, Clock, Layers } from "lucide-react"

export type ToolHistoryItem = {
  id: string
  name: string
  args?: Record<string, unknown>
  status: "running" | "ok" | "error"
  resultPreview?: string
  timestamp: number
}

const iconFor = (name: string) => {
  const n = name.toLowerCase()
  if (n.includes("create_file")) return FilePlus
  if (n.includes("lines_editor")) return Layers
  if (n.includes("write")) return FileEdit
  if (n.includes("read")) return FileText
  if (n.includes("search")) return Search
  if (n.includes("list")) return ListTree
  if (n.includes("command") || n.includes("run")) return TerminalIcon
  return Wrench
}

const friendlyName = (name: string) => {
  const map: Record<string, string> = {
    Call_Tool_List_Files: "List files",
    read_content_file:    "Read file",
    search_in_files:      "Search files",
    lines_editor:         "Edit lines",
    create_file:          "Create file",
    list_files:           "List files",
    read_file:            "Read file",
    write_file:           "Write file",
    search_files:         "Search files",
    run_command:          "Run command",
  }
  return map[name] || name
}

const StatusIcon = ({ s }: { s: ToolHistoryItem["status"] }) => {
  if (s === "running") return <Clock size={12} className="text-[color:var(--warning)] animate-pulse" />
  if (s === "ok") return <CheckCircle2 size={12} className="text-[color:var(--success)]" />
  return <XCircle size={12} className="text-[color:var(--danger)]" />
}

export default function ToolsHistoryPanel({
  items,
  onClear,
}: {
  items: ToolHistoryItem[]
  onClear: () => void
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <History size={15} className="text-[color:var(--accent)]" />
          Tool history
          <span className="text-xs text-[color:var(--muted-foreground)] font-normal">{items.length}</span>
        </div>
        {items.length > 0 && (
          <button onClick={onClear} className="nc-icon-btn w-8 h-8" aria-label="Clear history" title="Clear">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-8">
            <div className="h-12 w-12 rounded-2xl bg-[color:var(--surface-2)] border border-[color:var(--border)] flex items-center justify-center mb-3">
              <History size={24} className="text-[color:var(--muted-foreground)]" />
            </div>
            <div className="text-sm font-semibold">No tool calls yet</div>
            <div className="text-xs text-[color:var(--muted-foreground)] mt-1 max-w-[260px]">
              When the agent uses workspace tools, you'll see a chronological log here.
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => {
                const Icon = iconFor(it.name)
                const path = (it.args?.path as string | undefined) ||
                  (it.args?.query as string | undefined) ||
                  (it.args?.command as string | undefined) ||
                  ""
                const time = new Date(it.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
                return (
                  <li
                    key={it.id}
                    className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-black/30 border border-[color:var(--border)] flex items-center justify-center text-[color:var(--accent)]">
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[color:var(--foreground)] flex items-center gap-2">
                          {friendlyName(it.name)}
                          <StatusIcon s={it.status} />
                        </div>
                        {path && (
                          <div className="text-[11px] text-[color:var(--muted-foreground)] font-mono truncate">
                            {path}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-[color:var(--faint-foreground)] font-mono shrink-0">{time}</div>
                    </div>
                    {it.resultPreview && (
                      <div className="mt-2 text-[11px] font-mono text-[color:var(--muted-foreground)] bg-black/20 border border-[color:var(--border)] rounded-lg px-2 py-1.5 max-h-20 overflow-hidden">
                        {it.resultPreview.slice(0, 220)}
                        {it.resultPreview.length > 220 ? "…" : ""}
                      </div>
                    )}
                  </li>
                )
              })}
          </ul>
        )}
      </div>
    </div>
  )
}
