import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron"

// Preload script to safely expose limited APIs
contextBridge.exposeInMainWorld("electronAPI", {
  // Backend communication
  backendReady: () => ipcRenderer.invoke("backend-ready"),

  // File dialogs
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),

  // External links
  openExternalLink: (url: string) => 
    ipcRenderer.invoke("open-external-link", url),

  // App info
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getAppPath: () => ipcRenderer.invoke("get-app-path"),

  // Listen for events from main process
  onMessage: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    if (["app-ready", "app-error", "workspace-opened"].includes(channel)) {
      ipcRenderer.on(channel, callback)
    }
  },

  // Remove listeners
  offMessage: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.off(channel, callback)
  },

  // One-time listeners
  once: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    if (["app-ready", "app-error", "workspace-opened"].includes(channel)) {
      ipcRenderer.once(channel, callback)
    }
  },

  // Platform info
  platform: process.platform,
  isPackaged: !process.env.ELECTRON_IS_DEV,
})

// Declare global type for electronAPI
declare global {
  interface Window {
    electronAPI: {
      backendReady: () => Promise<boolean>
      openFileDialog: () => Promise<string | null>
      openExternalLink: (url: string) => Promise<void>
      getAppVersion: () => Promise<string>
      getAppPath: () => Promise<string>
      onMessage: (
        channel: string,
        callback: (event: any, ...args: any[]) => void
      ) => void
      offMessage: (
        channel: string,
        callback: (event: any, ...args: any[]) => void
      ) => void
      once: (
        channel: string,
        callback: (event: any, ...args: any[]) => void
      ) => void
      platform: string
      isPackaged: boolean
    }
  }
}

export {}
