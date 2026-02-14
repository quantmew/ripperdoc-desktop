/**
 * Ripperdoc Manager - Main Process
 * Manages ripperdoc CLI processes and communication
 */

import { spawn, ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import { app } from 'electron'
import { randomBytes } from 'crypto'

interface RipperdocSession {
  id: string
  process: ChildProcess
  buffer: string
  initialized: boolean
  pendingInitResolve: (() => void) | null
  requestCounter: number
}

interface RipperdocOptions {
  model?: string
  cwd?: string
  permissionMode?: string
  maxTurns?: number
  tools?: string
}

export class RipperdocManager {
  private sessions: Map<string, RipperdocSession> = new Map()

  start(options: RipperdocOptions = {}): string {
    const sessionId = `rd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Find ripperdoc executable
    const ripperdocInfo = this.findRipperdocPath()
    if (!ripperdocInfo) {
      throw new Error('Ripperdoc CLI not found. Install with: pip install git+https://github.com/quantmew/ripperdoc.git')
    }

    const { command, args: baseArgs } = ripperdocInfo

    // Build command arguments
    const args = [
      ...baseArgs,
      '--output-format', 'stream-json',
      '--input-format', 'stream-json',
      '--verbose'
    ]

    if (options.model) {
      args.push('--model', options.model)
    }

    if (options.permissionMode) {
      args.push('--permission-mode', options.permissionMode)
    }

    if (options.maxTurns) {
      args.push('--max-turns', String(options.maxTurns))
    }

    if (options.tools) {
      args.push('--tools', options.tools)
    }

    const cwd = options.cwd || app.getPath('home')

    console.log(`Starting ripperdoc: ${command} ${args.join(' ')}`)

    const ripperdocProcess = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    const session: RipperdocSession = {
      id: sessionId,
      process: ripperdocProcess,
      buffer: '',
      initialized: false,
      pendingInitResolve: null,
      requestCounter: 0
    }

    // Handle stdout - JSON messages
    ripperdocProcess.stdout?.on('data', (data: Buffer) => {
      const chunk = data.toString()
      session.buffer += chunk
      this.processBuffer(session)
    })

    // Handle stderr - logs
    ripperdocProcess.stderr?.on('data', (data: Buffer) => {
      console.log(`[ripperdoc stderr] ${data.toString()}`)
    })

    // Handle process exit
    ripperdocProcess.on('exit', (code) => {
      console.log(`Ripperdoc process exited with code ${code}`)
      this.sessions.delete(sessionId)
    })

    ripperdocProcess.on('error', (error) => {
      console.error('Ripperdoc process error:', error)
    })

    this.sessions.set(sessionId, session)

    // Send initialization request
    this.sendInitializeRequest(session)

    return sessionId
  }

  private sendInitializeRequest(session: RipperdocSession): void {
    session.requestCounter += 1
    const requestId = `req_${session.requestCounter}_${randomBytes(4).toString('hex')}`

    const initRequest = {
      type: 'control_request',
      request_id: requestId,
      request: {
        subtype: 'initialize',
        hooks: null
      }
    }

    console.log('Sending initialize request:', JSON.stringify(initRequest))

    // Store resolve function to be called when we get the response
    session.pendingInitResolve = () => {
      session.initialized = true
      console.log('Ripperdoc session initialized:', session.id)
    }

    session.process.stdin?.write(JSON.stringify(initRequest) + '\n')
  }

  private processBuffer(session: RipperdocSession): void {
    let newlineIndex = session.buffer.indexOf('\n')
    while (newlineIndex !== -1) {
      const line = session.buffer.slice(0, newlineIndex).trim()
      session.buffer = session.buffer.slice(newlineIndex + 1)
      newlineIndex = session.buffer.indexOf('\n')

      if (!line) continue

      try {
        const message = JSON.parse(line)
        console.log('Parsed message:', JSON.stringify(message, null, 2))

        // Check for initialization response
        if (message.type === 'control_response') {
          const response = message.response
          console.log('Control response received:', response)

          if (response && response.subtype === 'success' && session.pendingInitResolve) {
            console.log('Initialization successful, calling resolve')
            session.pendingInitResolve()
            session.pendingInitResolve = null
            continue
          }

          // Log error responses
          if (response && response.subtype === 'error') {
            console.error('Control response error:', response.error)
          }

          // Skip other control responses for now (don't send to renderer)
          continue
        }

        this.sendMessageToRenderer(message)
      } catch (error) {
        console.warn('Failed to parse JSON:', line, error)
      }
    }
  }

  private sendMessageToRenderer(message: unknown): void {
    const windows = BrowserWindow.getAllWindows()
    for (const window of windows) {
      window.webContents.send('ripperdoc:message', message)
    }
  }

  send(sessionId: string, content: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.error('Session not found:', sessionId)
      return
    }

    if (!session.initialized) {
      console.error('Session not initialized yet:', sessionId)
      // Send error to renderer
      this.sendMessageToRenderer({
        type: 'error',
        content: 'Session not initialized. Please wait...'
      })
      return
    }

    if (!session.process.stdin) {
      console.error('stdin not available')
      return
    }

    const message = {
      type: 'user',
      message: { role: 'user', content },
      parent_tool_use_id: null,
      session_id: sessionId
    }

    const jsonLine = JSON.stringify(message) + '\n'
    console.log('Sending to ripperdoc:', jsonLine)

    session.process.stdin.write(jsonLine)
  }

  stop(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    if (session.process.stdin) {
      session.process.stdin.end()
    }
    session.process.kill()
    this.sessions.delete(sessionId)
  }

  stopAll(): void {
    for (const [sessionId] of this.sessions) {
      this.stop(sessionId)
    }
  }

  private findRipperdocPath(): { command: string; args: string[] } | null {
    // On Windows, try to find ripperdoc.exe or ripperdoc in PATH
    const { execSync } = require('child_process')

    try {
      // Try to get the path from where/which command
      if (process.platform === 'win32') {
        const path = execSync('where ripperdoc', { encoding: 'utf8' }).trim().split('\n')[0]
        if (path) {
          console.log('Found ripperdoc at:', path)
          return { command: path, args: [] }
        }
      } else {
        const path = execSync('which ripperdoc', { encoding: 'utf8' }).trim()
        if (path) {
          console.log('Found ripperdoc at:', path)
          return { command: path, args: [] }
        }
      }
    } catch (error) {
      console.log('ripperdoc not found in PATH:', error)
    }

    // Try python -m ripperdoc
    try {
      execSync('python -m ripperdoc --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      console.log('Found ripperdoc via python -m')
      return { command: 'python', args: ['-m', 'ripperdoc'] }
    } catch {
      // Try python3
      try {
        execSync('python3 -m ripperdoc --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
        console.log('Found ripperdoc via python3 -m')
        return { command: 'python3', args: ['-m', 'ripperdoc'] }
      } catch {
        // Try py on Windows
        if (process.platform === 'win32') {
          try {
            execSync('py -m ripperdoc --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
            console.log('Found ripperdoc via py -m')
            return { command: 'py', args: ['-m', 'ripperdoc'] }
          } catch {
            // Not found
          }
        }
      }
    }

    console.error('ripperdoc not found')
    return null
  }
}
