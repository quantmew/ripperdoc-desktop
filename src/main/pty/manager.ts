import { BrowserWindow, ipcMain } from 'electron'
import * as pty from 'node-pty'
import { app } from 'electron'

export class PtyManager {
  private sessions: Map<string, pty.IPty> = new Map()
  private initialized = false

  initialize(): void {
    if (this.initialized) return

    // Handle PTY data
    ipcMain.on('terminal:create', (event, id: string, cols: number, rows: number) => {
      this.createWithId(id, cols, rows, event.sender)
    })

    this.initialized = true
  }

  create(cols: number, rows: number): string {
    const id = `pty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.createWithId(id, cols, rows)
    return id
  }

  private createWithId(id: string, cols: number, rows: number, sender?: Electron.WebContents): void {
    const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash'

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: app.getPath('home'),
      env: process.env as { [key: string]: string }
    })

    ptyProcess.onData((data) => {
      const window = BrowserWindow.getAllWindows()[0]
      if (window) {
        window.webContents.send('terminal:data', id, data)
      }
    })

    ptyProcess.onExit(({ exitCode }) => {
      const window = BrowserWindow.getAllWindows()[0]
      if (window) {
        window.webContents.send('terminal:exit', id, exitCode)
      }
      this.sessions.delete(id)
    })

    this.sessions.set(id, ptyProcess)
  }

  write(id: string, data: string): void {
    const session = this.sessions.get(id)
    if (session) {
      session.write(data)
    }
  }

  resize(id: string, cols: number, rows: number): void {
    const session = this.sessions.get(id)
    if (session) {
      session.resize(cols, rows)
    }
  }

  destroy(id: string): void {
    const session = this.sessions.get(id)
    if (session) {
      session.kill()
      this.sessions.delete(id)
    }
  }

  cleanup(): void {
    for (const [id] of this.sessions) {
      this.destroy(id)
    }
  }
}
