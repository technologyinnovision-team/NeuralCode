import { useState } from "react"
import { MessageSquare, Plus, Trash2, X } from "lucide-react"
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
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[color:var(--border)] shrink-0">
        <span className="text-[11px] font-semibold text-[color:var(--foreground)] uppercase tracking-widest">
          Chat History
        </span>
        <button
          onClick={onNew}
          title="New chat"
          className="nc-icon-btn h-7 w-7"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1 px-1.5">
        {sessions.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <MessageSquare size={22} className="text-[color:var(--muted-foreground)] mx-auto mb-2 opacity-40" />
            <p className="text-[11px] text-[color:var(--muted-foreground)]">No saved chats yet.</p>
            <p className="text-[10px] text-[color:var(--faint-foreground)] mt-1">
              Start a conversation and it will appear here.
            </p>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === currentSessionId
            return (
              <div key={session.id} className="group relative">
                <button
                  onClick={() => onSelect(session.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg mb-0.5 transition ${
                    isActive
                      ? "bg-[color:var(--accent)]/15 border border-[color:var(--border-accent)]"
                      : "hover:bg-[color:var(--bg-elevated)] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 pr-5">
                    <MessageSquare
                      size={11}
                      className={isActive ? "text-[color:var(--accent)] shrink-0" : "text-[color:var(--muted-foreground)] shrink-0"}
                    />
                    <span className="text-[11px] font-medium text-[color:var(--foreground)] truncate leading-snug">
                      {session.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 pl-[19px]">
                    <span className="text-[10px] text-[color:var(--faint-foreground)]">
                      {session.messages.length} msg{session.messages.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[color:var(--faint-foreground)] text-[10px]">·</span>
                    <span className="text-[10px] text-[color:var(--faint-foreground)]">
                      {formatDate(session.updatedAt)}
                    </span>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(session.id)
                  }}
                  title="Delete chat"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center text-[color:var(--muted-foreground)] hover:text-red-400 hover:bg-red-400/10 transition opacity-0 group-hover:opacity-100"
                >
                  <X size={11} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {sessions.length > 0 && (
        <div className="shrink-0 px-3 py-2 border-t border-[color:var(--border)]">
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[color:var(--muted-foreground)] flex-1">
                Clear all sessions?
              </span>
              <button
                onClick={() => { onClearAll(); setConfirmClear(false) }}
                className="text-[10px] font-semibold text-red-400 hover:text-red-300 transition px-2 py-1 rounded bg-red-400/10 hover:bg-red-400/15"
              >
                Yes, clear
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="text-[10px] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition px-2 py-1 rounded"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] text-[color:var(--muted-foreground)] hover:text-red-400 hover:bg-red-400/8 transition"
            >
              <Trash2 size={11} />
              Clear all history
            </button>
          )}
        </div>
      )}
    </div>
  )
}
