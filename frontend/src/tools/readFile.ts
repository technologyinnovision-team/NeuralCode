import type { Tool } from "./types"
import { callWorkspaceApi } from "./backendApi"

export const readFileTool: Tool = {
  name: "read_file",

  description: "Read the contents of a workspace file",

  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Workspace-relative path of the file"
      }
    },
    required: ["path"]
  },

  async execute({ path }) {
    return await callWorkspaceApi("/workspace/read", { path })
  }
}