import { useEffect, useState } from "react"
import { Editor } from "@monaco-editor/react"
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

export default function PlanPanel({ onBuild }: { onBuild: () => void }) {
  const [plan, setPlan] = useState("")
  const [todos, setTodos] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError(null)
      const [p, t] = await Promise.all([readMaybe("PLAN.md"), readMaybe("TODOS.md")])
      if (!mounted) return
      setPlan(p)
      setTodos(t)
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function saveAll() {
    try {
      setSaving(true)
      setError(null)
      await Promise.all([
        write("PLAN.md", plan || ""),
        write("TODOS.md", todos || "")
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between">
        <div className="text-sm font-semibold">Plan</div>
        <div className="flex items-center gap-2">
          <button
            onClick={saveAll}
            disabled={saving || loading}
            className="px-3 py-1.5 text-xs rounded-lg border border-[color:var(--border)] hover:border-[color:var(--border-strong)] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={onBuild}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded-lg bg-[color:var(--accent)] text-black hover:brightness-110 disabled:opacity-50"
          >
            Build
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-red-300 border-b border-[color:var(--border)] bg-red-900/20">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-4 text-xs text-[color:var(--muted-foreground)]">Loading PLAN.md / TODOS.md…</div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-2 text-xs text-[color:var(--muted-foreground)] border-b border-[color:var(--border)]">
            Edit `PLAN.md` and `TODOS.md`. Then click Build to switch to Agent mode and execute.
          </div>

          <div className="flex-1 overflow-hidden grid grid-rows-2">
            <div className="border-b border-[color:var(--border)]">
              <div className="px-4 py-2 text-xs font-semibold text-[color:var(--foreground)]">PLAN.md</div>
              <Editor
                height="calc(50vh - 80px)"
                language={guessLanguage("PLAN.md")}
                theme="vs-dark"
                value={plan}
                onChange={(v) => setPlan(v || "")}
                options={{
                  minimap: { enabled: false },
                  wordWrap: "on",
                  fontSize: 12,
                  scrollBeyondLastLine: false,
                  automaticLayout: true
                }}
              />
            </div>

            <div>
              <div className="px-4 py-2 text-xs font-semibold text-[color:var(--foreground)]">TODOS.md</div>
              <Editor
                height="calc(50vh - 80px)"
                language={guessLanguage("TODOS.md")}
                theme="vs-dark"
                value={todos}
                onChange={(v) => setTodos(v || "")}
                options={{
                  minimap: { enabled: false },
                  wordWrap: "on",
                  fontSize: 12,
                  scrollBeyondLastLine: false,
                  automaticLayout: true
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

