import { useState } from "react"
import { DiffEditor, loader } from "@monaco-editor/react"
import {
  FilePlus, Layers, Check, X, ChevronDown, ChevronUp, Loader2, AlertCircle,
} from "lucide-react"

loader.config({
  paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs" },
})

export type DiffStatus = "pending" | "accepted" | "rejected" | "loading"

type Props = {
  toolCallId: string
  name: string
  path: string
  originalContent: string
  modifiedContent: string
  language?: string
  diffStatus: DiffStatus
  onAccept: () => void
  onReject: () => void
}

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript",
    js: "javascript", jsx: "javascript",
    py: "python", json: "json", md: "markdown",
    css: "css", html: "html", sh: "shell",
    yml: "yaml", yaml: "yaml", rs: "rust",
    go: "go", java: "java", cpp: "cpp",
    c: "c", cs: "csharp", rb: "ruby",
    php: "php", swift: "swift", kt: "kotlin",
  }
  return map[ext] ?? "plaintext"
}

export default function CodeDiffCard({
  name, path, originalContent, modifiedContent, language, diffStatus, onAccept, onReject,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [editorReady, setEditorReady] = useState(false)

  const isCreate = name === "create_file" || name === "write_file"
  const lang = language ?? detectLanguage(path)
  const fileName = path.split(/[\\/]/).pop() ?? path

  const addedLines = modifiedContent.split("\n").length
  const removedLines = originalContent.split("\n").length
  const delta = addedLines - removedLines

  const isPending = diffStatus === "pending"
  const isAccepted = diffStatus === "accepted"
  const isRejected = diffStatus === "rejected"
  const isLoading = diffStatus === "loading"

  return (
    <div className="rounded-xl border border-[color:var(--border)] overflow-hidden nc-fade-in w-full">
      {/* Header */}
      <div
        className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-[color:var(--border)] ${
          isAccepted ? "bg-green-900/20" : isRejected ? "bg-red-900/20" : "bg-[color:var(--surface-2)]/70"
        }`}
      >
        <div
          className={`h-6 w-6 rounded-md border flex items-center justify-center shrink-0 ${
            isAccepted
              ? "bg-green-500/15 border-green-500/30 text-green-400"
              : isRejected
              ? "bg-red-500/15 border-red-500/30 text-red-400"
              : "bg-[color:var(--accent)]/10 border-[color:var(--accent)]/20 text-[color:var(--accent)]"
          }`}
        >
          {isCreate ? <FilePlus size={12} /> : <Layers size={12} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-[color:var(--foreground)] shrink-0">
              {isCreate ? "Create file" : "Edit lines"}
            </span>
            <span className="text-[10px] font-mono text-[color:var(--muted-foreground)] truncate max-w-[180px]">
              {fileName}
            </span>
            {isLoading && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[color:var(--warning)]/90 bg-[color:var(--warning)]/8 border border-[color:var(--warning)]/20 rounded-full px-1.5 py-0.5 shrink-0">
                <Loader2 size={8} className="animate-spin" /> loading
              </span>
            )}
            {isPending && !isLoading && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-400/90 bg-amber-400/10 border border-amber-400/25 rounded-full px-1.5 py-0.5 shrink-0">
                pending
              </span>
            )}
            {isAccepted && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-green-400 bg-green-400/10 border border-green-400/25 rounded-full px-1.5 py-0.5 shrink-0">
                <Check size={8} /> accepted
              </span>
            )}
            {isRejected && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-red-400 bg-red-400/10 border border-red-400/25 rounded-full px-1.5 py-0.5 shrink-0">
                <AlertCircle size={8} /> reverted
              </span>
            )}
          </div>
          {!isLoading && (
            <div className="text-[10px] text-[color:var(--muted-foreground)] mt-0.5 font-mono">
              {isCreate ? `+${addedLines} lines` : delta > 0 ? `+${delta} lines` : delta < 0 ? `${delta} lines` : "no line change"}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isPending && !isLoading && (
            <>
              <button
                onClick={onAccept}
                title="Accept changes"
                className="h-6 w-6 rounded-md bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 transition flex items-center justify-center"
              >
                <Check size={12} />
              </button>
              <button
                onClick={onReject}
                title="Undo changes"
                className="h-6 w-6 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand" : "Collapse"}
            className="h-6 w-6 rounded-md bg-[color:var(--bg-elevated)] border border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition flex items-center justify-center"
          >
            {collapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
          </button>
        </div>
      </div>

      {/* Loading placeholder (waiting for file content from backend) */}
      {!collapsed && isLoading && (
        <div className="h-[80px] bg-[#1e1e1e] flex items-center justify-center gap-2 text-[color:var(--muted-foreground)] text-xs">
          <Loader2 size={14} className="animate-spin" />
          Fetching file content…
        </div>
      )}

      {/* Diff Editor */}
      {!collapsed && !isLoading && (
        <div className="bg-[#1e1e1e] relative">
          {!editorReady && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#1e1e1e]">
              <div className="flex items-center gap-2 text-[color:var(--muted-foreground)] text-xs">
                <Loader2 size={13} className="animate-spin" />
                Loading diff…
              </div>
            </div>
          )}
          <DiffEditor
            height="260px"
            language={lang}
            theme="vs-dark"
            original={originalContent}
            modified={modifiedContent}
            loading={
              <div className="flex items-center gap-2 text-[color:var(--muted-foreground)] text-xs justify-center h-[260px]">
                <Loader2 size={13} className="animate-spin" />
                Loading diff…
              </div>
            }
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              renderOverviewRuler: false,
              wordWrap: "on",
              fontSize: 11,
              lineNumbers: "on",
              glyphMargin: false,
              folding: false,
              lineDecorationsWidth: 4,
              lineNumbersMinChars: 3,
              renderSideBySide: false,
              ignoreTrimWhitespace: false,
              diffAlgorithm: "advanced",
            }}
            onMount={() => setEditorReady(true)}
          />
        </div>
      )}
    </div>
  )
}
