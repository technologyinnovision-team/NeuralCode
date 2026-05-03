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
  Zap,
} from "lucide-react"
import { saveAIConfig, loadAIConfig } from "../../utils/aiConfig"

type Tab = "providers" | "api" | "models" | "about"

type Provider = {
  name: string
  baseUrl: string
  description: string
  color: string
  badge?: string
  docsUrl: string
}

const PROVIDERS: Provider[] = [
  {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    description: "GPT-4o, o1, o3 and more",
    color: "#10a37f",
    docsUrl: "https://platform.openai.com",
  },
  {
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    description: "Claude 3.5 Sonnet, Opus, Haiku",
    color: "#d97706",
    docsUrl: "https://console.anthropic.com",
  },
  {
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    description: "Gemini 2.0 Flash, Pro and more",
    color: "#4285f4",
    docsUrl: "https://ai.google.dev",
  },
  {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    description: "Llama 3, Mixtral — ultra-fast inference",
    color: "#f97316",
    badge: "Fast",
    docsUrl: "https://console.groq.com",
  },
  {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    description: "200+ models from one endpoint",
    color: "#8b5cf6",
    docsUrl: "https://openrouter.ai",
  },
  {
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    description: "Mistral Large, Codestral, Nemo",
    color: "#e11d48",
    docsUrl: "https://console.mistral.ai",
  },
  {
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    description: "Open-source models at scale",
    color: "#0ea5e9",
    docsUrl: "https://api.together.ai",
  },
  {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    description: "DeepSeek-V3, DeepSeek-R1",
    color: "#3b82f6",
    docsUrl: "https://platform.deepseek.com",
  },
  {
    name: "xAI / Grok",
    baseUrl: "https://api.x.ai/v1",
    description: "Grok-2 and Grok-beta",
    color: "#6b7280",
    docsUrl: "https://console.x.ai",
  },
  {
    name: "Perplexity",
    baseUrl: "https://api.perplexity.ai",
    description: "Sonar models with live search",
    color: "#22d3ee",
    docsUrl: "https://docs.perplexity.ai",
  },
  {
    name: "Cohere",
    baseUrl: "https://api.cohere.ai/v1",
    description: "Command R+ and Embed models",
    color: "#059669",
    docsUrl: "https://dashboard.cohere.com",
  },
  {
    name: "Ollama",
    baseUrl: "http://localhost:11434/v1",
    description: "Run models locally on your machine",
    color: "#64748b",
    badge: "Local",
    docsUrl: "https://ollama.com",
  },
  {
    name: "LM Studio",
    baseUrl: "http://localhost:1234/v1",
    description: "Local model server with a GUI",
    color: "#64748b",
    badge: "Local",
    docsUrl: "https://lmstudio.ai",
  },
  {
    name: "Jan",
    baseUrl: "http://localhost:1337/v1",
    description: "Open-source local AI desktop app",
    color: "#64748b",
    badge: "Local",
    docsUrl: "https://jan.ai",
  },
]

export default function SettingsModal({ close }: { close: () => void }) {
  const saved = loadAIConfig()

  const [tab, setTab] = useState<Tab>("providers")
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
  const [selectedProvider, setSelectedProvider] = useState<string>(() => {
    if (!saved?.baseUrl) return ""
    const match = PROVIDERS.find((p) => p.baseUrl === saved.baseUrl)
    return match ? match.name : "custom"
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [close])

  function pickProvider(p: Provider) {
    setBaseUrl(p.baseUrl)
    setSelectedProvider(p.name)
    setFetchError(null)
  }

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
      selectedModel:
        saved?.selectedModel && enabledModels.includes(saved.selectedModel)
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

  const tabs: { k: Tab; label: string; icon: React.ElementType }[] = [
    { k: "providers", label: "Providers", icon: Zap },
    { k: "api", label: "Config", icon: Globe },
    { k: "models", label: "Models", icon: Cpu },
    { k: "about", label: "About", icon: Sparkles },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 nc-fade-in">
      <div
        className="w-full max-w-[800px] rounded-t-3xl sm:rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_25px_80px_rgba(0,0,0,0.55)] overflow-hidden max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[color:var(--border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] flex items-center justify-center flex-shrink-0">
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
          {tabs.map((t) => (
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

          {/* ── Providers tab ── */}
          {tab === "providers" && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold mb-0.5">Choose a provider</div>
                <div className="text-[11px] text-[color:var(--muted-foreground)]">
                  Click a provider to set its Base URL automatically, then go to the Config tab to enter your API key.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROVIDERS.map((p) => {
                  const isActive = selectedProvider === p.name
                  return (
                    <button
                      key={p.name}
                      onClick={() => pickProvider(p)}
                      className={`group relative flex items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all ${
                        isActive
                          ? "border-[color:var(--border-accent)] bg-[color:var(--accent-bg)]"
                          : "border-[color:var(--border)] bg-[color:var(--surface-2)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-elevated)]"
                      }`}
                    >
                      {/* Colour dot */}
                      <span
                        className="mt-0.5 h-3 w-3 rounded-full flex-shrink-0 ring-2 ring-black/20"
                        style={{ background: p.color }}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold leading-tight">{p.name}</span>
                          {p.badge && (
                            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-[color:var(--bg-elevated)] border border-[color:var(--border)] text-[color:var(--muted-foreground)]">
                              {p.badge}
                            </span>
                          )}
                          {isActive && (
                            <span className="ml-auto text-[color:var(--accent)]">
                              <Check size={12} />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[color:var(--muted-foreground)] mt-0.5 leading-snug">
                          {p.description}
                        </div>
                        <div className="text-[10px] font-mono text-[color:var(--faint-foreground)] mt-1 truncate">
                          {p.baseUrl}
                        </div>
                      </div>

                      {/* Docs link */}
                      <a
                        href={p.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] mt-0.5"
                        title="Open docs"
                        aria-label={`Open ${p.name} docs`}
                      >
                        <ExternalLink size={12} />
                      </a>
                    </button>
                  )
                })}
              </div>

              {selectedProvider && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 text-[11px] text-[color:var(--muted-foreground)]">
                    Selected:{" "}
                    <span className="font-semibold text-[color:var(--foreground)]">{selectedProvider}</span>
                    {" — "}
                    <span className="font-mono">{baseUrl}</span>
                  </div>
                  <button
                    onClick={() => setTab("api")}
                    className="nc-btn nc-btn-primary h-8 text-xs"
                  >
                    Enter API key →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Config tab ── */}
          {tab === "api" && (
            <div className="space-y-4">
              <Field
                label="Base URL"
                hint="Your OpenAI-compatible endpoint. Pick a provider on the Providers tab or enter a custom URL."
                icon={<Globe size={13} />}
              >
                <input
                  value={baseUrl}
                  onChange={(e) => {
                    setBaseUrl(e.target.value)
                    setSelectedProvider("custom")
                  }}
                  placeholder="https://api.openai.com/v1"
                  className="nc-input"
                  spellCheck={false}
                />
              </Field>

              <Field label="API Key" hint="Stored locally in your browser only — never sent anywhere except the provider." icon={<KeyRound size={13} />}>
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
                hint="Powers the context meter shown in the status bar."
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
                  Calls{" "}
                  <span className="font-mono">{baseUrl ? `${baseUrl}/models` : "/models"}</span>
                </span>
              </div>
            </div>
          )}

          {/* ── Models tab ── */}
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
                  No models yet. Go to the <strong>Config</strong> tab and click <strong>Fetch models</strong>, or add a custom model ID here.
                </div>
              ) : (
                <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {models.map((model, i) => {
                    const enabled = enabledModels.includes(model)
                    return (
                      <li
                        key={`${i}-${model}`}
                        className="flex items-center gap-2 bg-[color:var(--surface-2)] border border-[color:var(--border)] rounded-xl px-2.5 py-2"
                      >
                        <button
                          onClick={() => toggleModel(model)}
                          className={`h-6 w-6 rounded-md flex items-center justify-center border transition flex-shrink-0 ${
                            enabled
                              ? "bg-[color:var(--accent)] border-[color:var(--accent)] text-white"
                              : "border-[color:var(--border)] text-transparent"
                          }`}
                          aria-pressed={enabled}
                          title={enabled ? "Enabled — click to disable" : "Click to enable"}
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

          {/* ── About tab ── */}
          {tab === "about" && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] flex items-center justify-center flex-shrink-0">
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
                NeuralCode connects to any OpenAI-compatible endpoint to plan, edit, and run code in your local
                workspace. The desktop backend exposes file, search, and command tools while a built-in terminal
                lets you take direct control.
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[
                  { label: "14 providers", desc: "Pre-configured base URLs" },
                  { label: "7 tools", desc: "Read, patch, rename, search, run" },
                  { label: "Session context", desc: "Full file cache per session" },
                  { label: "Language guides", desc: "Python, TS, React, CSS & more" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2.5"
                  >
                    <div className="font-semibold text-[color:var(--foreground)]">{item.label}</div>
                    <div className="text-[color:var(--muted-foreground)]">{item.desc}</div>
                  </div>
                ))}
              </div>
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
