import { useEffect, useState } from "react"
import { Editor } from "@monaco-editor/react"
import { ClipboardList, Save, FileText, ListChecks, AlertCircle, Loader2 } from "lucide-react"
import { callWorkspaceApi } from "../../tools/backendApi"

function guessLanguage(path: string) {
  if (path.endsWith(".md")) return "markdown"
  if (path.endsWith(".py")) return "python"
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript"
  return "plaintext"
}

async function readMaybe(path: string) {
  try {
    const res = await callWorkspaceApi("/workspace/read", { path })
    const r = res as { content?: unknown }
    return String(r?.content || "")
  } catch {
    return ""
  }
}

async function write(path: string, content: string) {
  await callWorkspaceApi("/workspace/write", { path, content })
}

export default function PlanPanel() {
  const [plan, setPlan] = useState("")
  const [todos, setTodos] = useState("")
  const [active, setActive] = useState<"plan" | "todos">("plan")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [p, t] = await Promise.all([readMaybe("PLAN.md"), readMaybe("TODOS.md")])
        if (!mounted) return
        setPlan(p)
        setTodos(t)
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function saveAll() {
    try {
      setSaving(true)
      setError(null)
      await Promise.all([write("PLAN.md", plan || ""), write("TODOS.md", todos || "")])
      setSavedAt(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardList size={15} className="text-[color:var(--accent)]" />
          Plan
          {savedAt && <span className="text-[10px] text-[color:var(--muted-foreground)] font-normal">saved</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={saveAll}
            disabled={saving || loading}
            className="nc-btn h-8 text-xs"
            title="Save PLAN.md and TODOS.md"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
        </div>
      </div>

      <div className="px-3 pt-3 flex items-center gap-1" role="tablist">
        <button
          onClick={() => setActive("plan")}
          aria-selected={active === "plan"}
          className="nc-tab inline-flex items-center gap-1.5"
        >
          <FileText size={12} />
          PLAN.md
        </button>
        <button
          onClick={() => setActive("todos")}
          aria-selected={active === "todos"}
          className="nc-tab inline-flex items-center gap-1.5"
        >
          <ListChecks size={12} />
          TODOS.md
        </button>
      </div>

      {error && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-lg border border-red-700/40 bg-red-900/20 text-xs text-red-200 flex items-start gap-2">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="px-3 pt-2 text-[11px] text-[color:var(--muted-foreground)]">
        Edit and save. Click <span className="text-[color:var(--foreground)]">Build</span> to switch to Agent mode and execute.
      </div>

      <div className="flex-1 min-h-0 p-3">
        {loading ? (
          <div className="h-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] flex items-center justify-center text-xs text-[color:var(--muted-foreground)] gap-2">
            <Loader2 size={14} className="animate-spin" /> Loading workspace files…
          </div>
        ) : (
          <div className="h-full rounded-xl border border-[color:var(--border)] overflow-hidden bg-[color:var(--bg-elevated)]">
            <Editor
              key={active}
              height="100%"
              language={guessLanguage(active === "plan" ? "PLAN.md" : "TODOS.md")}
              theme="vs-dark"
              value={active === "plan" ? plan : todos}
              onChange={(v) => (active === "plan" ? setPlan(v || "") : setTodos(v || ""))}
              options={{
                minimap: { enabled: false },
                wordWrap: "on",
                fontSize: 12,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 8, bottom: 8 },
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
