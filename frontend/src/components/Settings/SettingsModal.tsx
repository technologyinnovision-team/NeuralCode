import { useEffect, useState } from "react"
import {
  X,
  Globe,
  KeyRound,
  Cpu,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  ExternalLink,
  Settings2,
  Loader2,
} from "lucide-react"
import { saveAIConfig, loadAIConfig } from "../../utils/aiConfig"

type Tab = "api" | "models" | "about"

export default function SettingsModal({ close }: { close: () => void }) {
  const saved = loadAIConfig()

  const [tab, setTab] = useState<Tab>("api")
  const [baseUrl, setBaseUrl] = useState(saved?.baseUrl || "")
  const [apiKey, setApiKey] = useState(saved?.apiKey || "")
  const [showKey, setShowKey] = useState(false)

  const [models, setModels] = useState<string[]>(saved?.models || [])
  const [enabledModels, setEnabledModels] = useState<string[]>(saved?.enabledModels || [])
  const [contextWindowTokens, setContextWindowTokens] = useState<number>(() => {
    const value = Number(saved?.contextWindowTokens || 8192)
    return Number.isFinite(value) && value > 0 ? value : 8192
  })
  const [maxOutputTokens, setMaxOutputTokens] = useState<number>(() => {
    const value = Number(saved?.maxOutputTokens || 16384)
    return Number.isFinite(value) && value > 0 ? value : 16384
  })

  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [close])

  async function fetchModels() {
    setFetchError(null)
    if (!baseUrl || !apiKey) {
      setFetchError("Enter Base URL and API Key first.")
      return
    }
    try {
      setLoading(true)
      const res = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = (await res.json()) as { data?: Array<{ id?: string }> }
      const list = (data.data || []).map((m) => String(m.id || "")).filter(Boolean)
      setModels(list)
      if (enabledModels.length === 0) setEnabledModels(list)
      setTab("models")
    } catch (e) {
      setFetchError(`Failed to fetch models: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  function toggleModel(model: string) {
    setEnabledModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    )
  }

  function save() {
    saveAIConfig({
      baseUrl,
      apiKey,
      models,
      enabledModels,
      selectedModel: saved?.selectedModel && enabledModels.includes(saved.selectedModel)
        ? saved.selectedModel
        : enabledModels[0] || "",
      contextWindowTokens,
      maxOutputTokens,
      selectedMode: saved?.selectedMode || "agent",
    })
    setSavedFlash(true)
    setTimeout(() => {
      setSavedFlash(false)
      close()
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 nc-fade-in">
      <div
        className="w-full max-w-[760px] rounded-t-3xl sm:rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_25px_80px_rgba(0,0,0,0.55)] overflow-hidden max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[color:var(--border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] flex items-center justify-center">
              <Settings2 size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <div id="settings-title" className="text-sm font-semibold">
                Settings
              </div>
              <div className="text-[11px] text-[color:var(--muted-foreground)]">
                Configure your model provider and context limits
              </div>
            </div>
          </div>
          <button onClick={close} className="nc-icon-btn" aria-label="Close settings" title="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-3 pt-3 flex items-center gap-1 border-b border-[color:var(--border)]">
          {(
            [
              { k: "api" as Tab, label: "Provider", icon: Globe },
              { k: "models" as Tab, label: "Models", icon: Cpu },
              { k: "about" as Tab, label: "About", icon: Sparkles },
            ]
          ).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              aria-selected={tab === t.k}
              className="nc-tab inline-flex items-center gap-1.5 mb-2"
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-5 py-5 overflow-y-auto flex-1 min-h-0">
          {tab === "api" && (
            <div className="space-y-4">
              <Field
                label="Base URL"
                hint="Your OpenAI-compatible endpoint, e.g. https://api.openai.com/v1"
                icon={<Globe size={13} />}
              >
                <input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="nc-input"
                  spellCheck={false}
                />
              </Field>

              <Field label="API Key" hint="Stored locally in your browser only" icon={<KeyRound size={13} />}>
                <div className="flex gap-2">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-…"
                    className="nc-input flex-1"
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="nc-btn h-10"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
              </Field>

              <Field
                label="Context window (tokens)"
                hint="Powers the context meter shown in the status bar"
                icon={<Cpu size={13} />}
              >
                <input
                  type="number"
                  min={512}
                  step={256}
                  value={contextWindowTokens}
                  onChange={(e) => setContextWindowTokens(Number(e.target.value))}
                  className="nc-input"
                />
              </Field>

              <Field
                label="Max output tokens"
                hint="Maximum tokens the model can generate per response. Set higher (16384–32768) for large file generation."
                icon={<Cpu size={13} />}
              >
                <div className="flex gap-2 flex-wrap">
                  {[4096, 8192, 16384, 32768].map((v) => (
                    <button
                      key={v}
                      onClick={() => setMaxOutputTokens(v)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                        maxOutputTokens === v
                          ? "bg-[color:var(--accent-bg)] border-[color:var(--border-accent)] text-[color:var(--foreground)]"
                          : "bg-[color:var(--bg-elevated)] border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:border-[color:var(--border-strong)]"
                      }`}
                    >
                      {v.toLocaleString()}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1024}
                    max={128000}
                    step={1024}
                    value={maxOutputTokens}
                    onChange={(e) => setMaxOutputTokens(Number(e.target.value))}
                    className="nc-input w-28"
                    placeholder="Custom"
                  />
                </div>
              </Field>

              {fetchError && (
                <div className="text-xs text-red-300 bg-red-900/20 border border-red-700/40 rounded-xl px-3 py-2">
                  {fetchError}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button onClick={fetchModels} disabled={loading} className="nc-btn nc-btn-primary">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  {loading ? "Fetching…" : "Fetch models"}
                </button>
                <span className="text-[11px] text-[color:var(--muted-foreground)]">
                  Calls <span className="font-mono">{baseUrl ? `${baseUrl}/models` : "/models"}</span>
                </span>
              </div>
            </div>
          )}

          {tab === "models" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">Available models</div>
                <button
                  onClick={() => setModels((prev) => [...prev, ""])}
                  className="nc-btn h-8 text-xs"
                >
                  <Plus size={12} /> Add custom
                </button>
              </div>

              {models.length === 0 ? (
                <div className="text-xs text-[color:var(--muted-foreground)] border border-dashed border-[color:var(--border)] rounded-2xl px-4 py-6 text-center">
                  No models yet. Configure a provider on the <strong>Provider</strong> tab and fetch models, or add a custom one.
                </div>
              ) : (
                <ul className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {models.map((model, i) => {
                    const enabled = enabledModels.includes(model)
                    return (
                      <li
                        key={`${i}-${model}`}
                        className="flex items-center gap-2 bg-[color:var(--surface-2)] border border-[color:var(--border)] rounded-xl px-2.5 py-2"
                      >
                        <button
                          onClick={() => toggleModel(model)}
                          className={`h-6 w-6 rounded-md flex items-center justify-center border transition ${
                            enabled
                              ? "bg-[color:var(--accent)] border-[color:var(--accent)] text-white"
                              : "border-[color:var(--border)] text-transparent"
                          }`}
                          aria-pressed={enabled}
                          title={enabled ? "Enabled" : "Click to enable"}
                        >
                          <Check size={13} />
                        </button>
                        <input
                          value={model}
                          onChange={(e) => {
                            const next = [...models]
                            next[i] = e.target.value
                            setModels(next)
                          }}
                          placeholder="model-id"
                          className="flex-1 bg-transparent border-none outline-none text-sm font-mono"
                        />
                        <button
                          onClick={() => {
                            setModels(models.filter((_, idx) => idx !== i))
                            setEnabledModels(enabledModels.filter((m) => m !== model))
                          }}
                          className="nc-icon-btn w-8 h-8"
                          title="Remove"
                          aria-label={`Remove ${model}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="text-[11px] text-[color:var(--muted-foreground)]">
                {enabledModels.length} enabled / {models.length} total
              </div>
            </div>
          )}

          {tab === "about" && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <div className="font-semibold">NeuralCode</div>
                  <div className="text-[11px] text-[color:var(--muted-foreground)]">
                    Local workspace engineer · React + Vite frontend
                  </div>
                </div>
              </div>
              <p className="text-[color:var(--muted-foreground)] leading-relaxed">
                NeuralCode connects to any OpenAI-compatible endpoint to plan, edit and run code in your local workspace.
                The desktop backend exposes file, search, and command tools while a built-in PowerShell terminal lets you take direct control.
              </p>
              <a
                href="https://platform.openai.com/docs/api-reference"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[color:var(--accent-2)] hover:underline"
              >
                OpenAI-compatible API reference <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-[color:var(--border)] bg-black/20">
          <div className="text-[11px] text-[color:var(--muted-foreground)]">
            {savedFlash ? (
              <span className="inline-flex items-center gap-1 text-[color:var(--success)]">
                <Check size={12} /> Saved
              </span>
            ) : (
              "Press Esc to close"
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={close} className="nc-btn">
              Cancel
            </button>
            <button onClick={save} className="nc-btn nc-btn-primary">
              <Check size={14} /> Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  icon,
  children,
}: {
  label: string
  hint?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-xs text-[color:var(--muted-foreground)] flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <div className="text-[11px] text-[color:var(--faint-foreground)] mt-1">{hint}</div>}
    </div>
  )
}
