import type { Tool } from "./types"
import { callWorkspaceApi } from "./backendApi"

export const listFilesTool: Tool = {
  name: "list_files",

  description: "List files in the current workspace",

  parameters: {
    type: "object",
    properties: {},
    required: []
  },

  async execute() {
    return await callWorkspaceApi("/workspace/files", {})
  }
}