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
    <header className="h-14 px-3 sm:px-4 flex items-center justify-between border-b border-[color:var(--border)] backdrop-blur supports-[backdrop-filter]:bg-black/30 bg-black/20 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleLeftRail}
          className="nc-icon-btn md:hidden"
          aria-label="Open menu"
          title="Menu"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative h-9 w-9 rounded-2xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] flex items-center justify-center shadow-[0_0_24px_rgba(124,92,255,0.45)]">
            <Sparkles size={16} className="text-white" />
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-sm font-semibold tracking-tight truncate">NeuralCode</div>
            <div className="hidden sm:block text-[11px] text-[color:var(--muted-foreground)] -mt-0.5">
              Workspace engineer
            </div>
          </div>
        </div>

        {workspace && (
          <div className="hidden md:flex items-center ml-2 gap-1.5 nc-chip">
            <FolderOpen size={12} />
            <span className="font-medium text-[color:var(--foreground)] truncate max-w-[160px]">{workspace}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
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

        <div className="w-px h-6 bg-[color:var(--border)] mx-1 hidden sm:block" />

        <button
          onClick={onTogglePanel}
          className="nc-icon-btn"
          aria-pressed={panelOpen}
          aria-label="Toggle workspace panel"
          title={panelOpen ? "Hide workspace panel" : "Show workspace panel"}
        >
          {panelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      </div>
    </header>
  )
}
