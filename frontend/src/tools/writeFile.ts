import type { Tool } from "./types"
import { callWorkspaceApi } from "./backendApi"

export const writeFileTool: Tool = {
  name: "write_file",

  description: "Write content to a workspace file",

  parameters: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: { type: "string" }
    },
    required: ["path", "content"]
  },

  async execute({ path, content }) {
    await callWorkspaceApi("/workspace/write", { path, content })
    return { success: true }
  }
}