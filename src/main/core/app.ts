import { BrowserWindow, app, dialog, ipcMain, Menu, Tray, nativeImage } from 'electron'
import { join } from 'path'
import { ServerManager } from '../server/manager'
import { PtyManager } from '../pty/manager'
import type { ServerConfig } from '../server/types'

export class MainApp {
  private serverManager: ServerManager
  private ptyManager: PtyManager
  private tray: Tray | null = null
  private store: Map<string, unknown> = new Map()

  constructor() {
    this.serverManager = new ServerManager()
    this.ptyManager = new PtyManager()
  }

  async initialize(): Promise<void> {
    // Initialize server manager
    await this.serverManager.initialize()

    // Initialize PTY manager
    this.ptyManager.initialize()

    // Setup IPC handlers
    this.setupIpcHandlers()

    // Setup tray (macOS only)
    if (process.platform === 'darwin') {
      this.setupTray()
    }

    // Setup menu
    this.setupMenu()

    // Load persisted state
    await this.loadState()
  }

  async cleanup(): Promise<void> {
    // Stop all PTY processes
    this.ptyManager.cleanup()

    // Stop server
    await this.serverManager.stop()

    // Save state
    await this.saveState()
  }

  private setupIpcHandlers(): void {
    // Server handlers
    ipcMain.handle('server:start', async (_, config: ServerConfig) => {
      return this.serverManager.start(config)
    })

    ipcMain.handle('server:stop', async () => {
      return this.serverManager.stop()
    })

    ipcMain.handle('server:status', () => {
      return this.serverManager.getStatus()
    })

    // PTY handlers
    ipcMain.handle('terminal:create', async (_, cols: number, rows: number) => {
      return this.ptyManager.create(cols, rows)
    })

    ipcMain.on('terminal:write', (_, id: string, data: string) => {
      this.ptyManager.write(id, data)
    })

    ipcMain.on('terminal:resize', (_, id: string, cols: number, rows: number) => {
      this.ptyManager.resize(id, cols, rows)
    })

    ipcMain.handle('terminal:destroy', (_, id: string) => {
      this.ptyManager.destroy(id)
    })

    // File system handlers
    ipcMain.handle('fs:selectDirectory', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory']
      })
      return result.filePaths[0] || null
    })

    ipcMain.handle('fs:selectFile', async (_, filters?: Electron.FileFilter[]) => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters
      })
      return result.filePaths[0] || null
    })

    // Store handlers
    ipcMain.handle('store:get', (_, key: string) => {
      return this.store.get(key)
    })

    ipcMain.handle('store:set', (_, key: string, value: unknown) => {
      this.store.set(key, value)
      return true
    })

    ipcMain.handle('store:delete', (_, key: string) => {
      this.store.delete(key)
      return true
    })

    // Theme handlers
    ipcMain.handle('theme:get', () => {
      return this.store.get('theme') || 'system'
    })

    ipcMain.handle('theme:set', (_, theme: string) => {
      this.store.set('theme', theme)
      return true
    })
  }

  private setupTray(): void {
    const iconPath = join(__dirname, '../../../resources/icon.png')
    const icon = nativeImage.createFromPath(iconPath)
    this.tray = new Tray(icon.resize({ width: 16, height: 16 }))

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Window',
        click: () => {
          const windows = BrowserWindow.getAllWindows()
          if (windows.length > 0) {
            windows[0].show()
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit()
        }
      }
    ])

    this.tray.setToolTip('Ripperdoc')
    this.tray.setContextMenu(contextMenu)
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Session',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              BrowserWindow.getFocusedWindow()?.webContents.send('menu:newSession')
            }
          },
          { type: 'separator' },
          {
            label: 'Open Directory',
            accelerator: 'CmdOrCtrl+O',
            click: async () => {
              const result = await dialog.showOpenDialog({
                properties: ['openDirectory']
              })
              if (result.filePaths[0]) {
                BrowserWindow.getFocusedWindow()?.webContents.send('menu:openDirectory', result.filePaths[0])
              }
            }
          },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Toggle Sidebar',
            accelerator: 'CmdOrCtrl+B',
            click: () => {
              BrowserWindow.getFocusedWindow()?.webContents.send('menu:toggleSidebar')
            }
          },
          {
            label: 'Toggle Terminal',
            accelerator: 'CmdOrCtrl+`',
            click: () => {
              BrowserWindow.getFocusedWindow()?.webContents.send('menu:toggleTerminal')
            }
          },
          { type: 'separator' },
          {
            label: 'Command Palette',
            accelerator: 'CmdOrCtrl+Shift+P',
            click: () => {
              BrowserWindow.getFocusedWindow()?.webContents.send('menu:commandPalette')
            }
          },
          { type: 'separator' },
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [{ role: 'minimize' }, { role: 'close' }]
      }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }

  private async loadState(): Promise<void> {
    // TODO: Implement persistent state loading
    // const storePath = join(app.getPath('userData'), 'store.json')
  }

  private async saveState(): Promise<void> {
    // TODO: Implement persistent state saving
    // const storePath = join(app.getPath('userData'), 'store.json')
  }
}
