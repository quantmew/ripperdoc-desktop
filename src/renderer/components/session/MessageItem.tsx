import { User, Bot, Copy, Check } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'
import { Button } from '@/renderer/components/ui'
import type { Message } from '@/renderer/store/sessionSlice'
import { useState } from 'react'

interface MessageItemProps {
  message: Message
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = message.parts
      .filter((p) => p.type === 'text')
      .map((p) => p.content)
      .join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      data-component="message"
      data-role={message.role}
      className={cn(
        'flex gap-3 p-4 rounded-lg',
        isUser ? 'bg-chat-user-bg' : 'bg-chat-assistant-bg border border-border-weak'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary-base text-white' : 'bg-surface-sunken text-text-weak'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-weak">
            {isUser ? 'You' : 'Ripperdoc'}
          </span>
          <div className="flex items-center gap-1">
            {message.isStreaming && (
              <span className="text-xs text-text-weaker animate-pulse">Streaming...</span>
            )}
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
              {copied ? <Check className="w-3 h-3 text-success-base" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* Message Parts */}
        <div className="space-y-2">
          {message.parts.map((part, index) => (
            <MessagePart key={index} part={part} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MessagePart({ part }: { part: Message['parts'][0] }) {
  switch (part.type) {
    case 'text':
      return (
        <div className="text-sm text-text-base whitespace-pre-wrap break-words">
          {part.content}
        </div>
      )

    case 'code':
      return (
        <div className="code-block rounded-md overflow-hidden">
          <div className="code-block-header flex items-center justify-between px-3 py-2 bg-surface-raised border-b border-border-weak">
            <span className="text-xs text-text-weak font-mono">{part.language || 'code'}</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              Copy
            </Button>
          </div>
          <pre className="code-block-content p-4 overflow-x-auto bg-code-background">
            <code className={`language-${part.language || 'plaintext'}`}>{part.content}</code>
          </pre>
        </div>
      )

    case 'tool_use':
      return (
        <div className="bg-surface-sunken rounded-md p-3 border border-border-weak">
          <div className="flex items-center gap-2 text-sm font-medium text-text-base">
            <span className="text-primary-base">{part.toolName}</span>
          </div>
          {part.toolInput && (
            <pre className="mt-2 text-xs text-text-weak overflow-x-auto">
              {JSON.stringify(part.toolInput, null, 2)}
            </pre>
          )}
        </div>
      )

    case 'tool_result':
      return (
        <div className="bg-surface-sunken rounded-md p-3 border border-border-weak">
          <div className="text-sm font-medium text-text-base">Tool Result</div>
          <pre className="mt-2 text-xs text-text-weak overflow-x-auto">
            {typeof part.toolResult === 'string' ? part.toolResult : JSON.stringify(part.toolResult, null, 2)}
          </pre>
        </div>
      )

    default:
      return null
  }
}
