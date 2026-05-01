import type { Tool } from "./types"
import { callWorkspaceApi } from "./backendApi"

export const linesEditorTool: Tool = {
  name: "lines_editor",
  description: "Precisely edit specific lines in a workspace file using replace, insert, or delete operations",

  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Workspace-relative path of the file to edit",
      },
      operations_json: {
        type: "string",
        description: 'JSON array of operations, e.g. [{"op":"replace","start_line":5,"end_line":7,"content":"new code\\n"}]',
      },
    },
    required: ["path", "operations_json"],
  },

  async execute({ path, operations_json }) {
    return await callWorkspaceApi("/workspace/lines-edit", { path, operations_json })
  },
}
