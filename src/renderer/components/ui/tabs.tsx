import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/renderer/lib/utils'

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      data-component="tabs-list"
      className={cn(
        'inline-flex items-center gap-1 p-1',
        'bg-surface-sunken rounded-md',
        'text-text-weak',
        className
      )}
      {...props}
    />
  )
)
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      data-component="tabs-trigger"
      className={cn(
        'inline-flex items-center justify-center gap-2 px-3 py-1.5',
        'text-sm font-medium rounded-sm',
        'text-text-weak',
        'hover:text-text-base',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-surface-base data-[state=active]:text-text-base data-[state=active]:shadow-sm',
        'transition-colors',
        className
      )}
      {...props}
    />
  )
)
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Content
      ref={ref}
      data-component="tabs-content"
      className={cn(
        'mt-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-2',
        className
      )}
      {...props}
    />
  )
)
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
