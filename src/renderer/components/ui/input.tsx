import * as React from 'react'
import { cn } from '@/renderer/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, error, leftIcon, rightIcon, ...props }, ref) => {
  return (
    <div className="relative flex items-center">
      {leftIcon && <div className="absolute left-3 text-text-weak">{leftIcon}</div>}
      <input
        type={type}
        data-component="input"
        data-error={error}
        className={cn(
          'w-full px-3 py-2 text-sm',
          'bg-input-background border border-input-border rounded-md',
          'text-text-base placeholder:text-input-placeholder',
          'focus:outline-none focus:border-input-border-focus',
          'hover:border-input-border-hover',
          'transition-colors duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'pl-10': leftIcon,
            'pr-10': rightIcon,
            'border-error focus:border-error': error
          },
          className
        )}
        ref={ref}
        {...props}
      />
      {rightIcon && <div className="absolute right-3 text-text-weak">{rightIcon}</div>}
    </div>
  )
})

Input.displayName = 'Input'

export { Input }
