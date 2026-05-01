import { useRef, useState } from "react"
import { DiffEditor, loader } from "@monaco-editor/react"
import { Code, Check, AlertTriangle, Loader2 } from "lucide-react"

loader.config({
  paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs" },
})

interface DiffViewerProps {
  original: string
  modified: string
  language?: string
  height?: string
  filePath?: string
}

export default function DiffViewer({
  original,
  modified,
  language = "python",
  height = "300px",
  filePath = "file.txt",
}: DiffViewerProps) {
  const editorRef = useRef<unknown>(null)
  const [editorError] = useState(false)
  const [editorReady, setEditorReady] = useState(false)

  const calculateChanges = () => {
    const originalLines = original.split("\n").length
    const modifiedLines = modified.split("\n").length
    return modifiedLines - originalLines
  }

  const changes = calculateChanges()

  if (editorError) {
    return (
      <div className="w-full">
        <div className="bg-red-900/20 border border-red-700/40 rounded-t-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-400" size={14} />
            <div className="flex flex-col">
              <span className="text-red-200 font-semibold text-sm">{filePath}</span>
              <span className="text-red-300/80 text-xs">Editor failed to load — showing plain diff</span>
            </div>
          </div>
        </div>
        <div className="border border-t-0 border-red-700/40 rounded-b-2xl overflow-hidden bg-black/30 p-4">
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-black/30 p-2 rounded">
              <div className="text-red-300 mb-1">Original:</div>
              <pre className="text-slate-200/80 whitespace-pre-wrap">{original}</pre>
            </div>
            <div className="bg-black/30 p-2 rounded">
              <div className="text-green-300 mb-1">Modified:</div>
              <pre className="text-slate-200/80 whitespace-pre-wrap">{modified}</pre>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-t-2xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Code className="text-[color:var(--accent)]" size={14} />
            <div className="flex flex-col">
              <span className="text-[color:var(--foreground)] font-semibold text-sm">{filePath}</span>
              <span className="text-[color:var(--muted-foreground)] text-xs">
                {original.split("\n").length} lines → {modified.split("\n").length} lines
                {changes !== 0 && (
                  <span className={changes > 0 ? "text-green-300 ml-2" : "text-red-300 ml-2"}>
                    ({changes > 0 ? "+" : ""}
                    {changes})
                  </span>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-black/20 border border-[color:var(--border)] rounded-xl">
            <Check size={12} className="text-green-400" />
            <span className="text-[color:var(--muted-foreground)] text-xs font-semibold">Diff</span>
          </div>
        </div>
      </div>

      <div className="border border-t-0 border-[color:var(--border)] rounded-b-2xl overflow-hidden bg-[#1e1e1e] relative">
        {!editorReady && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#1e1e1e]">
            <div className="flex items-center gap-2 text-[color:var(--muted-foreground)] text-xs">
              <Loader2 size={14} className="animate-spin" />
              Loading diff…
            </div>
          </div>
        )}
        <DiffEditor
          height={height}
          language={language}
          theme="vs-dark"
          original={original}
          modified={modified}
          loading={
            <div className="flex items-center gap-2 text-[color:var(--muted-foreground)] text-xs justify-center h-full">
              <Loader2 size={14} className="animate-spin" />
              Loading diff…
            </div>
          }
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            renderOverviewRuler: false,
            diffWordWrap: "on",
            wordWrap: "on",
            fontSize: 12,
            lineNumbers: "on",
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
            renderSideBySide: true,
            ignoreTrimWhitespace: false,
            diffAlgorithm: "advanced",
          }}
          onMount={(editor) => {
            editorRef.current = editor
            setEditorReady(true)
          }}
        />
      </div>

      <div className="text-xs text-[color:var(--muted-foreground)] mt-2 px-1">
        <span className="text-green-300">+ Additions</span>
        <span className="mx-2">•</span>
        <span className="text-red-300">- Deletions</span>
        <span className="mx-2">•</span>
        <span className="text-[color:var(--accent)]">~ Modifications</span>
      </div>
    </div>
  )
}
