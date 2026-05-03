import { useState } from "react"
import { MessageSquare, Plus, Trash2, X, Clock } from "lucide-react"
import type { ChatSession } from "../../utils/chatHistory"

type Props = {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return "Just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return d.toLocaleDateString()
}

export default function ChatSessionList({
  sessions,
  currentSessionId,
  onSelect,
  onNew,
  onDelete,
  onClearAll,
}: Props) {
  const [confirmClear, setConfirmClear] = useState(false)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[color:var(--border)] shrink-0">
        <div className="flex items-center gap-1.5">
          <Clock size={11} className="text-[color:var(--muted-foreground)]" />
          <span className="text-[11px] font-semibold text-[color:var(--foreground)] uppercase tracking-widest">
            Chat History
          </span>
          {sessions.length > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[color:var(--accent)]/15 text-[color:var(--accent)] border border-[color:var(--accent)]/25">
              {sessions.length}
            </span>
          )}
        </div>
        <button
          onClick={onNew}
          title="New chat"
          className="h-7 w-7 rounded-lg flex items-center justify-center text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--surface-2)] border border-transparent hover:border-[color:var(--border)] transition-all"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
        {sessions.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <div className="h-10 w-10 rounded-2xl bg-[color:var(--surface-2)] border border-[color:var(--border)] flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={18} className="text-[color:var(--faint-foreground)]" />
            </div>
            <p className="text-[11px] text-[color:var(--muted-foreground)] font-medium">No saved chats yet</p>
            <p className="text-[10px] text-[color:var(--faint-foreground)] mt-1 leading-relaxed">
              Start a conversation and it will appear here automatically.
            </p>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === currentSessionId
            return (
              <div key={session.id} className="group relative">
                <button
                  onClick={() => onSelect(session.id)}
                  className={`w-full text-left px-2.5 py-2.5 rounded-xl transition-all duration-150 ${
                    isActive
                      ? "bg-[color:var(--accent)]/13 border border-[color:var(--border-accent)] shadow-[0_2px_12px_rgba(124,92,255,0.12)]"
                      : "hover:bg-[color:var(--surface-2)] border border-transparent hover:border-[color:var(--border)]"
                  }`}
                >
                  <div className="flex items-start gap-2 pr-6">
                    <div className={`mt-0.5 shrink-0 ${isActive ? "text-[color:var(--accent)]" : "text-[color:var(--faint-foreground)]"}`}>
                      <MessageSquare size={11} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-[color:var(--foreground)] truncate leading-snug">
                        {session.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-[color:var(--faint-foreground)]">
                          {session.messages.length} msg{session.messages.length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-[color:var(--border-strong)] text-[9px]">·</span>
                        <span className="text-[9px] text-[color:var(--faint-foreground)]">
                          {formatDate(session.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(session.id)
                  }}
                  title="Delete chat"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg flex items-center justify-center text-[color:var(--faint-foreground)] hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  <X size={11} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      {sessions.length > 0 && (
        <div className="shrink-0 px-3 py-2.5 border-t border-[color:var(--border)]">
          {confirmClear ? (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-red-500/6 border border-red-500/20">
              <span className="text-[10px] text-[color:var(--muted-foreground)] flex-1">
                Clear all sessions?
              </span>
              <button
                onClick={() => { onClearAll(); setConfirmClear(false) }}
                className="text-[10px] font-semibold text-red-400 hover:text-red-300 transition px-2 py-1 rounded-md bg-red-400/12 hover:bg-red-400/20"
              >
                Clear all
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="text-[10px] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition px-2 py-1 rounded-md"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] text-[color:var(--faint-foreground)] hover:text-red-400 hover:bg-red-400/8 transition-all"
            >
              <Trash2 size={10} />
              Clear all history
            </button>
          )}
        </div>
      )}
    </div>
  )
}
