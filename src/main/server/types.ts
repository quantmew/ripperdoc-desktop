export type ServerStatus = 'stopped' | 'starting' | 'running' | 'error'

export interface ServerConfig {
  workingDirectory?: string
  port?: number
  pythonPath?: string
}
