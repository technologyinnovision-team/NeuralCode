import {
  MessageSquare, ListTodo, History, TerminalSquare, Settings, X, FolderOpen, Clock,
} from "lucide-react"

export type RailKey = "chat" | "plan" | "tasks" | "history" | "files" | "sessions"

type Props = {
  active: RailKey
  onSelect: (key: RailKey) => void
  onOpenTerminal: () => void
  onOpenSettings: () => void
  onClose?: () => void
  badges?: Partial<Record<RailKey, number | string>>
  className?: string
}

const items: { key: RailKey; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "sessions", label: "Chat History", icon: Clock },
  { key: "files", label: "Explorer", icon: FolderOpen },
  { key: "tasks", label: "Tasks", icon: ListTodo },
  { key: "history", label: "Tool History", icon: History },
]

export default function LeftRail({
  active,
  onSelect,
  onOpenTerminal,
  onOpenSettings,
  onClose,
  badges = {},
  className = "",
}: Props) {
  return (
    <nav
      className={`h-full w-[68px] shrink-0 border-r border-[color:var(--border)] bg-black/30 backdrop-blur flex flex-col items-center py-3 gap-1 ${className}`}
      aria-label="Primary"
    >
      {onClose && (
        <button onClick={onClose} className="nc-icon-btn md:hidden mb-1" aria-label="Close menu">
          <X size={16} />
        </button>
      )}

      <div className="flex flex-col gap-1.5 mt-1">
        {items.map(({ key, label, icon: Icon }) => {
          const isActive = active === key
          const badge = badges[key]
          return (
            <button
              key={key}
              onClick={() => { onSelect(key); onClose?.() }}
              aria-pressed={isActive}
              title={label}
              className={`relative nc-icon-btn w-12 h-12 ${isActive ? "bg-[color:var(--accent)]/10 text-[color:var(--accent)]" : ""}`}
            >
              <Icon size={18} />
              {badge !== undefined && badge !== 0 && badge !== "0" && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[color:var(--accent)] text-[10px] text-white font-semibold flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-auto flex flex-col gap-1.5">
        <button
          onClick={() => { onOpenTerminal(); onClose?.() }}
          className="nc-icon-btn w-12 h-12"
          title="Terminal"
        >
          <TerminalSquare size={18} />
        </button>
        <button
          onClick={() => { onOpenSettings(); onClose?.() }}
          className="nc-icon-btn w-12 h-12"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </nav>
  )
}
