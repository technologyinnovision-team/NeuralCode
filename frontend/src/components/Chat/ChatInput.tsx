import {
  useEffect, useRef, useState, useCallback,
  type ChangeEvent, type KeyboardEvent, type DragEvent, type ClipboardEvent,
} from "react"
import {
  ArrowUp, Loader2, Bot, ClipboardList, Bug, MessageCircleQuestion,
  ChevronDown, Check, X, Paperclip, Image as ImageIcon, FileCode, AtSign,
} from "lucide-react"
import { loadAIConfig, saveAIConfig } from "../../utils/aiConfig"

type Mode = "agent" | "plan" | "debug" | "ask"

const MODES: { value: Mode; label: string; icon: React.ComponentType<{ size?: number }>; hint: string }[] = [
  { value: "agent", label: "Agent", icon: Bot, hint: "Build & take actions" },
  { value: "plan", label: "Plan", icon: ClipboardList, hint: "Plan first, then build" },
  { value: "debug", label: "Debug", icon: Bug, hint: "Debug & verify" },
  { value: "ask", label: "Ask", icon: MessageCircleQuestion, hint: "Q&A only — no tools" },
]

export type AttachedImage = {
  id: string
  name: string
  dataUrl: string
  mimeType: string
}

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined) || "http://localhost:8000"

export default function ChatInput({
  onSend,
  disabled,
  selectedModel,
  selectedMode,
  onModelChange,
  onModeChange,
  prefill,
  pendingChangesCount = 0,
  onAcceptAll,
  onRejectAll,
  workspaceFiles = [],
}: {
  onSend: (payload: { message: string; model: string; mode: Mode; images?: AttachedImage[] }) => void
  disabled?: boolean
  runStatusLabel?: string | null
  contextUsedTokens?: number
  contextMaxTokens?: number
  selectedModel?: string
  selectedMode?: Mode
  onModelChange?: (model: string) => void
  onModeChange?: (mode: Mode) => void
  prefill?: string
  pendingChangesCount?: number
  onAcceptAll?: () => void
  onRejectAll?: () => void
  workspaceFiles?: string[]
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const config = loadAIConfig()
  const [text, setText] = useState("")
  const [images, setImages] = useState<AttachedImage[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionAnchor, setMentionAnchor] = useState<{ start: number; end: number } | null>(null)
  const [filteredFiles, setFilteredFiles] = useState<string[]>([])
  const [mentionIdx, setMentionIdx] = useState(0)

  const models = (config?.enabledModels || []) as string[]
  const internalSelectedModel = selectedModel ?? ((config?.selectedModel || models[0] || "") as string)
  const internalSelectedMode = (selectedMode ?? ((config?.selectedMode || "agent") as Mode)) as Mode

  useEffect(() => {
    if (typeof prefill === "string" && prefill.length) {
      setText(prefill)
      requestAnimationFrame(() => {
        const el = textareaRef.current
        if (el) {
          el.style.height = "auto"
          el.style.height = el.scrollHeight + "px"
          el.focus()
        }
      })
    }
  }, [prefill])

  const addImage = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImages((prev) => [
        ...prev,
        { id: `img_${Date.now()}_${Math.random()}`, name: file.name, dataUrl, mimeType: file.type },
      ])
    }
    reader.readAsDataURL(file)
  }, [])

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData.items
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) addImage(file)
        return
      }
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    for (const f of files) {
      if (f.type.startsWith("image/")) addImage(f)
    }
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    for (const f of files) addImage(f)
    e.target.value = ""
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  function sendMessage() {
    if (disabled) return
    if (!text.trim() && images.length === 0) return
    if (!internalSelectedModel) {
      alert("Select a model first (Settings → API → Fetch Models)")
      return
    }
    onSend({ message: text, model: internalSelectedModel, mode: internalSelectedMode, images: images.length ? images : undefined })
    setText("")
    setImages([])
    if (textareaRef.current) textareaRef.current.style.height = "44px"
  }

  function autoResize(e: ChangeEvent<HTMLTextAreaElement>) {
    const el = e.target
    el.style.height = "auto"
    el.style.height = Math.min(220, el.scrollHeight) + "px"
    const val = el.value
    setText(val)

    const cursor = el.selectionStart ?? val.length
    const before = val.slice(0, cursor)
    const atMatch = before.match(/@([\w./\-]*)$/)
    if (atMatch) {
      const query = atMatch[1]
      const start = cursor - atMatch[0].length
      setMentionQuery(query)
      setMentionAnchor({ start, end: cursor })
      const filtered = workspaceFiles
        .filter((f) => f.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
      setFilteredFiles(filtered)
      setMentionIdx(0)
    } else {
      setMentionQuery(null)
      setMentionAnchor(null)
    }
  }

  function insertMention(filePath: string) {
    if (!mentionAnchor) return
    const before = text.slice(0, mentionAnchor.start)
    const after = text.slice(mentionAnchor.end)
    const inserted = `@${filePath} `
    const newText = before + inserted + after
    setText(newText)
    setMentionQuery(null)
    setMentionAnchor(null)
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (el) {
        const pos = mentionAnchor.start + inserted.length
        el.focus()
        el.setSelectionRange(pos, pos)
        el.style.height = "auto"
        el.style.height = Math.min(220, el.scrollHeight) + "px"
      }
    })
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && filteredFiles.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx((i) => Math.min(i + 1, filteredFiles.length - 1)); return }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx((i) => Math.max(i - 1, 0)); return }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filteredFiles[mentionIdx]); return }
      if (e.key === "Escape") { setMentionQuery(null); setMentionAnchor(null); return }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function triggerAtMention() {
    const el = textareaRef.current
    if (!el) return
    const cursor = el.selectionStart ?? text.length
    const before = text.slice(0, cursor)
    const after = text.slice(cursor)
    const newText = before + "@" + after
    setText(newText)
    setMentionQuery("")
    setMentionAnchor({ start: cursor, end: cursor + 1 })
    setFilteredFiles(workspaceFiles.slice(0, 8))
    setMentionIdx(0)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(cursor + 1, cursor + 1)
    })
  }

  function changeModel(model: string) {
    if (disabled) return
    if (onModelChange) return onModelChange(model)
    if (config) saveAIConfig({ ...config, selectedModel: model })
  }

  function changeMode(mode: Mode) {
    if (disabled) return
    if (onModeChange) return onModeChange(mode)
    if (config) saveAIConfig({ ...config, selectedMode: mode })
  }

  async function fetchAndMentionFile() {
    try {
      const res = await fetch(`${BACKEND_URL}/workspace/files`)
      if (res.ok) {
        const data = await res.json() as { files?: string[] }
        if (data.files?.length) {
          triggerAtMention()
        }
      }
    } catch {
      triggerAtMention()
    }
  }

  return (
    <div className="w-full flex justify-center px-3 sm:px-6 pb-3 sm:pb-5">
      <div className="w-full max-w-[920px]">
        {/* Pending changes bar */}
        {pendingChangesCount > 0 && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/8 nc-fade-in">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-amber-400">
                {pendingChangesCount} pending file change{pendingChangesCount !== 1 ? "s" : ""}
              </span>
              <span className="text-[11px] text-[color:var(--muted-foreground)] ml-1.5">· review diffs above</span>
            </div>
            <button
              onClick={onAcceptAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 transition text-[11px] font-semibold shrink-0"
            >
              <Check size={11} /> Accept All
            </button>
            <button
              onClick={onRejectAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition text-[11px] font-semibold shrink-0"
            >
              <X size={11} /> Undo All
            </button>
          </div>
        )}

        {/* Mode pills */}
        <div className="mb-2 flex items-center gap-1 overflow-x-auto pb-1">
          {MODES.map((m) => {
            const Icon = m.icon
            const active = internalSelectedMode === m.value
            return (
              <button
                key={m.value}
                onClick={() => changeMode(m.value)}
                aria-pressed={active}
                title={m.hint}
                disabled={!!disabled}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition ${
                  active
                    ? "bg-[color:var(--accent-bg)] border-[color:var(--border-accent)] text-[color:var(--foreground)]"
                    : "bg-[color:var(--surface)] border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:border-[color:var(--border-strong)]"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Icon size={12} />
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Composer */}
        <div
          className={`rounded-3xl border ${isDragOver ? "border-[color:var(--accent)] bg-[color:var(--accent)]/5" : "border-[color:var(--border)]"} bg-[color:var(--surface)] shadow-[0_18px_60px_rgba(0,0,0,0.45)] p-2.5 sm:p-3 transition-colors relative`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          {isDragOver && (
            <div className="absolute inset-0 rounded-3xl flex items-center justify-center pointer-events-none z-10">
              <div className="flex items-center gap-2 text-[color:var(--accent)] text-sm font-medium">
                <ImageIcon size={18} />
                Drop image to attach
              </div>
            </div>
          )}

          {/* @ mention dropdown */}
          {mentionQuery !== null && filteredFiles.length > 0 && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-[color:var(--surface-2)] border border-[color:var(--border)] rounded-xl shadow-xl overflow-hidden z-50">
              <div className="px-2.5 py-1.5 border-b border-[color:var(--border)]">
                <span className="text-[10px] text-[color:var(--muted-foreground)] font-semibold uppercase tracking-wider">
                  Mention file
                </span>
              </div>
              {filteredFiles.map((f, i) => (
                <button
                  key={f}
                  onMouseDown={(e) => { e.preventDefault(); insertMention(f) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition ${
                    i === mentionIdx
                      ? "bg-[color:var(--accent)]/15 text-[color:var(--foreground)]"
                      : "hover:bg-[color:var(--bg-elevated)] text-[color:var(--muted-foreground)]"
                  }`}
                >
                  <FileCode size={11} className="shrink-0 text-[color:var(--accent)]" />
                  <span className="text-[11px] font-mono truncate">{f}</span>
                </button>
              ))}
              {filteredFiles.length === 0 && (
                <div className="px-3 py-2 text-[11px] text-[color:var(--muted-foreground)]">No matching files</div>
              )}
            </div>
          )}

          {/* Image previews */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2.5 px-1">
              {images.map((img) => (
                <div key={img.id} className="relative group rounded-lg overflow-hidden border border-[color:var(--border)] shrink-0">
                  <img src={img.dataUrl} alt={img.name} className="h-16 w-16 object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition flex items-center justify-center">
                    <button
                      onClick={() => removeImage(img.id)}
                      className="opacity-0 group-hover:opacity-100 transition h-6 w-6 rounded-full bg-red-500/80 text-white flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                    <span className="text-[9px] text-white truncate block">{img.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            placeholder={
              isDragOver
                ? "Drop image here…"
                : internalSelectedMode === "ask"
                ? "Ask a question — no tools will run…"
                : "Message NeuralCode — use @ to mention files, paste/drop images…"
            }
            onChange={autoResize}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
            disabled={!!disabled}
            className="w-full bg-transparent resize-none outline-none text-sm text-[color:var(--foreground)] placeholder-[color:var(--muted-foreground)] px-2 py-2 min-h-[44px] max-h-[220px] disabled:opacity-60 disabled:cursor-not-allowed"
          />

          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              {/* Model picker */}
              {models.length > 0 ? (
                <div className="relative">
                  <select
                    value={internalSelectedModel}
                    onChange={(e) => changeModel(e.target.value)}
                    disabled={!!disabled}
                    className="appearance-none pr-7 pl-2.5 py-1.5 text-xs rounded-lg bg-[color:var(--bg-elevated)] border border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--foreground)] outline-none disabled:opacity-50 max-w-[200px] truncate"
                    aria-label="Model"
                  >
                    {models.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--muted-foreground)]" />
                </div>
              ) : (
                <span className="text-[11px] text-[color:var(--muted-foreground)]">
                  No model — configure in Settings
                </span>
              )}

              {/* @ mention button */}
              <button
                type="button"
                onClick={fetchAndMentionFile}
                disabled={!!disabled}
                title="Mention a file (@)"
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] bg-[color:var(--bg-elevated)] border border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:border-[color:var(--border-strong)] transition disabled:opacity-40"
              >
                <AtSign size={11} />
                <span className="hidden sm:inline">File</span>
              </button>

              {/* Attach image button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!disabled}
                title="Attach image"
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] bg-[color:var(--bg-elevated)] border border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:border-[color:var(--border-strong)] transition disabled:opacity-40"
              >
                <Paperclip size={11} />
                <span className="hidden sm:inline">Image</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />

              <span className="hidden lg:inline-flex text-[11px] text-[color:var(--muted-foreground)] ml-1">
                · Enter to send · Shift+Enter for new line
              </span>
            </div>

            <button
              onClick={sendMessage}
              disabled={!!disabled || (!text.trim() && images.length === 0)}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-gradient-to-br from-[#7c5cff] to-[#5b3dff] text-white shadow-[0_10px_30px_rgba(124,92,255,0.45)] hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
              aria-label="Send"
            >
              {disabled ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
