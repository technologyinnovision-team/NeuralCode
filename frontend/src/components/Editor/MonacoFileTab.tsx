import { useEffect, useRef, useState } from "react"
import Editor, { loader } from "@monaco-editor/react"
import { Save, Loader2, AlertCircle } from "lucide-react"

loader.config({
  paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs" },
})

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined) || "http://localhost:8000"

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
    toml: "toml", env: "plaintext", txt: "plaintext",
  }
  return map[ext] ?? "plaintext"
}

type Props = {
  path: string
  initialContent: string
}

export default function MonacoFileTab({ path, initialContent }: Props) {
  const [content, setContent] = useState(initialContent)
  const [savedContent, setSavedContent] = useState(initialContent)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [monacoReady, setMonacoReady] = useState(false)
  const editorRef = useRef<unknown>(null)

  useEffect(() => {
    setContent(initialContent)
    setSavedContent(initialContent)
  }, [path, initialContent])

  const isDirty = content !== savedContent
  const language = detectLanguage(path)

  async function saveFile() {
    if (!isDirty || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`${BACKEND_URL}/workspace/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      setSavedContent(content)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault()
      saveFile()
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  })

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[color:var(--border)] bg-[color:var(--bg-elevated)]/80 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[color:var(--muted-foreground)] truncate max-w-[400px]">
            {path}
          </span>
          {isDirty && (
            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {saveError && (
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <AlertCircle size={10} /> {saveError}
            </span>
          )}
          <button
            onClick={saveFile}
            disabled={!isDirty || saving}
            title="Save (Ctrl+S)"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[color:var(--accent)]/15 border border-[color:var(--border-accent)] text-[color:var(--accent)] hover:bg-[color:var(--accent)]/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {!monacoReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e] z-10">
            <div className="flex items-center gap-2 text-[color:var(--muted-foreground)] text-xs">
              <Loader2 size={14} className="animate-spin" />
              Loading editor…
            </div>
          </div>
        )}
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={content}
          onChange={(v) => setContent(v ?? "")}
          onMount={(editor) => {
            editorRef.current = editor
            setMonacoReady(true)
          }}
          loading={
            <div className="flex items-center gap-2 text-[color:var(--muted-foreground)] text-xs h-full justify-center">
              <Loader2 size={14} className="animate-spin" />
              Loading editor…
            </div>
          }
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: "on",
            fontSize: 13,
            lineNumbers: "on",
            glyphMargin: false,
            folding: true,
            lineDecorationsWidth: 4,
            lineNumbersMinChars: 3,
            tabSize: 2,
            insertSpaces: true,
          }}
        />
      </div>
    </div>
  )
}
