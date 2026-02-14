import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, Square, AlertCircle } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'
import { Button, Textarea, ScrollArea } from '@/renderer/components/ui'
import { useLayoutStore, useSessionStore } from '@/renderer/store'
import { MessageItem } from '@/renderer/components/session/MessageItem'
import type { Message } from '@/renderer/store/sessionSlice'
import { streamRipperdocResponse, initRipperdocClient, closeRipperdocClient, isReady } from '@/renderer/client/ripperdoc-client'

export function MainContent() {
  const { activeSessionId, openFiles, activeFileId } = useLayoutStore()
  const { sessions, addMessage, updateMessage, setLoading } = useSessionStore()
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [ripperdocError, setRipperdocError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Use 'default' session when no active session
  const currentSessionId = activeSessionId || 'default'
  const session = sessions.get(currentSessionId)
  const messages = session?.messages || []
  console.log('Current session:', currentSessionId, 'Messages:', messages.length)

  // Check ripperdoc availability on mount
  useEffect(() => {
    const checkRipperdoc = async () => {
      try {
        console.log('Initializing ripperdoc client...')
        await initRipperdocClient()
        console.log('Ripperdoc client initialized, ready:', isReady())
        setRipperdocError(null)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Failed to initialize ripperdoc:', errorMessage)
        if (errorMessage.includes('not found') || errorMessage.includes('not installed')) {
          setRipperdocError('Ripperdoc CLI not installed. Please run: pip install git+https://github.com/quantmew/ripperdoc.git')
        } else {
          setRipperdocError(errorMessage)
        }
      }
    }
    checkRipperdoc()

    return () => {
      closeRipperdocClient()
    }
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const handleSubmit = useCallback(async () => {
    console.log('handleSubmit called', { input: input.trim(), isStreaming, ripperdocError, isReady: isReady() })
    if (!input.trim() || isStreaming) return
    if (ripperdocError) {
      console.error('Ripperdoc not available:', ripperdocError)
      return
    }
    if (!isReady()) {
      console.error('Ripperdoc session not ready yet')
      return
    }

    const sessionId = currentSessionId
    const userInput = input.trim()
    const messageId = `msg-${Date.now()}`
    console.log('Creating message:', { sessionId, userInput, messageId })

    // Create user message
    const userMessage: Message = {
      id: messageId,
      role: 'user',
      parts: [{ type: 'text', content: userInput }],
      timestamp: Date.now()
    }

    addMessage(sessionId, userMessage)
    setInput('')
    setIsStreaming(true)
    setLoading(sessionId, true)

    // Create assistant message placeholder
    const assistantMessageId = `msg-${Date.now() + 1}`
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      parts: [{ type: 'text', content: '' }],
      timestamp: Date.now(),
      isStreaming: true
    }
    addMessage(sessionId, assistantMessage)
    console.log('Assistant message added:', assistantMessageId)

    try {
      console.log('Starting ripperdoc stream...')
      let accumulatedContent = ''
      for await (const msg of streamRipperdocResponse(userInput)) {
        console.log('Received ripperdoc msg:', msg)
        if (msg.type === 'assistant') {
          // Handle content blocks
          if (msg.parts) {
            for (const part of msg.parts) {
              if (part.type === 'text' && part.text) {
                accumulatedContent = part.text
              }
            }
          } else if (msg.content) {
            accumulatedContent = msg.content
          }

          if (accumulatedContent) {
            updateMessage(sessionId, assistantMessageId, {
              parts: [{ type: 'text', content: accumulatedContent }],
              isStreaming: msg.type !== 'result'
            })
          }
        }
      }
      console.log('ripperdoc stream completed')
    } catch (error) {
      console.error('Error streaming response:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updateMessage(sessionId, assistantMessageId, {
        parts: [{ type: 'text', content: `Error: ${errorMessage}` }],
        isStreaming: false
      })
    } finally {
      setLoading(sessionId, false)
      setIsStreaming(false)
    }
  }, [input, isStreaming, currentSessionId, ripperdocError, addMessage, updateMessage, setLoading])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.log('handleKeyDown called', { key: e.key, shiftKey: e.shiftKey })
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Welcome state - show when there are no messages
  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {/* Error Banner */}
        {ripperdocError && (
          <div className="mx-4 mt-4 p-4 bg-error-weak border border-error-base/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error-base shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-error-base mb-1">Ripperdoc CLI Required</p>
              <p className="text-sm text-text-weak mb-2">{ripperdocError}</p>
              <code className="text-xs bg-surface-sunken px-2 py-1 rounded">
                pip install git+https://github.com/quantmew/ripperdoc.git
              </code>
            </div>
          </div>
        )}

        {/* File Tabs */}
        {openFiles.length > 0 && (
          <div className="flex items-center border-b border-border-base bg-surface-raised">
            {openFiles.map((file) => (
              <button
                key={file}
                className={cn(
                  'px-4 py-2 text-sm border-r border-border-weak',
                  'hover:bg-surface-sunken transition-colors',
                  activeFileId === file ? 'bg-surface-base text-text-base' : 'text-text-weak'
                )}
              >
                {file.split('/').pop()}
              </button>
            ))}
          </div>
        )}

        {/* Welcome Message */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary-weak flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary-base" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-text-base mb-2">Welcome to Ripperdoc</h1>
            <p className="text-text-weak mb-6">Your AI-powered coding assistant. Start a conversation or open a project to begin.</p>
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border-base p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-surface-raised rounded-lg border border-border-base p-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  console.log('onChange:', e.target.value)
                  setInput(e.target.value)
                }}
                onKeyDown={handleKeyDown}
                placeholder="Send a message..."
                className="flex-1 min-h-[40px] max-h-[200px] border-0 bg-transparent resize-none focus:ring-0 select-text"
                rows={1}
              />
              <div className="flex items-center gap-1 pb-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => {
                    console.log('Button clicked!')
                    handleSubmit()
                  }}
                  disabled={!input.trim()}
                  size="sm"
                  className="h-8"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-text-weaker text-center mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Error Banner */}
      {ripperdocError && (
        <div className="mx-4 mt-4 p-4 bg-error-weak border border-error-base/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-error-base shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-error-base mb-1">Ripperdoc CLI Required</p>
            <p className="text-sm text-text-weak mb-2">{ripperdocError}</p>
            <code className="text-xs bg-surface-sunken px-2 py-1 rounded">
              pip install git+https://github.com/quantmew/ripperdoc.git
            </code>
          </div>
        </div>
      )}

      {/* File Tabs */}
      {openFiles.length > 0 && (
        <div className="flex items-center border-b border-border-base bg-surface-raised">
          {openFiles.map((file) => (
            <button
              key={file}
              className={cn(
                'px-4 py-2 text-sm border-r border-border-weak',
                'hover:bg-surface-sunken transition-colors',
                activeFileId === file ? 'bg-surface-base text-text-base' : 'text-text-weak'
              )}
            >
              {file.split('/').pop()}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="max-w-3xl mx-auto py-4 px-4 space-y-4">
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border-base p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 bg-surface-raised rounded-lg border border-border-base p-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                console.log('onChange:', e.target.value)
                setInput(e.target.value)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              className="flex-1 min-h-[40px] max-h-[200px] border-0 bg-transparent resize-none focus:ring-0 select-text"
              rows={1}
              disabled={isStreaming}
            />
            <div className="flex items-center gap-1 pb-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Paperclip className="w-4 h-4" />
              </Button>
              {isStreaming ? (
                <Button variant="danger" size="sm" className="h-8">
                  <Square className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    console.log('Button clicked!')
                    handleSubmit()
                  }}
                  disabled={!input.trim()}
                  size="sm"
                  className="h-8"
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-text-weaker text-center mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
