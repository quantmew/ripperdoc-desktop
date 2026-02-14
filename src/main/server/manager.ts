import { app } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'
import type { ServerConfig, ServerStatus } from './types'

export class ServerManager {
  private process: ChildProcess | null = null
  private status: ServerStatus = 'stopped'
  private port: number = 8765

  async initialize(): Promise<void> {
    // Check for existing ripperdoc installation
    console.log('Initializing server manager...')
  }

  async start(config: ServerConfig): Promise<{ port: number; status: ServerStatus }> {
    if (this.process) {
      return { port: this.port, status: this.status }
    }

    this.status = 'starting'

    try {
      // Find ripperdoc executable
      const ripperdocPath = this.findRipperdocPath()

      if (!ripperdocPath) {
        // For development, we'll simulate the server
        console.warn('Ripperdoc not found, running in development mode')
        this.status = 'running'
        return { port: this.port, status: this.status }
      }

      // Start the ripperdoc server
      this.process = spawn(ripperdocPath, ['serve', '--port', String(this.port)], {
        cwd: config.workingDirectory || app.getPath('home'),
        env: {
          ...process.env,
          RIPPERDOC_MODE: 'desktop'
        }
      })

      this.process.stdout?.on('data', (data) => {
        console.log(`[ripperdoc] ${data}`)
      })

      this.process.stderr?.on('data', (data) => {
        console.error(`[ripperdoc error] ${data}`)
      })

      this.process.on('close', (code) => {
        console.log(`Ripperdoc process exited with code ${code}`)
        this.status = 'stopped'
        this.process = null
      })

      this.status = 'running'
      return { port: this.port, status: this.status }
    } catch (error) {
      this.status = 'error'
      throw error
    }
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
    this.status = 'stopped'
  }

  getStatus(): ServerStatus {
    return this.status
  }

  getPort(): number {
    return this.port
  }

  private findRipperdocPath(): string | null {
    // Check common installation paths
    const paths = [
      // Windows
      join(app.getPath('appData'), 'ripperdoc', 'ripperdoc.exe'),
      join(app.getPath('home'), '.local', 'bin', 'ripperdoc.exe'),
      // macOS
      '/usr/local/bin/ripperdoc',
      join(app.getPath('home'), '.local', 'bin', 'ripperdoc'),
      // Linux
      '/usr/bin/ripperdoc',
      join(app.getPath('home'), '.local', 'bin', 'ripperdoc')
    ]

    // For now, return null to indicate development mode
    // In production, this would check if the file exists
    return null
  }
}
