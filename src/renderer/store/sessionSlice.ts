import { create } from 'zustand'

export interface MessagePart {
  type: 'text' | 'code' | 'file' | 'tool_use' | 'tool_result'
  content: string
  language?: string
  filePath?: string
  toolName?: string
  toolInput?: Record<string, unknown>
  toolResult?: unknown
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  parts: MessagePart[]
  timestamp: number
  isStreaming?: boolean
}

export interface SessionData {
  id: string
  messages: Message[]
  isLoading: boolean
  error: string | null
}

interface SessionState {
  sessions: Map<string, SessionData>

  // Actions
  getSession: (id: string) => SessionData | undefined
  addMessage: (sessionId: string, message: Message) => void
  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void
  setLoading: (sessionId: string, isLoading: boolean) => void
  setError: (sessionId: string, error: string | null) => void
  clearSession: (sessionId: string) => void
  createSession: (id: string) => void
}

const createEmptySession = (id: string): SessionData => ({
  id,
  messages: [],
  isLoading: false,
  error: null
})

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: new Map(),

  getSession: (id) => get().sessions.get(id),

  createSession: (id) =>
    set((state) => {
      const newSessions = new Map(state.sessions)
      newSessions.set(id, createEmptySession(id))
      return { sessions: newSessions }
    }),

  addMessage: (sessionId, message) =>
    set((state) => {
      let session = state.sessions.get(sessionId)

      // Auto-create session if it doesn't exist
      if (!session) {
        session = createEmptySession(sessionId)
      }

      const newSessions = new Map(state.sessions)
      newSessions.set(sessionId, {
        ...session,
        messages: [...session.messages, message]
      })
      return { sessions: newSessions }
    }),

  updateMessage: (sessionId, messageId, updates) =>
    set((state) => {
      let session = state.sessions.get(sessionId)

      // Auto-create session if it doesn't exist
      if (!session) {
        session = createEmptySession(sessionId)
      }

      const newSessions = new Map(state.sessions)
      newSessions.set(sessionId, {
        ...session,
        messages: session.messages.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
      })
      return { sessions: newSessions }
    }),

  setLoading: (sessionId, isLoading) =>
    set((state) => {
      let session = state.sessions.get(sessionId)

      // Auto-create session if it doesn't exist
      if (!session) {
        session = createEmptySession(sessionId)
      }

      const newSessions = new Map(state.sessions)
      newSessions.set(sessionId, { ...session, isLoading })
      return { sessions: newSessions }
    }),

  setError: (sessionId, error) =>
    set((state) => {
      const session = state.sessions.get(sessionId)
      if (!session) return state

      const newSessions = new Map(state.sessions)
      newSessions.set(sessionId, { ...session, error })
      return { sessions: newSessions }
    }),

  clearSession: (sessionId) =>
    set((state) => {
      const newSessions = new Map(state.sessions)
      newSessions.delete(sessionId)
      return { sessions: newSessions }
    })
}))
