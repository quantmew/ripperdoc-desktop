import * as React from 'react'
import { cn } from '@/renderer/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, error, ...props }, ref) => {
  return (
    <textarea
      data-component="textarea"
      data-error={error}
      className={cn(
        'w-full px-3 py-2 text-sm',
        'bg-input-background border border-input-border rounded-md',
        'text-text-base placeholder:text-input-placeholder',
        'focus:outline-none focus:border-input-border-focus',
        'hover:border-input-border-hover',
        'transition-colors duration-150',
        'resize-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'border-error-base focus:border-error-base': error
        },
        className
      )}
      ref={ref}
      {...props}
    />
  )
})

Textarea.displayName = 'Textarea'

export { Textarea }
