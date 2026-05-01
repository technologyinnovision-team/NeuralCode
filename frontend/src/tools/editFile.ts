import type { Tool } from "./types"
import { callWorkspaceApi } from "./backendApi"

export const editFileTool: Tool = {
  name: "edit_file",
  description: "Edit a workspace file by replacing specific text",

  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Workspace-relative path of the file"
      },
      search: {
        type: "string",
        description: "Text to search for"
      },
      replace: {
        type: "string",
        description: "Replacement text"
      }
    },
    required: ["path", "search", "replace"]
  },

  async execute({ path, search, replace }) {
    return await callWorkspaceApi("/workspace/edit", { path, search, replace })
  }
}
