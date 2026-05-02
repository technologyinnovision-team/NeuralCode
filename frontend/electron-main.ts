import {
  app,
  BrowserWindow,
  ipcMain,
  IpcMainEvent,
  Menu,
  dialog,
  shell,
} from "electron"
import { spawn, ChildProcess } from "child_process"
import * as path from "path"
import * as fs from "fs"
import * as os from "os"

let mainWindow: BrowserWindow | null = null
let pythonProcess: ChildProcess | null = null
const PYTHON_PORT = 8000

const isDev = !app.isPackaged
const isWindows = process.platform === "win32"

function getBackendDir(): string {
  if (isDev) {
    return path.join(__dirname, "..", "..", "backend")
  }

  // In packaged app the backend is placed via extraResources → resources/backend/
  // This avoids asar entirely, so no path guessing needed.
  return path.join(process.resourcesPath, "backend")
}

// Get Python executable path
function getPythonExecutable(): string {
  const backendDir = getBackendDir()

  const resolveExecutable = (executable: string): string => {
    if (isWindows && !path.isAbsolute(executable) && !executable.includes(path.sep)) {
      return executable
    }

    if (path.isAbsolute(executable) || executable.includes(path.sep)) {
      return executable
    }

    try {
      const { execSync } = require("child_process")
      if (isWindows) {
        const result = execSync(`where.exe ${executable}`, {
          stdio: ["pipe", "pipe", "ignore"],
        })
          .toString()
          .split(/\r?\n/)[0]
          .trim()
        if (result && fs.existsSync(result)) {
          return result
        }
      } else {
        const result = execSync(`command -v ${executable}`, {
          stdio: ["pipe", "pipe", "ignore"],
          shell: true,
        })
          .toString()
          .trim()
        if (result) {
          return result
        }
      }
    } catch {
      // ignore resolution failures
    }

    return executable
  }

  const canExecute = (executable: string, args: string[]): boolean => {
    try {
      const { spawnSync } = require("child_process")
      const result = spawnSync(executable, args, {
        stdio: "ignore",
      })
      return !result.error && result.status === 0
    } catch {
      return false
    }
  }

  // Try local venv first, then common launchers
  const pythonPaths = [
    path.join(backendDir, ".venv", "Scripts", "python.exe"),
    path.join(backendDir, ".venv", "bin", "python"),
    "python",
    "python3",
    "python.exe",
    "python3.exe",
    "py",
    "py.exe",
  ]

  for (const pythonPath of pythonPaths) {
    const resolvedPath = resolveExecutable(pythonPath)
    const probeArgs =
      isWindows &&
      (resolvedPath.toLowerCase().endsWith("\\py.exe") ||
        resolvedPath.toLowerCase() === "py" ||
        resolvedPath.toLowerCase() === "py.exe")
        ? ["-3", "--version"]
        : ["--version"]

    if (canExecute(resolvedPath, probeArgs)) {
      return resolvedPath
    }
  }

  throw new Error("Python not found in PATH")
}

function findBundledExecutable(): string | null {
  const backendDir = getBackendDir()
  const candidates = isWindows ? ["server.exe", "server"] : ["server"]

  for (const candidate of candidates) {
    const candidatePath = path.join(backendDir, candidate)
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return candidatePath
    }
  }

  if (!fs.existsSync(backendDir)) {
    return null
  }

  const recursiveFind = (dir: string): string | null => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name)
      if (entry.isFile() && candidates.includes(entry.name)) {
        return entryPath
      }
      if (entry.isDirectory()) {
        const found = recursiveFind(entryPath)
        if (found) {
          return found
        }
      }
    }
    return null
  }

  return recursiveFind(backendDir)
}

// Start Python backend
function startPythonBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const backendDir = getBackendDir()

      // Prefer the bundled executable so the app works without Python installed
      const bundledExe = findBundledExecutable()

      let spawnCmd: string
      let spawnArgs: string[]

      if (bundledExe) {
        console.log(`Using bundled server executable: ${bundledExe}`)
        spawnCmd = bundledExe
        spawnArgs = []
      } else {
        // Fall back to system Python
        const pythonExe = getPythonExecutable()
        const serverScript = path.join(backendDir, "server.py")
        spawnArgs =
          isWindows &&
          (pythonExe.toLowerCase().endsWith("\\py.exe") ||
            pythonExe.toLowerCase() === "py" ||
            pythonExe.toLowerCase() === "py.exe")
            ? ["-3", serverScript]
            : [serverScript]
        console.log(`Starting Python backend: ${pythonExe} ${spawnArgs.join(" ")}`)
        spawnCmd = pythonExe
      }

      pythonProcess = spawn(spawnCmd, spawnArgs, {
        cwd: backendDir,
        stdio: ["ignore", "pipe", "pipe"],
        detached: !isWindows,
        windowsHide: true,
      })

      pythonProcess.stdout?.on("data", (data) => {
        console.log(`[Backend] ${data.toString()}`)
      })

      pythonProcess.stderr?.on("data", (data) => {
        console.error(`[Backend Error] ${data.toString()}`)
      })

      pythonProcess.on("error", (err) => {
        console.error("Failed to start backend:", err)
        reject(err)
      })

      // Wait a bit for the backend to start
      setTimeout(() => {
        resolve()
      }, 3000)
    } catch (err) {
      reject(err)
    }
  })
}

// Stop Python backend
function stopPythonBackend(): void {
  if (!pythonProcess || !pythonProcess.pid) {
    return
  }

  try {
    if (isWindows) {
      const { spawnSync } = require("child_process")
      const result = spawnSync(
        "taskkill",
        ["/PID", String(pythonProcess.pid), "/T", "/F"],
        { stdio: "ignore" }
      )
      if (result.error && (result.error as NodeJS.ErrnoException).code !== "ESRCH") {
        throw result.error
      }
    } else {
      process.kill(-pythonProcess.pid!)
    }
  } catch (err) {
    // The process may already have exited; avoid noisy shutdown errors.
    if ((err as NodeJS.ErrnoException).code !== "ESRCH") {
      console.error("Error killing Python process:", err)
    }
  }

  pythonProcess = null
}

// Create main window
async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  if (isDev) {
    await mainWindow.loadURL("http://localhost:5000")
    mainWindow.webContents.openDevTools()
  } else {
    await mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"))
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// IPC Handlers
ipcMain.handle("backend-ready", async () => {
  const http = require("http")
  return new Promise((resolve) => {
    const check = () => {
      http
        .get(`http://localhost:${PYTHON_PORT}/health`, (res: any) => {
          if (res.statusCode === 200) {
            resolve(true)
          } else {
            setTimeout(check, 500)
          }
        })
        .on("error", () => {
          setTimeout(check, 500)
        })
    }
    check()
  })
})

ipcMain.handle("open-file-dialog", async () => {
  if (!mainWindow) return null

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  })

  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle("open-external-link", (_, url: string) => {
  shell.openExternal(url)
})

ipcMain.handle("get-app-version", () => {
  return app.getVersion()
})

ipcMain.handle("get-app-path", () => {
  return app.getAppPath()
})

// App event handlers
app.on("ready", async () => {
  try {
    console.log("Starting NeuralCode...")
    await startPythonBackend()
    await createWindow()
    createMenu()
  } catch (err) {
    console.error("Failed to start app:", err)
    const message = err instanceof Error ? err.message : String(err)
    dialog.showErrorBox(
      "Startup Error",
      `Failed to start NeuralCode backend.\n\n${message}\n\nPlease reinstall the application.`
    )
    app.quit()
  }
})

app.on("window-all-closed", () => {
  stopPythonBackend()
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", async () => {
  if (mainWindow === null) {
    try {
      await startPythonBackend()
      await createWindow()
    } catch (err) {
      console.error("Failed to recreate window:", err)
    }
  }
})

app.on("before-quit", () => {
  stopPythonBackend()
})

// Create application menu
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "Exit",
          accelerator: "CmdOrCtrl+Q",
          click: () => {
            app.quit()
          },
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", role: "undo" },
        { label: "Redo", accelerator: "CmdOrCtrl+Y", role: "redo" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", role: "cut" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", role: "copy" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", role: "paste" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Reload", accelerator: "CmdOrCtrl+R", role: "reload" },
        {
          label: "Toggle DevTools",
          accelerator: "CmdOrCtrl+Shift+I",
          role: "toggleDevTools",
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: "info",
              title: "About NeuralCode",
              message: `NeuralCode v${app.getVersion()}`,
              detail:
                "An AI-powered code editor and workspace manager.\n\nBuilt with Electron, React, and Python.",
            })
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Handle any uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err)
})
