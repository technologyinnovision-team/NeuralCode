export type SerializedMessage = {
  role: "user" | "assistant"
  content: string
  toolSummary?: string
}

export type ChatSession = {
  id: string
  title: string
  messages: SerializedMessage[]
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = "neuralcode_chat_sessions"
const CURRENT_SESSION_KEY = "neuralcode_current_session"

export function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ChatSession[]
  } catch {
    return []
  }
}

export function saveSession(session: ChatSession): void {
  const sessions = loadSessions()
  const idx = sessions.findIndex((s) => s.id === session.id)
  if (idx >= 0) {
    sessions[idx] = session
  } else {
    sessions.unshift(session)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 100)))
}

export function deleteSession(id: string): void {
  const sessions = loadSessions().filter((s) => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export function clearAllSessions(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(CURRENT_SESSION_KEY)
}

export function getCurrentSessionId(): string | null {
  return localStorage.getItem(CURRENT_SESSION_KEY)
}

export function setCurrentSessionId(id: string | null): void {
  if (id) {
    localStorage.setItem(CURRENT_SESSION_KEY, id)
  } else {
    localStorage.removeItem(CURRENT_SESSION_KEY)
  }
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function deriveTitle(messages: SerializedMessage[]): string {
  const first = messages.find((m) => m.role === "user")
  if (!first) return "New Chat"
  const text = first.content.trim()
  if (text.length <= 50) return text
  return text.slice(0, 47) + "…"
}
