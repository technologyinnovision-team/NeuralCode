import { useEffect, useState, useCallback } from "react"
import {
  FolderOpen, Folder, File, FileText, RefreshCw,
  ChevronRight, ChevronDown, FileCode, FileJson, FileImage,
} from "lucide-react"

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined) || "http://localhost:8000"

type TreeNode = {
  name: string
  path: string
  type: "file" | "dir"
  children?: TreeNode[]
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", type: "dir", children: [] }
  for (const filePath of paths) {
    const parts = filePath.replace(/\\/g, "/").split("/").filter(Boolean)
    let current = root
    let accumulated = ""
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      accumulated = accumulated ? `${accumulated}/${part}` : part
      const isLast = i === parts.length - 1
      let child = current.children!.find((c) => c.name === part)
      if (!child) {
        child = { name: part, path: accumulated, type: isLast ? "file" : "dir", children: isLast ? undefined : [] }
        current.children!.push(child)
      }
      current = child
    }
  }
  function sortNodes(nodes: TreeNode[]): TreeNode[] {
    return nodes
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      .map((n) => ({ ...n, children: n.children ? sortNodes(n.children) : undefined }))
  }
  return sortNodes(root.children ?? [])
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (["ts", "tsx", "js", "jsx", "py", "rs", "go", "java", "cpp", "c", "cs", "rb", "php", "swift", "kt", "sh"].includes(ext))
    return <FileCode size={12} className="text-[color:var(--accent)] shrink-0" />
  if (["json", "yaml", "yml", "toml", "env"].includes(ext))
    return <FileJson size={12} className="text-amber-400 shrink-0" />
  if (["md", "txt", "rst"].includes(ext))
    return <FileText size={12} className="text-sky-400 shrink-0" />
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext))
    return <FileImage size={12} className="text-pink-400 shrink-0" />
  return <File size={12} className="text-[color:var(--muted-foreground)] shrink-0" />
}

function TreeNodeRow({
  node, depth, selectedPath, onSelect, changedPaths,
}: {
  node: TreeNode
  depth: number
  selectedPath: string | null
  onSelect: (path: string, type: "file" | "dir") => void
  changedPaths?: Set<string>
}) {
  const [open, setOpen] = useState(depth === 0)
  const isDir = node.type === "dir"
  const isSelected = selectedPath === node.path
  const isChanged = changedPaths?.has(node.path)

  function toggle() {
    if (isDir) setOpen((v) => !v)
    else onSelect(node.path, "file")
  }

  return (
    <div>
      <button
        onClick={toggle}
        title={node.path}
        className={`w-full flex items-center gap-1.5 py-[3px] pr-2 rounded-md text-left transition ${
          isSelected
            ? "bg-[color:var(--accent)]/15 text-[color:var(--foreground)]"
            : "hover:bg-[color:var(--bg-elevated)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {isDir ? (
          <>
            <span className="shrink-0 text-[color:var(--muted-foreground)]">
              {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </span>
            <span className="shrink-0">
              {open
                ? <FolderOpen size={12} className="text-amber-400" />
                : <Folder size={12} className="text-amber-400" />}
            </span>
          </>
        ) : (
          <span className="w-[11px] shrink-0" />
        )}
        {!isDir && fileIcon(node.name)}
        <span className={`text-[11px] truncate font-mono leading-none ${isChanged ? "text-amber-400" : ""}`}>
          {node.name}
        </span>
        {isChanged && <span className="ml-auto shrink-0 h-1.5 w-1.5 rounded-full bg-amber-400" />}
      </button>
      {isDir && open && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              changedPaths={changedPaths}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FileExplorerPanel({
  changedPaths,
  onOpenFile,
}: {
  changedPaths?: Set<string>
  onOpenFile?: (path: string, content: string) => void
}) {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BACKEND_URL}/workspace/files`)
      if (!res.ok) throw new Error(`${res.status}`)
      const data = (await res.json()) as { files?: string[] }
      setTree(buildTree(data.files || []))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  async function selectFile(path: string, type: "file" | "dir") {
    if (type === "dir") return
    setSelectedPath(path)
    setFileContent(null)
    setLoadingFile(true)
    try {
      const res = await fetch(`${BACKEND_URL}/workspace/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      })
      const data = (await res.json()) as { content?: string }
      const content = data.content ?? ""
      setFileContent(content)
      if (onOpenFile) {
        onOpenFile(path, content)
        setSelectedPath(null)
        setFileContent(null)
      }
    } catch {
      setFileContent("(could not load file)")
    } finally {
      setLoadingFile(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[color:var(--border)] shrink-0">
        <span className="text-[11px] font-semibold text-[color:var(--foreground)] uppercase tracking-widest">
          Explorer
        </span>
        <button onClick={fetchFiles} disabled={loading} title="Refresh" className="nc-icon-btn h-7 w-7">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <div className="mx-3 mt-2 text-[11px] text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-2.5 py-2">
          {error === "Failed to fetch"
            ? "No workspace open · open a workspace to browse files"
            : `Error: ${error}`}
        </div>
      )}

      {/* File tree — always shown when onOpenFile is provided; otherwise fall back to inline viewer */}
      {(onOpenFile || !selectedPath) && (
        <div className="flex-1 overflow-y-auto py-1 px-1.5">
          {loading && tree.length === 0 ? (
            <div className="px-3 py-4 text-[11px] text-[color:var(--muted-foreground)]">Loading…</div>
          ) : tree.length === 0 && !error ? (
            <div className="px-3 py-4 text-[11px] text-[color:var(--muted-foreground)]">No files found in workspace.</div>
          ) : (
            tree.map((node) => (
              <TreeNodeRow
                key={node.path}
                node={node}
                depth={0}
                selectedPath={selectedPath}
                onSelect={selectFile}
                changedPaths={changedPaths}
              />
            ))
          )}
        </div>
      )}

      {/* Inline file viewer (when no tab handler provided) */}
      {!onOpenFile && selectedPath && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[color:var(--border)] bg-[color:var(--bg-elevated)]/60 shrink-0">
            <button
              onClick={() => { setSelectedPath(null); setFileContent(null) }}
              className="text-[10px] text-[color:var(--accent)] hover:underline shrink-0"
            >
              ← Back
            </button>
            <span className="text-[10px] font-mono text-[color:var(--muted-foreground)] truncate">
              {selectedPath}
            </span>
          </div>
          <div className="flex-1 overflow-auto bg-[#1e1e1e]">
            {loadingFile ? (
              <div className="p-4 text-[11px] text-[color:var(--muted-foreground)]">Loading…</div>
            ) : (
              <pre className="p-3 text-[11px] font-mono text-gray-200 whitespace-pre leading-relaxed">
                {fileContent}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
