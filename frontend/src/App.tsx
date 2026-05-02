import { useEffect, useState } from "react"
import { FolderOpen, Loader2 } from "lucide-react"

import ChatLayout from "./components/Chat/ChatLayout"
import TerminalComponent from "./components/Terminal"
import SettingsModal from "./components/Settings/SettingsModal"
import TopBar from "./components/Layout/TopBar"

const isElectron = typeof window !== "undefined" && !!(window as any).electronAPI

const getBackendUrl = () => {
  const envUrl = import.meta.env.VITE_BACKEND_URL as string | undefined
  if (envUrl) return envUrl
  return "http://localhost:8000"
}

const BACKEND_URL = getBackendUrl()

export default function App() {
  const [showTerminal, setShowTerminal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [panelOpen, setPanelOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true
    return window.innerWidth >= 1024
  })
  const [leftMobileOpen, setLeftMobileOpen] = useState(false)

  const [workspace, setWorkspace] = useState<string | null>(null)
  const [loadingWorkspace, setLoadingWorkspace] = useState(false)
  const [backendReady, setBackendReady] = useState(false)
  const [backendChecked, setBackendChecked] = useState(false)

  // Wait for backend to be ready (Electron)
  useEffect(() => {
    if (!isElectron) {
      setBackendReady(true)
      return
    }
    const waitForBackend = async () => {
      try {
        const electronAPI = (window as any).electronAPI
        if (electronAPI?.backendReady) {
          await electronAPI.backendReady()
          setBackendReady(true)
        } else {
          setBackendReady(true)
        }
      } catch {
        setTimeout(waitForBackend, 1000)
      }
    }
    waitForBackend()
  }, [])

  // Initial workspace probe
  useEffect(() => {
    if (!backendReady) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/workspace/path`)
        if (!res.ok) { setBackendChecked(true); return }
        const data = (await res.json()) as { workspace?: string }
        if (cancelled) return
        if (data?.workspace) {
          const parts = data.workspace.split(/[\\/]/)
          setWorkspace(parts[parts.length - 1] || data.workspace)
        }
      } catch { /* offline backend */ }
      finally { setBackendChecked(true) }
    })()
    return () => { cancelled = true }
  }, [backendReady])

  async function openWorkspace() {
    try {
      setLoadingWorkspace(true)

      // In Electron, use the native OS dialog instead of the backend's tkinter picker
      if (isElectron && (window as any).electronAPI?.openFileDialog) {
        const folderPath: string | null = await (window as any).electronAPI.openFileDialog()
        if (!folderPath) return // user cancelled
        const res = await fetch(`${BACKEND_URL}/workspace/set`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: folderPath }),
        })
        if (!res.ok) throw new Error("Failed to set workspace")
        const data = await res.json()
        if (data.workspace) {
          const parts = data.workspace.split(/[\\/]/)
          setWorkspace(parts[parts.length - 1] || data.workspace)
        }
        return
      }

      // Web / dev mode: let the backend show its own dialog
      const res = await fetch(`${BACKEND_URL}/workspace/open`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to open workspace")
      const data = await res.json()
      if (data.workspace) {
        const parts = data.workspace.split(/[\\/]/)
        setWorkspace(parts[parts.length - 1] || data.workspace)
      }
    } catch (err) {
      console.error(err)
      alert("Couldn't open a workspace folder. Make sure the desktop backend is running.")
    } finally {
      setLoadingWorkspace(false)
    }
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  if (isElectron && !backendReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[color:var(--bg)] text-[color:var(--foreground)]">
        <div className="text-center">
          <div className="text-xl font-semibold mb-4">Starting NeuralCode…</div>
          <Loader2 className="animate-spin h-10 w-10 mx-auto text-[color:var(--accent)]" />
        </div>
      </div>
    )
  }

  // ── Workspace gate (Electron only — web can chat without a workspace) ──────
  const needsWorkspaceGate = isElectron && backendChecked && !workspace

  if (needsWorkspaceGate) {
    return (
      <div className="h-screen w-screen flex flex-col bg-[color:var(--bg)] text-[color:var(--foreground)]">
        <TopBar
          workspace={null}
          onOpenWorkspace={openWorkspace}
          loadingWorkspace={loadingWorkspace}
          onToggleTerminal={() => {}}
          terminalOpen={false}
          onToggleSettings={() => setShowSettings(true)}
          onTogglePanel={() => {}}
          panelOpen={false}
          onToggleLeftRail={() => {}}
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center">
            {/* Logo / icon */}
            <div className="mx-auto mb-6 h-20 w-20 rounded-3xl bg-gradient-to-br from-[#7c5cff]/20 to-[#5b3dff]/10 border border-[color:var(--border-accent)] flex items-center justify-center">
              <FolderOpen size={36} className="text-[color:var(--accent)]" />
            </div>

            <h1 className="text-2xl font-bold text-[color:var(--foreground)] mb-2">Open a Workspace</h1>
            <p className="text-[color:var(--muted-foreground)] text-sm mb-8 leading-relaxed">
              NeuralCode needs a folder to work in. All file reading, editing, and terminal commands
              run inside the workspace you choose.
            </p>

            <button
              onClick={openWorkspace}
              disabled={loadingWorkspace}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-br from-[#7c5cff] to-[#5b3dff] text-white text-sm font-semibold shadow-[0_10px_30px_rgba(124,92,255,0.45)] hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingWorkspace ? (
                <><Loader2 size={16} className="animate-spin" /> Opening…</>
              ) : (
                <><FolderOpen size={16} /> Choose Workspace Folder</>
              )}
            </button>

            <p className="mt-4 text-[11px] text-[color:var(--faint-foreground)]">
              You can change your workspace any time from the toolbar.
            </p>
          </div>
        </div>
        {showSettings && <SettingsModal close={() => setShowSettings(false)} />}
      </div>
    )
  }

  // ── Main app ──────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen flex flex-col text-[color:var(--foreground)] overflow-hidden">
      <TopBar
        workspace={workspace}
        onOpenWorkspace={openWorkspace}
        loadingWorkspace={loadingWorkspace}
        onToggleTerminal={() => setShowTerminal((v) => !v)}
        terminalOpen={showTerminal}
        onToggleSettings={() => setShowSettings(true)}
        onTogglePanel={() => setPanelOpen((v) => !v)}
        panelOpen={panelOpen}
        onToggleLeftRail={() => setLeftMobileOpen((v) => !v)}
      />

      <main className="flex-1 min-h-0 flex flex-col">
        <div className={`flex-1 min-h-0 ${showTerminal ? "max-h-[62%] sm:max-h-[65%]" : ""}`}>
          <ChatLayout
            workspace={workspace}
            onOpenTerminal={() => setShowTerminal(true)}
            onOpenSettings={() => setShowSettings(true)}
            panelOpen={panelOpen}
            setPanelOpen={setPanelOpen}
            leftMobileOpen={leftMobileOpen}
            setLeftMobileOpen={setLeftMobileOpen}
          />
        </div>

        {showTerminal && (
          <div className="h-[38%] sm:h-[35%] min-h-[180px] border-t border-[color:var(--border)] bg-[color:var(--bg-elevated)]/80 backdrop-blur">
            <TerminalComponent onClose={() => setShowTerminal(false)} />
          </div>
        )}
      </main>

      {showSettings && <SettingsModal close={() => setShowSettings(false)} />}
    </div>
  )
}
