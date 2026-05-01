import { readFileTool } from "./readFile"
import { writeFileTool } from "./writeFile"
import { listFilesTool } from "./listFiles"
import { linesEditorTool } from "./linesEditor"
import { searchFilesTool } from "./searchFiles"
import { runCommandTool } from "./runCommand"

export const tools = [
  readFileTool,
  writeFileTool,
  listFilesTool,
  linesEditorTool,
  searchFilesTool,
  runCommandTool,
]
