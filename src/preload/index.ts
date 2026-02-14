import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // App
  getVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  quit: () => ipcRenderer.invoke('app:quit'),
  minimize: () => ipcRenderer.invoke('app:minimize'),
  maximize: () => ipcRenderer.invoke('app:maximize'),
  close: () => ipcRenderer.invoke('app:close'),

  // Server
  startServer: (config: unknown) => ipcRenderer.invoke('server:start', config),
  stopServer: () => ipcRenderer.invoke('server:stop'),
  getServerStatus: () => ipcRenderer.invoke('server:status'),

  // Terminal
  createTerminal: (cols: number, rows: number) => ipcRenderer.invoke('terminal:create', cols, rows),
  writeTerminal: (id: string, data: string) => ipcRenderer.send('terminal:write', id, data),
  resizeTerminal: (id: string, cols: number, rows: number) => ipcRenderer.send('terminal:resize', id, cols, rows),
  destroyTerminal: (id: string) => ipcRenderer.invoke('terminal:destroy', id),
  onTerminalData: (callback: (id: string, data: string) => void) => {
    ipcRenderer.on('terminal:data', (_, id, data) => callback(id, data))
  },
  onTerminalExit: (callback: (id: string, code: number) => void) => {
    ipcRenderer.on('terminal:exit', (_, id, code) => callback(id, code))
  },

  // File System
  selectDirectory: () => ipcRenderer.invoke('fs:selectDirectory'),
  selectFile: (filters?: unknown) => ipcRenderer.invoke('fs:selectFile', filters),

  // Store
  storeGet: (key: string) => ipcRenderer.invoke('store:get', key),
  storeSet: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
  storeDelete: (key: string) => ipcRenderer.invoke('store:delete', key),

  // Theme
  getTheme: () => ipcRenderer.invoke('theme:get'),
  setTheme: (theme: string) => ipcRenderer.invoke('theme:set', theme),

  // Menu events
  onMenuNewSession: (callback: () => void) => {
    ipcRenderer.on('menu:newSession', callback)
  },
  onMenuOpenDirectory: (callback: (path: string) => void) => {
    ipcRenderer.on('menu:openDirectory', (_, path) => callback(path))
  },
  onMenuToggleSidebar: (callback: () => void) => {
    ipcRenderer.on('menu:toggleSidebar', callback)
  },
  onMenuToggleTerminal: (callback: () => void) => {
    ipcRenderer.on('menu:toggleTerminal', callback)
  },
  onMenuCommandPalette: (callback: () => void) => {
    ipcRenderer.on('menu:commandPalette', callback)
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// Type declaration for window
declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>
      getPlatform: () => Promise<string>
      quit: () => Promise<void>
      minimize: () => Promise<void>
      maximize: () => Promise<void>
      close: () => Promise<void>
      startServer: (config: unknown) => Promise<{ port: number; status: string }>
      stopServer: () => Promise<void>
      getServerStatus: () => Promise<string>
      createTerminal: (cols: number, rows: number) => Promise<string>
      writeTerminal: (id: string, data: string) => void
      resizeTerminal: (id: string, cols: number, rows: number) => void
      destroyTerminal: (id: string) => Promise<void>
      onTerminalData: (callback: (id: string, data: string) => void) => void
      onTerminalExit: (callback: (id: string, code: number) => void) => void
      selectDirectory: () => Promise<string | null>
      selectFile: (filters?: unknown) => Promise<string | null>
      storeGet: (key: string) => Promise<unknown>
      storeSet: (key: string, value: unknown) => Promise<boolean>
      storeDelete: (key: string) => Promise<boolean>
      getTheme: () => Promise<string>
      setTheme: (theme: string) => Promise<boolean>
      onMenuNewSession: (callback: () => void) => void
      onMenuOpenDirectory: (callback: (path: string) => void) => void
      onMenuToggleSidebar: (callback: () => void) => void
      onMenuToggleTerminal: (callback: () => void) => void
      onMenuCommandPalette: (callback: () => void) => void
      removeAllListeners: (channel: string) => void
    }
  }
}
