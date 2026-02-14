import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, Mic, Square } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'
import { Button, Textarea, ScrollArea } from '@/renderer/components/ui'
import { useLayoutStore, useSessionStore } from '@/renderer/store'
import { MessageItem } from '@/renderer/components/session/MessageItem'
import type { Message, MessagePart } from '@/renderer/store/sessionSlice'

export function MainContent() {
  const { activeSessionId, openFiles, activeFileId } = useLayoutStore()
  const { sessions, addMessage, updateMessage, setLoading } = useSessionStore()
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const session = activeSessionId ? sessions.get(activeSessionId) : null
  const messages = session?.messages || []

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isStreaming) return

    const sessionId = activeSessionId || 'default'
    const messageId = `msg-${Date.now()}`

    // Create user message
    const userMessage: Message = {
      id: messageId,
      role: 'user',
      parts: [{ type: 'text', content: input.trim() }],
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

    // Simulate streaming response (replace with actual WebSocket/SDK call)
    setTimeout(() => {
      updateMessage(sessionId, assistantMessageId, {
        parts: [{ type: 'text', content: 'Hello! I am Ripperdoc, your AI coding assistant. How can I help you today?' }],
        isStreaming: false
      })
      setLoading(sessionId, false)
      setIsStreaming(false)
    }, 1000)
  }, [input, isStreaming, activeSessionId, addMessage, updateMessage, setLoading])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Welcome state
  if (!activeSessionId || messages.length === 0) {
    return (
      <div className="h-full flex flex-col">
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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a message..."
                className="flex-1 min-h-[40px] max-h-[200px] border-0 bg-transparent resize-none focus:ring-0"
                rows={1}
              />
              <div className="flex items-center gap-1 pb-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button onClick={handleSubmit} disabled={!input.trim()} size="sm" className="h-8">
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
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              className="flex-1 min-h-[40px] max-h-[200px] border-0 bg-transparent resize-none focus:ring-0"
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
                <Button onClick={handleSubmit} disabled={!input.trim()} size="sm" className="h-8">
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
