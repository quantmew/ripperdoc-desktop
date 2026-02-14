import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/renderer/lib/utils'
import { Loader2, type LucideIcon } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  asChild?: boolean
  loading?: boolean
  icon?: LucideIcon
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', asChild = false, loading, disabled, icon: Icon, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-1.5 font-medium rounded-md',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'transition-all duration-150 ease-out',
          'disabled:opacity-50 disabled:cursor-not-allowed',

          // Variant styles
          {
            'bg-button-primary-bg text-icon-invert-base hover:bg-icon-strong-hover active:bg-icon-strong-active':
              variant === 'primary',
            'bg-button-secondary-bg text-text-strong shadow-xs-border hover:bg-button-secondary-hover active:scale-[0.99]':
              variant === 'secondary',
            'bg-transparent text-text-strong hover:bg-button-ghost-hover active:bg-surface-raised-base-active':
              variant === 'ghost',
            'bg-error-base text-white hover:bg-error-base/90 active:bg-error-base/80':
              variant === 'danger',
          },

          // Size styles
          {
            'h-[22px] px-2 text-[13px]': size === 'sm',
            'h-6 px-1.5 text-[13px]': size === 'md',
            'h-8 px-3 text-[14px]': size === 'lg',
          },

          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {Icon && <Icon className="w-4 h-4" />}
            {children}
          </>
        )}
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { Button }
