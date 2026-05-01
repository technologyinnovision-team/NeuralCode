import { type ReactNode } from "react"
import { ListTodo, History, X, FolderOpen, Clock } from "lucide-react"
import type { RailKey } from "./LeftRail"
import TodosPanel from "../Plan/TodosPanel"
import ToolsHistoryPanel, { type ToolHistoryItem } from "../Plan/ToolsHistoryPanel"
import FileExplorerPanel from "../Plan/FileExplorerPanel"
import ChatSessionList from "../Chat/ChatSessionList"
import type { ChatSession } from "../../utils/chatHistory"

type Props = {
  open: boolean
  active: RailKey
  onSelect: (key: RailKey) => void
  onClose: () => void

  todos: Array<{ text: string; done: boolean }>
  onToggleTodo: (idx: number) => void
  onClearTodos: () => void

  history: ToolHistoryItem[]
  onClearHistory: () => void

  changedPaths?: Set<string>

  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
  onClearSessions: () => void

  onOpenFile?: (path: string, content: string) => void
}

const tabs: { key: Exclude<RailKey, "chat" | "plan">; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: "sessions", label: "History", icon: Clock },
  { key: "files", label: "Explorer", icon: FolderOpen },
  { key: "tasks", label: "Tasks", icon: ListTodo },
  { key: "history", label: "Tools", icon: History },
]

export default function WorkspacePanel({
  open,
  active,
  onSelect,
  onClose,
  todos,
  onToggleTodo,
  onClearTodos,
  history,
  onClearHistory,
  changedPaths,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClearSessions,
  onOpenFile,
}: Props) {
  const tab: Exclude<RailKey, "chat" | "plan"> =
    active === "chat" || active === "plan" ? "files" : (active as Exclude<RailKey, "chat" | "plan">)

  if (!open) return null

  return (
    <aside
      className="
        h-full shrink-0 border-l border-[color:var(--border)] bg-[color:var(--bg-elevated)]/80 backdrop-blur
        w-full md:w-[360px] lg:w-[400px]
        flex flex-col
        absolute md:relative inset-0 md:inset-auto z-20 md:z-auto
      "
      aria-label="Workspace panel"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-[color:var(--border)]">
        <div className="flex items-center gap-1 overflow-x-auto" role="tablist">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => onSelect(key)}
              className="nc-tab inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="nc-icon-btn md:hidden" aria-label="Close panel">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <Section visible={tab === "sessions"}>
          <ChatSessionList
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelect={onSelectSession}
            onNew={onNewSession}
            onDelete={onDeleteSession}
            onClearAll={onClearSessions}
          />
        </Section>
        <Section visible={tab === "files"}>
          <FileExplorerPanel changedPaths={changedPaths} onOpenFile={onOpenFile} />
        </Section>
        <Section visible={tab === "tasks"}>
          <TodosPanel items={todos} onToggle={onToggleTodo} onClear={onClearTodos} />
        </Section>
        <Section visible={tab === "history"}>
          <ToolsHistoryPanel items={history} onClear={onClearHistory} />
        </Section>
      </div>
    </aside>
  )
}

function Section({ visible, children }: { visible: boolean; children: ReactNode }) {
  return <div className={`h-full ${visible ? "block" : "hidden"}`}>{children}</div>
}
