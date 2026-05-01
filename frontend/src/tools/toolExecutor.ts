import { tools } from "./index"

export async function executeTool(name: string, args: Record<string, unknown>) {

  const tool = tools.find(t => t.name === name)

  if (!tool) {
    throw new Error("Tool not found: " + name)
  }

  return await tool.execute(args)

}