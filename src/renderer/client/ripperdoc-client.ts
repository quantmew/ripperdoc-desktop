/**
 * Ripperdoc IPC Client
 * Communicates with the main process to interact with ripperdoc CLI
 */

export interface RipperdocMessage {
  type: 'user' | 'assistant' | 'result' | 'system' | 'error'
  role?: 'user' | 'assistant'
  content?: string
  parts?: ContentBlock[]
  isStreaming?: boolean
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  name?: string
  input?: Record<string, unknown>
  content?: string
  isError?: boolean
}

export interface RipperdocOptions {
  model?: string
  cwd?: string
  permissionMode?: 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions'
  maxTurns?: number
  tools?: string
}

// Singleton client instance
let currentSessionId: string | null = null
let messageCallback: ((message: RipperdocMessage) => void) | null = null
let initialized = false
let initPromise: Promise<void> | null = null
let sessionReady = false

/**
 * Initialize the ripperdoc client
 */
export async function initRipperdocClient(options: RipperdocOptions = {}): Promise<void> {
  console.log('initRipperdocClient called, current session:', currentSessionId)

  // If already initializing, return the existing promise
  if (initPromise) {
    console.log('Already initializing, waiting...')
    return initPromise
  }

  // If already initialized with a session, return
  if (initialized && currentSessionId && sessionReady) {
    console.log('Already initialized and ready')
    return
  }

  if (!window.electronAPI) {
    throw new Error('Electron API not available')
  }

  if (!window.electronAPI.startRipperdoc) {
    throw new Error('Ripperdoc API not available in electron. Please rebuild the app.')
  }

  initPromise = (async () => {
    // Set up message listener
    if (window.electronAPI.onRipperdocMessage) {
      window.electronAPI.onRipperdocMessage((message: RipperdocMessage) => {
        console.log('Received ripperdoc message:', message)
        if (messageCallback) {
          messageCallback(message)
        }
      })
    }

    // Start ripperdoc process
    try {
      currentSessionId = await window.electronAPI.startRipperdoc(options)
      console.log('Ripperdoc started with session:', currentSessionId)

      if (!currentSessionId) {
        throw new Error('Failed to start ripperdoc: No session ID returned')
      }

      initialized = true

      // Wait for session to be ready (give it a moment for initialization)
      await new Promise(resolve => setTimeout(resolve, 500))
      sessionReady = true
      console.log('Session ready')

    } catch (error) {
      console.error('Failed to start ripperdoc:', error)
      initialized = false
      sessionReady = false
      initPromise = null
      throw error
    }
  })()

  return initPromise
}

/**
 * Check if client is initialized and ready
 */
export function isReady(): boolean {
  return initialized && currentSessionId !== null && sessionReady
}

/**
 * Send a message to ripperdoc
 */
export async function sendRipperdocMessage(content: string): Promise<void> {
  if (!window.electronAPI) {
    throw new Error('Electron API not available')
  }

  if (!currentSessionId) {
    throw new Error('Ripperdoc client not initialized - no session ID')
  }

  if (!sessionReady) {
    throw new Error('Ripperdoc session not ready yet. Please wait...')
  }

  if (!window.electronAPI.sendRipperdocMessage) {
    throw new Error('sendRipperdocMessage not available')
  }

  window.electronAPI.sendRipperdocMessage(currentSessionId, content)
}

/**
 * Stream responses from ripperdoc
 */
export async function* streamRipperdocResponse(
  content: string,
  options: RipperdocOptions = {}
): AsyncGenerator<RipperdocMessage> {
  console.log('streamRipperdocResponse called with:', content, 'ready:', sessionReady)

  const messageQueue: RipperdocMessage[] = []
  let resolveNext: ((value: IteratorResult<RipperdocMessage>) => void) | null = null
  let done = false

  // Set up callback
  messageCallback = (message: RipperdocMessage) => {
    messageQueue.push(message)
    if (resolveNext) {
      resolveNext({ value: messageQueue.shift()!, done: false })
      resolveNext = null
    }
    if (message.type === 'result') {
      done = true
    }
  }

  try {
    // Wait for initialization to complete
    if (!sessionReady) {
      console.log('Waiting for session to be ready...')
      if (initPromise) {
        await initPromise
      } else {
        await initRipperdocClient(options)
      }
    }

    // Double check we're ready
    if (!sessionReady) {
      throw new Error('Session failed to initialize')
    }

    // Send message
    await sendRipperdocMessage(content)

    // Yield messages
    while (true) {
      if (messageQueue.length > 0) {
        const msg = messageQueue.shift()!
        yield msg
        if (msg.type === 'result') {
          break
        }
      } else if (done) {
        break
      } else {
        // Wait for next message with timeout
        const msg = await Promise.race([
          new Promise<RipperdocMessage>((resolve) => {
            resolveNext = (result) => {
              if (result.done) {
                resolve({ type: 'result', usage: { inputTokens: 0, outputTokens: 0 } })
              } else {
                resolve(result.value)
              }
            }
          }),
          new Promise<RipperdocMessage>((resolve) =>
            setTimeout(() => resolve({ type: 'result', usage: { inputTokens: 0, outputTokens: 0 } }), 120000)
          )
        ])
        yield msg
        if (msg.type === 'result') break
      }
    }
  } finally {
    messageCallback = null
  }
}

/**
 * Close the ripperdoc client
 */
export async function closeRipperdocClient(): Promise<void> {
  if (window.electronAPI && currentSessionId && window.electronAPI.stopRipperdoc) {
    await window.electronAPI.stopRipperdoc(currentSessionId)
  }
  currentSessionId = null
  initialized = false
  sessionReady = false
  initPromise = null
}
