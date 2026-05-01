export type AIConfig = {
  baseUrl: string
  apiKey: string
  selectedModel: string
  models: string[]
  enabledModels: string[]
  contextWindowTokens?: number
  maxOutputTokens?: number
  selectedMode?: "agent" | "plan" | "debug" | "ask"
}

const STORAGE_KEY = "neuralcode_ai_config"

export function saveAIConfig(config: AIConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function loadAIConfig(): AIConfig | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  return JSON.parse(raw)
}