import {
  FileText,
  FileEdit,
  FilePlus,
  Search,
  ListTree,
  Terminal as TerminalIcon,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
} from "lucide-react"

type Status = "running" | "ok" | "error" | "idle"

const iconForName = (name: string) => {
  const n = (name || "").toLowerCase()
  if (n.includes("create_file") || n.includes("write_file")) return FilePlus
  if (n.includes("lines_editor")) return Layers
  if (n.includes("write")) return FileEdit
  if (n.includes("read")) return FileText
  if (n.includes("search")) return Search
  if (n.includes("list")) return ListTree
  if (n.includes("command") || n.includes("run_command")) return TerminalIcon
  return Wrench
}

const FRIENDLY: Record<string, string> = {
  Call_Tool_List_Files: "List files",
  read_content_file:    "Read file",
  search_in_files:      "Search files",
  lines_editor:         "Edit lines",
  create_file:          "Create file",
  run_command:          "Run command",
  list_files:           "List files",
  read_file:            "Read file",
  write_file:           "Write file",
  search_files:         "Search files",
}

function friendlyName(name: string) {
  return FRIENDLY[name] || name
}

function subtitle(args?: Record<string, unknown>): string | null {
  if (!args) return null
  const v = (args.path || args.query || args.command) as string | undefined
  return v || null
}

function resultSummary(name: string, result: unknown, status: Status): string | null {
  if (status === "running") return null
  if (!result) return null
  const r = result as Record<string, unknown>

  if (status === "error") {
    const msg = String(r.error || "Failed")
    return msg.length > 80 ? msg.slice(0, 80) + "…" : msg
  }

  const n = (name || "").toLowerCase()

  if (n.includes("lines_editor")) {
    const applied = Array.isArray(r.operations_applied) ? r.operations_applied.length : 0
    const failed = Array.isArray(r.operations_failed) ? r.operations_failed.length : 0
    if (failed > 0) return `${applied} applied, ${failed} failed`
    return `${applied} operation${applied !== 1 ? "s" : ""} applied`
  }

  if (Array.isArray(r.matches)) {
    const paths = new Set((r.matches as Array<Record<string, unknown>>).map((m) => m.path))
    return `${r.matches.length} match${r.matches.length !== 1 ? "es" : ""} in ${paths.size} file${paths.size !== 1 ? "s" : ""}`
  }

  if (Array.isArray(r.files)) {
    return `${r.files.length} file${r.files.length !== 1 ? "s" : ""}`
  }

  if (typeof r.content === "string" && typeof r.from_lines === "number") {
    const total = typeof r.total_lines === "number" ? ` of ${r.total_lines}` : ""
    return `Lines ${r.from_lines}–${r.to_lines ?? "?"}${total}`
  }

  if (typeof r.stdout === "string" || typeof r.stderr === "string") {
    const code = typeof r.return_code === "number" ? r.return_code : null
    if (code === null) return null
    return `Exit ${code}`
  }

  if (r.status === "saved" || r.operation === "create") {
    return `Created — ${r.lines ?? "?"} lines`
  }

  return null
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "ok")
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[color:var(--success)] bg-[color:var(--success)]/10 border border-[color:var(--success)]/25 rounded-full px-1.5 py-0.5 shrink-0">
        <CheckCircle2 size={8} /> done
      </span>
    )
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[color:var(--danger)] bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/25 rounded-full px-1.5 py-0.5 shrink-0">
        <AlertCircle size={8} /> error
      </span>
    )
  if (status === "running")
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[color:var(--warning)]/90 bg-[color:var(--warning)]/8 border border-[color:var(--warning)]/20 rounded-full px-1.5 py-0.5 shrink-0">
        <Loader2 size={8} className="animate-spin" /> running
      </span>
    )
  return null
}

export default function ToolCard({
  name,
  args,
  status = "idle",
  result,
}: {
  name: string
  args?: Record<string, unknown>
  status?: Status
  result?: unknown
}) {
  const Icon = iconForName(name)
  const sub = subtitle(args)
  const summary = resultSummary(name, result, status)

  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)]/50 px-3 py-2 flex items-center gap-2.5 nc-fade-in">
      <div className="h-6 w-6 rounded-md bg-[color:var(--accent)]/10 border border-[color:var(--accent)]/20 flex items-center justify-center text-[color:var(--accent)] shrink-0">
        <Icon size={12} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-[color:var(--foreground)] shrink-0">
            {friendlyName(name)}
          </span>
          {sub && (
            <span className="text-[10px] font-mono text-[color:var(--muted-foreground)] truncate max-w-[200px]">
              {sub}
            </span>
          )}
          <StatusBadge status={status} />
        </div>
        {summary && (
          <div className="text-[10px] text-[color:var(--muted-foreground)] mt-0.5 leading-tight">
            {summary}
          </div>
        )}
      </div>
    </div>
  )
}

export function ToolPlanCard({ name, args }: { name: string; args?: Record<string, unknown> }) {
  return <ToolCard name={name} args={args} status="idle" />
}

export function ToolStreamingCard({
  tagName,
  attributes,
}: {
  tagName: string
  attributes?: Record<string, unknown>
}) {
  return <ToolCard name={tagName} args={attributes} status="running" />
}

export function ToolResultCard({
  name,
  args,
  result,
  status,
}: {
  name: string
  args?: Record<string, unknown>
  result: unknown
  status: Status
}) {
  return <ToolCard name={name} args={args} status={status} result={result} />
}
