import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import ChatMessage from "./ChatMessage"
import ChatInput, { type AttachedImage } from "./ChatInput"
import EmptyState from "./EmptyState"
import { loadAIConfig, saveAIConfig } from "../../utils/aiConfig"
import LeftRail, { type RailKey } from "../Layout/LeftRail"
import WorkspacePanel from "../Layout/WorkspacePanel"
import StatusBar from "../Layout/StatusBar"
import MonacoFileTab from "../Editor/MonacoFileTab"
import type { ToolHistoryItem } from "../Plan/ToolsHistoryPanel"
import {
  loadSessions, saveSession, deleteSession, clearAllSessions,
  getCurrentSessionId, setCurrentSessionId, generateSessionId, deriveTitle,
  type ChatSession,
} from "../../utils/chatHistory"
import { MessageSquare, X, FileCode } from "lucide-react"

const TOOL_TAGS = new Set([
  "Call_Tool_List_Files", "read_content_file", "search_in_files",
  "lines_editor", "create_file", "run_command",
])
const FILE_EDIT_TOOLS = new Set(["lines_editor", "create_file", "write_file"])
const UI_TAGS = new Set(["todos"])

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined) || "http://localhost:8000"

export type PendingChange = {
  toolCallId: string
  name: string
  path: string
  originalContent: string
  modifiedContent: string
  diffStatus: "pending" | "accepted" | "rejected" | "loading"
}

type AppTab =
  | { type: "chat"; id: "chat" }
  | { type: "file"; id: string; path: string; content: string }

type ChatProps = {
  workspace?: string | null
  onOpenTerminal: () => void
  onOpenSettings: () => void
  panelOpen: boolean
  setPanelOpen: (b: boolean) => void
  leftMobileOpen: boolean
  setLeftMobileOpen: (b: boolean) => void
}

type ToolLoadingState = {
  toolName: string
  tagName?: string
  isLoading: boolean
  countdownSeconds?: number
}

type ToolEvent =
  | { type: "plan"; sequence: number; toolCall: Record<string, unknown> }
  | { type: "block_start"; sequence: number; toolCallId: string; tag_name?: string; tool_name?: string; attributes?: Record<string, unknown> }
  | { type: "block_update"; sequence: number; toolCallId: string; payload: string; isStreaming: boolean }
  | { type: "loading"; sequence: number; toolCallId: string; tool_name: string; tag_name?: string; is_loading: boolean; delay_seconds?: number }
  | { type: "result"; sequence: number; toolCallId: string; result: unknown; tool_name?: string; tag_name?: string; attributes?: Record<string, unknown> }

type StreamTextEvent = { type: "text"; content: string }
type EventLogItem = StreamTextEvent | ToolEvent

export type ChatMsg = {
  role: "user" | "assistant"
  content?: string
  streaming?: boolean
  awaitingFirstResponse?: boolean
  streamingContent?: string
  eventLog?: EventLogItem[]
  toolEvents?: ToolEvent[]
  toolCalls?: unknown[]
  toolBlocks?: unknown[]
  toolLoadingStates?: Record<string, ToolLoadingState>
  toolResults?: unknown[]
}

type Mode = "agent" | "plan" | "debug" | "ask"
type SendPayload = { message: string; model: string; mode: Mode; images?: AttachedImage[] }

type StreamEvent =
  | { type: "content"; content: string }
  | { type: "tool_calls"; tool_calls?: unknown[] }
  | { type: "tool_block_start"; tool_call_id: string; tool_name?: string; tag_name?: string; attributes?: Record<string, unknown> }
  | { type: "tool_block"; tool_call_id: string; tool_name?: string; tag_name?: string; attributes?: Record<string, unknown>; payload?: string }
  | { type: "tool_loading"; tool_call_id: string; tool_name: string; tag_name?: string; is_loading: boolean; delay_seconds?: number }
  | { type: "tool_result"; tool_call_id: string; result: unknown; tool_name?: string; tag_name?: string; attributes?: Record<string, unknown> }
  | { type: "task_status"; status: "pending" | "completed" }
  | { type: "agent_phase"; phase: string; label: string }
  | { type: "ui_block"; ui_type: "todos"; title?: string; items?: Array<{ text: string; done: boolean }> }
  | { type: "final"; content?: string }

function fileTabId(path: string) {
  return `file:${path}`
}

function detectFileIcon(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  if (["ts", "tsx", "js", "jsx", "py", "rs", "go", "java", "cpp", "c"].includes(ext))
    return <FileCode size={12} className="text-[color:var(--accent)] shrink-0" />
  return <FileCode size={12} className="text-[color:var(--muted-foreground)] shrink-0" />
}

export default function ChatLayout({
  workspace,
  onOpenTerminal,
  onOpenSettings,
  panelOpen,
  setPanelOpen,
  leftMobileOpen,
  setLeftMobileOpen,
}: ChatProps) {
  // ─── Session state ────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions())
  const [currentSessionId, setCurrentSessionId2] = useState<string | null>(() => getCurrentSessionId())

  // ─── Chat state ───────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    const id = getCurrentSessionId()
    if (id) {
      const s = loadSessions().find((s) => s.id === id)
      if (s) return s.messages.map((m) => ({ role: m.role, content: m.content }))
    }
    return []
  })

  // ─── Tab system ───────────────────────────────────────────────────────────
  const [tabs, setTabs] = useState<AppTab[]>([{ type: "chat", id: "chat" }])
  const [activeTabId, setActiveTabId] = useState<string>("chat")

  // ─── Other UI state ───────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false)
  const [runStatusLabel, setRunStatusLabel] = useState<string | null>(null)
  const [contextUsedTokens, setContextUsedTokens] = useState(0)
  const [contextMaxTokens, setContextMaxTokens] = useState(8192)
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [selectedMode, setSelectedMode] = useState<Mode>("agent")
  const [stickyTodos, setStickyTodos] = useState<Array<{ text: string; done: boolean }>>([])
  const [activeRail, setActiveRail] = useState<RailKey>("chat")
  const [history, setHistory] = useState<ToolHistoryItem[]>([])
  const [composerPrefill, setComposerPrefill] = useState<string | undefined>(undefined)
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map())
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([])

  // ─── Ref for pendingChanges (fix stale closure in streaming handler) ───────
  const pendingChangesRef = useRef<Map<string, PendingChange>>(new Map())
  useEffect(() => { pendingChangesRef.current = pendingChanges }, [pendingChanges])

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ─── Fetch workspace files for @ mention ──────────────────────────────────
  const fetchWorkspaceFiles = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/workspace/files`)
      if (res.ok) {
        const data = await res.json() as { files?: string[] }
        setWorkspaceFiles(data.files || [])
      }
    } catch { /* offline */ }
  }, [])

  useEffect(() => { fetchWorkspaceFiles() }, [fetchWorkspaceFiles])

  // Re-fetch files when workspace changes
  useEffect(() => {
    if (workspace) fetchWorkspaceFiles()
  }, [workspace, fetchWorkspaceFiles])

  // ─── Session persistence ──────────────────────────────────────────────────
  const persistSession = useCallback((msgs: ChatMsg[], sessionId: string | null) => {
    if (msgs.length === 0) return
    const id = sessionId ?? generateSessionId()
    const serialized = msgs.map((m) => ({
      role: m.role as "user" | "assistant",
      content: (m.content || m.streamingContent || "").trim(),
    })).filter((m) => m.content)

    if (serialized.length === 0) return
    const session: ChatSession = {
      id,
      title: deriveTitle(serialized),
      messages: serialized,
      createdAt: loadSessions().find((s) => s.id === id)?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    }
    saveSession(session)
    setSessions(loadSessions())
    if (!sessionId) {
      setCurrentSessionId2(id)
      setCurrentSessionId(id)
      return id
    }
    return id
  }, [])

  // Auto-save session when messages change
  useEffect(() => {
    if (messages.length === 0) return
    const id = persistSession(messages, currentSessionId)
    if (id && !currentSessionId) setCurrentSessionId2(id)
  }, [messages]) // eslint-disable-line react-hooks/exhaustive-deps

  function switchSession(id: string) {
    const session = sessions.find((s) => s.id === id)
    if (!session) return
    setCurrentSessionId2(id)
    setCurrentSessionId(id)
    setMessages(session.messages.map((m) => ({ role: m.role, content: m.content })))
    setActiveTabId("chat")
    setTabs((prev) => {
      const fileOnly = prev.filter((t) => t.type !== "chat")
      return [{ type: "chat", id: "chat" }, ...fileOnly]
    })
    setPanelOpen(false)
  }

  function newSession() {
    setCurrentSessionId2(null)
    setCurrentSessionId(null)
    setMessages([])
    setStickyTodos([])
    setHistory([])
    setPendingChanges(new Map())
    setActiveTabId("chat")
    setTabs([{ type: "chat", id: "chat" }])
  }

  function handleDeleteSession(id: string) {
    deleteSession(id)
    setSessions(loadSessions())
    if (id === currentSessionId) newSession()
  }

  function handleClearSessions() {
    clearAllSessions()
    setSessions([])
    newSession()
  }

  // ─── File tabs ────────────────────────────────────────────────────────────
  function openFileTab(path: string, content: string) {
    const id = fileTabId(path)
    setTabs((prev) => {
      if (prev.some((t) => t.id === id)) return prev
      return [...prev, { type: "file", id, path, content }]
    })
    setActiveTabId(id)
    setPanelOpen(false)
  }

  function closeTab(id: string) {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      const next = prev.filter((t) => t.id !== id)
      if (activeTabId === id) {
        const newActive = next[Math.max(0, idx - 1)]
        setActiveTabId(newActive?.id ?? "chat")
      }
      return next.length === 0 ? [{ type: "chat", id: "chat" }] : next
    })
  }

  // ─── Workspace file helpers ───────────────────────────────────────────────
  async function fetchFileContent(path: string): Promise<string> {
    try {
      const res = await fetch(`${BACKEND_URL}/workspace/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      })
      if (!res.ok) return ""
      const data = await res.json() as { content?: string }
      return data.content ?? ""
    } catch { return "" }
  }

  // ─── Accept / reject changes ──────────────────────────────────────────────
  function acceptChange(toolCallId: string) {
    setPendingChanges((prev) => {
      const next = new Map(prev)
      const entry = next.get(toolCallId)
      if (entry) next.set(toolCallId, { ...entry, diffStatus: "accepted" })
      return next
    })
  }

  async function rejectChange(toolCallId: string) {
    const entry = pendingChangesRef.current.get(toolCallId)
    if (!entry) return
    try {
      await fetch(`${BACKEND_URL}/workspace/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: entry.path, content: entry.originalContent }),
      })
    } catch { /* ignore */ }
    setPendingChanges((prev) => {
      const next = new Map(prev)
      const e = next.get(toolCallId)
      if (e) next.set(toolCallId, { ...e, diffStatus: "rejected" })
      return next
    })
  }

  function acceptAllChanges() {
    setPendingChanges((prev) => {
      const next = new Map(prev)
      for (const [id, entry] of next) {
        if (entry.diffStatus === "pending") next.set(id, { ...entry, diffStatus: "accepted" })
      }
      return next
    })
  }

  async function rejectAllChanges() {
    const promises: Promise<void>[] = []
    for (const [, entry] of pendingChangesRef.current) {
      if (entry.diffStatus === "pending") {
        promises.push(
          fetch(`${BACKEND_URL}/workspace/write`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: entry.path, content: entry.originalContent }),
          }).then(() => {}).catch(() => {})
        )
      }
    }
    await Promise.all(promises)
    setPendingChanges((prev) => {
      const next = new Map(prev)
      for (const [id, entry] of next) {
        if (entry.diffStatus === "pending") next.set(id, { ...entry, diffStatus: "rejected" })
      }
      return next
    })
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  useEffect(() => {
    const config = loadAIConfig()
    const max = Number(config?.contextWindowTokens || 8192)
    setContextMaxTokens(Number.isFinite(max) && max > 0 ? max : 8192)
    setSelectedModel(String(config?.selectedModel || (config?.enabledModels?.[0] || "")))
    setSelectedMode((config?.selectedMode || "agent") as Mode)
  }, [])

  useEffect(() => {
    const approxTokens = (text: string) => Math.ceil((text || "").length / 4)
    const used = messages.reduce((sum, m) => {
      return sum + approxTokens(m.content || m.streamingContent || "") + 6
    }, 0)
    setContextUsedTokens(used)
  }, [messages])

  useEffect(() => {
    if (stickyTodos.length > 0) {
      setPanelOpen(true)
      setActiveRail((cur) => (cur === "chat" ? "tasks" : cur))
    }
  }, [stickyTodos.length, setPanelOpen])

  const badges = useMemo(() => ({
    tasks: stickyTodos.length || undefined,
    history: history.length || undefined,
    sessions: sessions.length || undefined,
  } as Partial<Record<RailKey, number | string>>), [stickyTodos.length, history.length, sessions.length])

  function selectRail(k: RailKey) {
    setActiveRail(k)
    if (k === "chat") {
      setPanelOpen(false)
      setActiveTabId("chat")
    } else {
      setPanelOpen(true)
    }
  }

  // ─── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(data: SendPayload) {
    const config = loadAIConfig()
    if (!config) { onOpenSettings(); return }
    if (isRunning) return
    setIsRunning(true)
    setRunStatusLabel("Queued…")
    setComposerPrefill(undefined)
    setActiveTabId("chat")

    const userContent = data.message + (data.images?.length ? ` [${data.images.length} image(s) attached]` : "")
    const userMessage: ChatMsg = { role: "user", content: userContent }
    const aiMessage: ChatMsg = {
      role: "assistant", content: "", streaming: true, awaitingFirstResponse: true,
      streamingContent: "", eventLog: [], toolEvents: [],
      toolCalls: [], toolBlocks: [], toolLoadingStates: {}, toolResults: [],
    }

    setMessages((prev) => [...prev, userMessage, aiMessage])
    const aiIndex = messages.length + 1

    let toolEventSequence = 0

    try {
      const historyToSend = [...messages, userMessage]
        .filter((m) => (m.content || "").trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content || "" }))

      const response = await fetch(`${BACKEND_URL}/chat/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyToSend,
          model: data.model,
          mode: data.mode,
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          maxOutputTokens: Number(config.maxOutputTokens || 16384),
        }),
      })

      if (!response.ok) throw new Error(`Agent request failed: ${response.status}`)

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      let currentStreamingContent = ""
      let currentToolCalls: unknown[] = []
      let currentToolBlocks: unknown[] = []
      let currentToolLoadingStates: Record<string, ToolLoadingState> = {}
      let currentToolResults: unknown[] = []
      let parserBuffer = ""
      let activeTagName: string | null = null
      let activeTagPayload = ""
      let activeToolCallId: string | null = null
      let activeTagKind: "tool" | "ui" | null = null
      let activeUiAttrs: Record<string, string> = {}
      let firstEventReceived = false
      // Local synchronous map — updated immediately on tool_block_start,
      // so tool_result can always find the entry without React state/ref timing issues
      const localPendingMap = new Map<string, PendingChange>()

      const updateMessage = (updates: Partial<ChatMsg>) => {
        setMessages((prev) => {
          const updated = [...prev]
          if (updated[aiIndex]) updated[aiIndex] = { ...updated[aiIndex], ...updates }
          return updated
        })
      }

      const appendEventLog = (events: EventLogItem[]) => {
        setMessages((prev) => {
          const updated = [...prev]
          if (updated[aiIndex]) {
            const log = (updated[aiIndex].eventLog || []) as EventLogItem[]
            updated[aiIndex] = { ...updated[aiIndex], eventLog: [...log, ...events] }
          }
          return updated
        })
      }

      const addToolEvent = (event: ToolEvent) => {
        setMessages((prev) => {
          const updated = [...prev]
          if (updated[aiIndex]) {
            const events = (updated[aiIndex].toolEvents || []) as ToolEvent[]
            updated[aiIndex] = { ...updated[aiIndex], toolEvents: [...events, event] }
          }
          return updated
        })
        appendEventLog([event])
      }

      const upsertToolBlock = (toolCallId: string, updates: Record<string, unknown>) => {
        const idx = currentToolBlocks.findIndex((b: unknown) =>
          typeof b === "object" && b !== null && (b as Record<string, unknown>).tool_call_id === toolCallId
        )
        if (idx >= 0) {
          currentToolBlocks[idx] = { ...(currentToolBlocks[idx] as Record<string, unknown>), ...updates }
        } else {
          currentToolBlocks = [...currentToolBlocks, { tool_call_id: toolCallId, ...updates }]
        }
        updateMessage({ toolBlocks: [...currentToolBlocks] })
      }

      const parseAttrs = (raw: string) => {
        const attrs: Record<string, string> = {}
        const re = /([A-Za-z_][\w-]*)\s*=\s*"([^"]*)"/g
        let m: RegExpExecArray | null
        while ((m = re.exec(raw)) !== null) attrs[m[1]] = m[2] || ""
        return attrs
      }

      const parseTodosMarkdown = (md: string) => {
        const items: Array<{ text: string; done: boolean }> = []
        for (const line of (md || "").split("\n")) {
          const m = line.match(/^\s*-\s*\[( |x|X)\]\s+(.*)\s*$/)
          if (m) items.push({ done: m[1].toLowerCase() === "x", text: (m[2] || "").trim() })
        }
        return items
      }

      const commitUiTag = (tagName: string, _attrs: Record<string, string>, payload: string) => {
        if (tagName === "todos") {
          const parsed = parseTodosMarkdown(payload)
          if (parsed.length) setStickyTodos(parsed)
        }
      }

      const consumeParserBuffer = () => {
        while (true) {
          if (activeTagName) {
            const closeTag = `</${activeTagName}>`
            const closeIdx = parserBuffer.indexOf(closeTag)
            if (closeIdx === -1) {
              if (parserBuffer) {
                const keep = Math.max(0, closeTag.length - 1)
                const safeLen = Math.max(0, parserBuffer.length - keep)
                if (safeLen > 0) activeTagPayload += parserBuffer.slice(0, safeLen)
                if (activeTagKind === "tool" && activeToolCallId)
                  upsertToolBlock(activeToolCallId, { payload: activeTagPayload, isStreaming: true })
                parserBuffer = parserBuffer.slice(safeLen)
              } else { parserBuffer = "" }
              break
            }
            const bodyChunk = parserBuffer.slice(0, closeIdx)
            if (bodyChunk) activeTagPayload += bodyChunk
            if (activeTagKind === "tool" && activeToolCallId)
              upsertToolBlock(activeToolCallId, { payload: activeTagPayload, isStreaming: false })
            if (activeTagKind === "ui") commitUiTag(activeTagName, activeUiAttrs, activeTagPayload)
            parserBuffer = parserBuffer.slice(closeIdx + closeTag.length)
            activeTagName = null; activeTagPayload = ""; activeToolCallId = null
            activeTagKind = null; activeUiAttrs = {}
            continue
          }

          const openMatch = parserBuffer.match(/<([A-Za-z_][\w-]*)\s*([^>]*)>/)
          if (!openMatch || openMatch.index === undefined) {
            const lastLt = parserBuffer.lastIndexOf("<")
            const safeText = lastLt === -1 ? parserBuffer : parserBuffer.slice(0, lastLt)
            if (safeText) { currentStreamingContent += safeText; appendEventLog([{ type: "text", content: safeText }]) }
            parserBuffer = lastLt === -1 ? "" : parserBuffer.slice(lastLt)
            break
          }

          const before = parserBuffer.slice(0, openMatch.index)
          if (before) { currentStreamingContent += before; appendEventLog([{ type: "text", content: before }]) }

          const tagName = openMatch[1]
          const tagText = openMatch[0]
          const attrText = openMatch[2] || ""
          parserBuffer = parserBuffer.slice(openMatch.index + tagText.length)

          const isTool = TOOL_TAGS.has(tagName)
          const isUi = UI_TAGS.has(tagName)
          if (!isTool && !isUi) {
            currentStreamingContent += tagText
            updateMessage({ streamingContent: currentStreamingContent })
            continue
          }

          activeTagName = tagName; activeTagPayload = ""
          if (isUi) { activeTagKind = "ui"; activeUiAttrs = parseAttrs(attrText) }
          else { activeTagKind = "tool" }
        }
      }

      // const addDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const event = JSON.parse(line.slice(6)) as StreamEvent

          if (!firstEventReceived) {
            firstEventReceived = true
            updateMessage({ awaitingFirstResponse: false })
            setRunStatusLabel("Thinking…")
          }

          if (event.type === "content") {
            parserBuffer += event.content
            consumeParserBuffer()
            if ((currentStreamingContent || "").trim().length > 0) setRunStatusLabel("Generating…")
            else if (!Object.keys(currentToolLoadingStates).length) setRunStatusLabel("Thinking…")

          } else if (event.type === "tool_calls") {
            currentToolCalls = event.tool_calls || []
            updateMessage({ toolCalls: currentToolCalls })
            for (const tc of currentToolCalls as Array<Record<string, unknown>>) {
              const fn = (tc?.function as Record<string, unknown> | undefined) || {}
              const name = String(fn.name || "tool")
              let args: Record<string, unknown> | undefined
              try { args = typeof fn.arguments === "string" ? JSON.parse(fn.arguments) : (fn.arguments as Record<string, unknown>) }
              catch { args = undefined }
              const id = String(tc?.id || `${Date.now()}-${Math.random()}`)
              addToolEvent({ type: "plan", sequence: toolEventSequence++, toolCall: tc as Record<string, unknown> })
              setHistory((prev) => [...prev, { id, name, args, status: "running", timestamp: Date.now() }])
            }

          } else if (event.type === "tool_block_start") {
            activeToolCallId = event.tool_call_id
            upsertToolBlock(event.tool_call_id, { ...event, payload: activeTagPayload, isStreaming: true })
            addToolEvent({
              type: "block_start", sequence: toolEventSequence++,
              toolCallId: event.tool_call_id, tag_name: event.tag_name,
              tool_name: event.tool_name, attributes: event.attributes,
            })
            setRunStatusLabel("Planning tools…")
            setHistory((prev) => [...prev, {
              id: event.tool_call_id,
              name: event.tag_name || event.tool_name || "tool",
              args: (event.attributes || {}) as Record<string, unknown>,
              status: "running", timestamp: Date.now(),
            }])

            const blockToolName = (event.tag_name || event.tool_name || "").toLowerCase()
            const blockPath = String((event.attributes as Record<string, unknown>)?.path || "")
            if (FILE_EDIT_TOOLS.has(blockToolName) && blockPath) {
              const tcId = event.tool_call_id
              const isNew = blockToolName === "create_file"
              const newEntry: PendingChange = {
                toolCallId: tcId, name: blockToolName, path: blockPath,
                originalContent: "", modifiedContent: "", diffStatus: "loading",
              }
              // ✅ Update synchronous local map immediately (no React timing issues)
              localPendingMap.set(tcId, newEntry)
              setPendingChanges((prev) => {
                const next = new Map(prev)
                next.set(tcId, newEntry)
                return next
              })
              if (!isNew) {
                fetchFileContent(blockPath).then((original) => {
                  // Update both the local map and React state
                  const existing = localPendingMap.get(tcId)
                  if (existing) localPendingMap.set(tcId, { ...existing, originalContent: original })
                  setPendingChanges((prev) => {
                    const next = new Map(prev)
                    const entry = next.get(tcId)
                    if (entry) next.set(tcId, { ...entry, originalContent: original })
                    return next
                  })
                })
              }
            }

          } else if (event.type === "tool_block") {
            upsertToolBlock(event.tool_call_id, { ...event, isStreaming: false })
            addToolEvent({
              type: "block_update", sequence: toolEventSequence++,
              toolCallId: event.tool_call_id, payload: event.payload || "", isStreaming: false,
            })
            setRunStatusLabel("Preparing tool…")

          } else if (event.type === "tool_loading") {
            currentToolLoadingStates = {
              ...currentToolLoadingStates,
              [event.tool_call_id]: {
                toolName: event.tool_name, tagName: event.tag_name,
                isLoading: event.is_loading, countdownSeconds: event.delay_seconds || 3,
              },
            }
            updateMessage({ toolLoadingStates: currentToolLoadingStates })
            addToolEvent({
              type: "loading", sequence: toolEventSequence++,
              toolCallId: event.tool_call_id, tool_name: event.tool_name,
              tag_name: event.tag_name, is_loading: event.is_loading, delay_seconds: event.delay_seconds,
            })
            setRunStatusLabel(`Using ${event.tool_name}…`)

          } else if (event.type === "tool_result") {
            delete currentToolLoadingStates[event.tool_call_id]
            currentToolResults = [...currentToolResults, event]
            updateMessage({ toolLoadingStates: currentToolLoadingStates, toolResults: currentToolResults })
            addToolEvent({
              type: "result", sequence: toolEventSequence++,
              toolCallId: event.tool_call_id, result: event.result,
              tool_name: event.tool_name, tag_name: event.tag_name, attributes: event.attributes,
            })

            // Update tool history
            try {
              const r = (event as { result?: unknown }).result as Record<string, unknown> | undefined
              const isErr = typeof r?.error === "string" || r?.success === false
              const previewSrc =
                (typeof r?.stdout === "string" && r.stdout) ||
                (typeof r?.preview === "string" && r.preview) ||
                (typeof r?.diff_preview === "string" && r.diff_preview) ||
                (typeof r?.content === "string" && r.content) || ""
              setHistory((prev) => prev.map((h) =>
                h.id === event.tool_call_id
                  ? { ...h, status: isErr ? "error" : "ok", resultPreview: previewSrc || undefined }
                  : h
              ))
            } catch { /* ignore */ }

            // Reflect TODOS.md writes
            try {
              const r = (event as { result?: unknown }).result as Record<string, unknown> | undefined
              const path = String(r?.path || "")
              const modified = String(r?.modified_content || "")
              if (path.toLowerCase() === "todos.md" && modified.trim()) {
                const items: Array<{ text: string; done: boolean }> = []
                for (const ln of modified.split("\n")) {
                  const m = ln.match(/^\s*-\s*\[( |x|X)\]\s+(.*)\s*$/)
                  if (m) items.push({ done: m[1].toLowerCase() === "x", text: (m[2] || "").trim() })
                }
                if (items.length) setStickyTodos(items)
              }
            } catch { /* ignore */ }

            // ✅ DEFINITIVE FIX: backend tool_result never includes tag_name/tool_name,
            // so we CANNOT check FILE_EDIT_TOOLS.has(resultToolName) — it's always "".
            // Instead, check the localPendingMap (synchronously updated) by tool_call_id,
            // then verify the stored entry's name is a file-edit tool.
            {
              const tcId = event.tool_call_id
              const entry = localPendingMap.get(tcId)
              if (entry && FILE_EDIT_TOOLS.has(entry.name)) {
                fetchFileContent(entry.path).then((modified) => {
                  // Update local map so subsequent lookups reflect the new state
                  localPendingMap.set(tcId, { ...entry, modifiedContent: modified, diffStatus: "pending" })
                  setPendingChanges((prev) => {
                    const next = new Map(prev)
                    const e = next.get(tcId)
                    if (e) next.set(tcId, { ...e, modifiedContent: modified, diffStatus: "pending" })
                    return next
                  })
                })
              }
            }

            if (Object.keys(currentToolLoadingStates).length === 0) setRunStatusLabel("Reasoning…")

          } else if (event.type === "agent_phase") {
            setRunStatusLabel(event.label)
          } else if (event.type === "task_status") {
            if (event.status === "pending") setRunStatusLabel("Task pending…")
            if (event.status === "completed") setRunStatusLabel("Finalizing…")
          } else if (event.type === "ui_block") {
            if (event.ui_type === "todos" && event.items?.length) setStickyTodos(event.items)
          } else if (event.type === "final") {
            if (parserBuffer) {
              currentStreamingContent += parserBuffer
              appendEventLog([{ type: "text", content: parserBuffer }])
              parserBuffer = ""
            } else if (event.content && !currentStreamingContent.trim().length) {
              appendEventLog([{ type: "text", content: event.content }])
            }
            updateMessage({
              content: currentStreamingContent || (event.content || ""),
              streaming: false, awaitingFirstResponse: false, toolLoadingStates: {},
            })
            setRunStatusLabel(null)
            setIsRunning(false)
          }
        }
      }
    } catch (err) {
      console.error(err)
      setMessages((prev) => {
        const updated = [...prev]
        if (updated[aiIndex]) {
          updated[aiIndex] = {
            ...updated[aiIndex],
            content: "**Agent error.** " + (err instanceof Error ? err.message : String(err)) +
              "\n\nMake sure your API key & base URL are set in Settings, and that the backend is reachable.",
            streaming: false, awaitingFirstResponse: false,
          }
        }
        return updated
      })
      setIsRunning(false)
      setRunStatusLabel(null)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]

  return (
    <div className="h-full w-full flex">
      {/* Desktop left rail */}
      <div className="hidden md:block">
        <LeftRail
          active={activeRail}
          onSelect={selectRail}
          onOpenTerminal={onOpenTerminal}
          onOpenSettings={onOpenSettings}
          badges={badges}
        />
      </div>

      {/* Mobile left rail (overlay) */}
      {leftMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setLeftMobileOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-0 bottom-0 nc-fade-in">
            <LeftRail
              active={activeRail}
              onSelect={selectRail}
              onOpenTerminal={() => { onOpenTerminal(); setLeftMobileOpen(false) }}
              onOpenSettings={() => { onOpenSettings(); setLeftMobileOpen(false) }}
              onClose={() => setLeftMobileOpen(false)}
              badges={badges}
            />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col relative">
        {/* Workspace strip */}
        {workspace ? (
          <div className="px-4 py-1.5 text-[11px] text-[color:var(--muted-foreground)] border-b border-[color:var(--border)] bg-black/20 flex items-center justify-between shrink-0">
            <span className="truncate">
              Workspace · <span className="text-[color:var(--foreground)] font-medium">{workspace}</span>
            </span>
            <span className="hidden sm:inline">{messages.length} messages</span>
          </div>
        ) : (
          <div className="px-4 py-1.5 text-[11px] text-amber-400/80 border-b border-amber-500/20 bg-amber-500/5 shrink-0">
            No workspace open · file & command tools require a workspace
          </div>
        )}

        {/* Tab bar */}
        <div className="flex items-center gap-0 border-b border-[color:var(--border)] bg-[color:var(--bg-elevated)]/60 overflow-x-auto shrink-0">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId
            const label = tab.type === "chat"
              ? "Chat"
              : tab.path.split(/[\\/]/).pop() ?? tab.path
            return (
              <div
                key={tab.id}
                className={`group flex items-center gap-1.5 px-3 py-2 border-r border-[color:var(--border)] cursor-pointer transition shrink-0 max-w-[160px] ${
                  isActive
                    ? "bg-[color:var(--surface)] border-b-[color:var(--surface)] text-[color:var(--foreground)]"
                    : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--bg-elevated)]"
                }`}
                onClick={() => setActiveTabId(tab.id)}
              >
                {tab.type === "chat" ? (
                  <MessageSquare size={12} className="shrink-0 text-[color:var(--accent)]" />
                ) : (
                  detectFileIcon(tab.path)
                )}
                <span className="text-[11px] font-medium truncate">{label}</span>
                {tab.type !== "chat" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                    className="shrink-0 h-4 w-4 rounded flex items-center justify-center text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--bg-elevated)] opacity-0 group-hover:opacity-100 transition"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* File tabs */}
          {activeTab?.type === "file" && (
            <div className="flex-1 min-h-0">
              <MonacoFileTab
                key={activeTab.id}
                path={activeTab.path}
                initialContent={activeTab.content}
              />
            </div>
          )}

          {/* Chat tab */}
          {activeTab?.type === "chat" && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-[920px] px-3 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-5">
                  {messages.length === 0 ? (
                    <EmptyState workspace={workspace} onSelect={(p) => setComposerPrefill(p)} />
                  ) : (
                    messages.map((m, i) => (
                      <ChatMessage
                        key={i}
                        message={m as unknown as Record<string, unknown>}
                        pendingChanges={pendingChanges}
                        onAcceptChange={acceptChange}
                        onRejectChange={rejectChange}
                      />
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>
              </div>

              <ChatInput
                onSend={sendMessage}
                disabled={isRunning}
                runStatusLabel={runStatusLabel}
                contextUsedTokens={contextUsedTokens}
                contextMaxTokens={contextMaxTokens}
                selectedModel={selectedModel}
                selectedMode={selectedMode}
                prefill={composerPrefill}
                pendingChangesCount={Array.from(pendingChanges.values()).filter((c) => c.diffStatus === "pending").length}
                onAcceptAll={acceptAllChanges}
                onRejectAll={rejectAllChanges}
                onModelChange={(m) => {
                  setSelectedModel(m)
                  const config = loadAIConfig()
                  if (config) saveAIConfig({ ...config, selectedModel: m })
                }}
                onModeChange={(mode) => {
                  setSelectedMode(mode)
                  const config = loadAIConfig()
                  if (config) saveAIConfig({ ...config, selectedMode: mode })
                }}
                workspaceFiles={workspaceFiles}
              />

              <StatusBar
                workspace={workspace}
                selectedModel={selectedModel}
                selectedMode={selectedMode}
                runStatusLabel={runStatusLabel}
                contextUsedTokens={contextUsedTokens}
                contextMaxTokens={contextMaxTokens}
              />
            </>
          )}
        </div>
      </div>

      {/* Right workspace panel */}
      <WorkspacePanel
        open={panelOpen}
        active={activeRail === "chat" || activeRail === "plan" ? "files" : activeRail}
        onSelect={(k) => setActiveRail(k)}
        changedPaths={new Set(Array.from(pendingChanges.values()).filter((c) => c.diffStatus === "pending").map((c) => c.path))}
        onClose={() => setPanelOpen(false)}
        todos={stickyTodos}
        onToggleTodo={(idx) => setStickyTodos((prev) => {
          const next = [...prev]
          if (next[idx]) next[idx] = { ...next[idx], done: !next[idx].done }
          return next
        })}
        onClearTodos={() => setStickyTodos([])}
        history={history}
        onClearHistory={() => setHistory([])}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => { switchSession(id); setPanelOpen(false) }}
        onNewSession={() => { newSession(); setPanelOpen(false) }}
        onDeleteSession={handleDeleteSession}
        onClearSessions={handleClearSessions}
        onOpenFile={openFileTab}
      />
    </div>
  )
}
