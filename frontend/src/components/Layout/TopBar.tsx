import { Sparkles, FolderOpen, TerminalSquare, Settings, PanelRightOpen, PanelRightClose, Menu } from "lucide-react"

type Props = {
  workspace?: string | null
  onOpenWorkspace: () => void
  loadingWorkspace?: boolean
  onToggleTerminal: () => void
  terminalOpen: boolean
  onToggleSettings: () => void
  onTogglePanel: () => void
  panelOpen: boolean
  onToggleLeftRail: () => void
}

export default function TopBar({
  workspace,
  onOpenWorkspace,
  loadingWorkspace,
  onToggleTerminal,
  terminalOpen,
  onToggleSettings,
  onTogglePanel,
  panelOpen,
  onToggleLeftRail,
}: Props) {
  return (
    <header className="h-14 px-3 sm:px-4 flex items-center justify-between border-b border-[color:var(--border)] backdrop-blur-xl supports-[backdrop-filter]:bg-black/40 bg-black/25 z-30 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile menu */}
        <button
          onClick={onToggleLeftRail}
          className="nc-icon-btn md:hidden"
          aria-label="Open menu"
          title="Menu"
        >
          <Menu size={18} />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative h-9 w-9 rounded-[14px] bg-gradient-to-br from-[#7c5cff] via-[#6247f5] to-[#22d3ee] flex items-center justify-center nc-logo-glow shrink-0">
            <Sparkles size={15} className="text-white drop-shadow" />
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-sm font-bold tracking-tight truncate nc-gradient-text-warm">
              NeuralCode
            </div>
            <div className="hidden sm:block text-[10px] text-[color:var(--faint-foreground)] -mt-0.5 font-medium tracking-wide uppercase">
              Workspace AI
            </div>
          </div>
        </div>

        {/* Workspace pill */}
        {workspace && (
          <div className="hidden md:flex items-center ml-2 gap-1.5 px-2.5 py-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]/60 backdrop-blur-sm text-[11px] text-[color:var(--muted-foreground)] max-w-[200px]">
            <FolderOpen size={11} className="text-[color:var(--accent-2)] shrink-0" />
            <span className="font-medium text-[color:var(--foreground)] truncate">{workspace}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenWorkspace}
          disabled={!!loadingWorkspace}
          className="nc-icon-btn"
          aria-label="Open workspace"
          title={loadingWorkspace ? "Opening…" : "Open workspace"}
        >
          <FolderOpen size={16} />
        </button>

        <button
          onClick={onToggleTerminal}
          className="nc-icon-btn"
          aria-pressed={terminalOpen}
          aria-label="Toggle terminal"
          title="Toggle terminal"
        >
          <TerminalSquare size={16} />
        </button>

        <button
          onClick={onToggleSettings}
          className="nc-icon-btn"
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={16} />
        </button>

        <div className="w-px h-5 bg-[color:var(--border-strong)] mx-1 hidden sm:block rounded-full" />

        <button
          onClick={onTogglePanel}
          className="nc-icon-btn"
          aria-pressed={panelOpen}
          aria-label="Toggle workspace panel"
          title={panelOpen ? "Hide panel" : "Show panel"}
        >
          {panelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      </div>
    </header>
  )
}
