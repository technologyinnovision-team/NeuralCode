import { useCallback, useEffect, useRef, useState } from "react"
import { Terminal } from "xterm"
import { FitAddon } from "xterm-addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import { ClipboardAddon } from "@xterm/addon-clipboard"
import "xterm/css/xterm.css"
import "../styles/terminal.css"

const TERMINAL_URL = import.meta.env.VITE_TERMINAL_WS_URL || "ws://localhost:8000/terminal"

type TerminalProps = { onClose?: () => void }

export default function TerminalComponent({ onClose }: TerminalProps = {}) {
  const terminalRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const cleanupRef = useRef<() => void>(() => {})
  const initializedRef = useRef(false)
  const [status, setStatus] = useState("Connecting…")

  const resizeTerminal = useCallback(() => {
    const term = termRef.current
    const ws = wsRef.current
    if (term && ws && ws.readyState === WebSocket.OPEN) {
      const payload = {
        type: "resize",
        cols: term.cols,
        rows: term.rows
      }
      ws.send(JSON.stringify(payload))
    }
  }, [])

  const createTerminalSession = useCallback(() => {
    if (!terminalRef.current) return
    const existingWs = wsRef.current
    if (existingWs && existingWs.readyState !== WebSocket.CLOSED && existingWs.readyState !== WebSocket.CLOSING) {
      return
    }

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "Consolas, 'Courier New', monospace",
      theme: {
        background: "#0b0f17",
        foreground: "#e7edf7",
        cursor: "#7c5cff"
      },
      scrollback: 1000,
      convertEol: true,
      cols: 80,
      rows: 24
    })

    const fitAddon = new FitAddon()
    const linksAddon = new WebLinksAddon()
    const clipboardAddon = new ClipboardAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(linksAddon)
    term.loadAddon(clipboardAddon)
    term.open(terminalRef.current)
    fitAddon.fit()
    term.focus()

    const ws = new WebSocket(TERMINAL_URL)
    wsRef.current = ws
    termRef.current = term

    const onSocketOpen = () => {
      console.log("[Terminal] ws open")
      setStatus("Connected")
      term.writeln("\x1b[32mConnected to PowerShell terminal\x1b[0m")
      term.writeln("")
      resizeTerminal()
    }

    const onSocketMessage = (event: MessageEvent) => {
      if (typeof event.data === "string") {
        term.write(event.data)
      } else if (event.data instanceof ArrayBuffer) {
        term.write(new TextDecoder().decode(event.data))
      }
    }

    const onSocketClose = (event: CloseEvent) => {
      console.log("[Terminal] ws close", event.code, event.reason)
      wsRef.current = null
      setStatus("Disconnected")
      term.writeln("")
      term.writeln("\x1b[33mConnection closed. Restart the terminal if needed.\x1b[0m")
    }

    const onSocketError = (event: Event) => {
      console.error("[Terminal] ws error", event)
      wsRef.current = null
      setStatus("Error")
      term.writeln("")
      term.writeln("\x1b[31mUnable to connect to the terminal backend.\x1b[0m")
    }

    ws.addEventListener("open", onSocketOpen)
    ws.addEventListener("message", onSocketMessage)
    ws.addEventListener("close", onSocketClose)
    ws.addEventListener("error", onSocketError)

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }))
      }
    })

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      resizeTerminal()
    })
    resizeObserver.observe(terminalRef.current)

    cleanupRef.current = () => {
      resizeObserver.disconnect()
      ws.removeEventListener("open", onSocketOpen)
      ws.removeEventListener("message", onSocketMessage)
      ws.removeEventListener("close", onSocketClose)
      ws.removeEventListener("error", onSocketError)
      if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
        ws.close()
      }
      term.dispose()
      termRef.current = null
      wsRef.current = null
    }
  }, [resizeTerminal])

  useEffect(() => {
    if (initializedRef.current) {
      return
    }

    initializedRef.current = true
    createTerminalSession()

    return () => {
      cleanupRef.current()
      initializedRef.current = false
    }
  }, [createTerminalSession])

  const handleClearTerminal = useCallback(() => {
    const term = termRef.current
    if (term) {
      term.clear()
    }
  }, [])

  const handleRestartTerminal = useCallback(() => {
    cleanupRef.current()
    setStatus("Reconnecting…")
    createTerminalSession()
  }, [createTerminalSession])

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-tabs">
          <div className="terminal-tab active">
            <span className="terminal-tab-icon"></span>
            PowerShell
          </div>
        </div>
        <div className="terminal-actions">
          <span className="terminal-status">{status}</span>
          <button className="terminal-action" title="Clear terminal" onClick={handleClearTerminal}>
            ⌫
          </button>
          <button className="terminal-action" title="Restart terminal" onClick={handleRestartTerminal}>
            ⟳
          </button>
          {onClose && (
            <button className="terminal-action" title="Close terminal" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="terminal-body" ref={terminalRef} />
    </div>
  )
}
