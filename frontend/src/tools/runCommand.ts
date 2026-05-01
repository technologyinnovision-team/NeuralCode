import type { Tool } from "./types"
import { callWorkspaceApi } from "./backendApi"

export const runCommandTool: Tool = {
  name: "run_command",
  description: "Run a shell command in the current workspace and return stdout/stderr.",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string" },
      timeout: { type: "integer" }
    },
    required: ["command"]
  },
  async execute({ command, timeout = 30 }) {
    return await callWorkspaceApi("/workspace/command", { command, timeout })
  }
}
