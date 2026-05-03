import {
  MessageSquare, ListTodo, History, TerminalSquare, Settings, X, FolderOpen, Clock, Brain,
} from "lucide-react"

export type RailKey = "chat" | "sessions" | "files" | "tasks" | "history" | "context"

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
  { key: "chat",     label: "Chat",    icon: MessageSquare },
  { key: "sessions", label: "History", icon: Clock },
  { key: "files",    label: "Explorer", icon: FolderOpen },
  { key: "tasks",    label: "Tasks",   icon: ListTodo },
  { key: "history",  label: "Tools",   icon: History },
  { key: "context",  label: "Context", icon: Brain },
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
      className={`h-full w-[64px] shrink-0 border-r border-[color:var(--border)] bg-black/40 backdrop-blur-xl flex flex-col items-center py-3 gap-1 ${className}`}
      aria-label="Primary navigation"
    >
      {onClose && (
        <button onClick={onClose} className="nc-icon-btn md:hidden mb-1 w-11 h-11" aria-label="Close menu">
          <X size={15} />
        </button>
      )}

      <div className="flex flex-col gap-1 mt-1 w-full px-2">
        {items.map(({ key, label, icon: Icon }) => {
          const isActive = active === key
          const badge = badges[key]
          return (
            <div key={key} className="relative group">
              <button
                onClick={() => { onSelect(key); onClose?.() }}
                aria-pressed={isActive}
                title={label}
                className={`relative flex items-center justify-center w-full h-11 rounded-xl transition-all duration-150 ${
                  isActive
                    ? "bg-[color:var(--accent)]/15 text-[color:var(--accent)] shadow-[inset_0_0_0_1px_rgba(124,92,255,0.3)]"
                    : "text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--foreground)]"
                }`}
              >
                <Icon size={17} />
                {badge !== undefined && badge !== 0 && badge !== "0" && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[color:var(--accent)] text-[9px] text-white font-bold flex items-center justify-center leading-none shadow-[0_2px_8px_rgba(124,92,255,0.5)]">
                    {badge}
                  </span>
                )}
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-300">
                <div className="bg-[color:var(--surface-3)] border border-[color:var(--border-strong)] text-[color:var(--foreground)] text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                  {label}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-auto flex flex-col gap-1 w-full px-2">
        {/* Separator */}
        <div className="mx-2 mb-1 h-px bg-[color:var(--border)]" />
        <div className="relative group">
          <button
            onClick={() => { onOpenTerminal(); onClose?.() }}
            className="flex items-center justify-center w-full h-11 rounded-xl text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--foreground)] transition-all duration-150"
            title="Terminal"
          >
            <TerminalSquare size={17} />
          </button>
          <div className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-300">
            <div className="bg-[color:var(--surface-3)] border border-[color:var(--border-strong)] text-[color:var(--foreground)] text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
              Terminal
            </div>
          </div>
        </div>
        <div className="relative group">
          <button
            onClick={() => { onOpenSettings(); onClose?.() }}
            className="flex items-center justify-center w-full h-11 rounded-xl text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--foreground)] transition-all duration-150"
            title="Settings"
          >
            <Settings size={17} />
          </button>
          <div className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-300">
            <div className="bg-[color:var(--surface-3)] border border-[color:var(--border-strong)] text-[color:var(--foreground)] text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
              Settings
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
