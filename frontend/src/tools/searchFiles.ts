import type { Tool } from "./types"
import { callWorkspaceApi } from "./backendApi"

export const searchFilesTool: Tool = {
  name: "search_files",
  description: "Search workspace files for text and return matching line hits.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string" },
      max_results: { type: "integer" }
    },
    required: ["query"]
  },
  async execute({ query, max_results = 100 }) {
    return await callWorkspaceApi("/workspace/search", { query, max_results })
  }
}
