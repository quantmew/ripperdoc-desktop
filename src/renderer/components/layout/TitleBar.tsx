import { useState, useEffect } from 'react'
import { PanelLeft, ArrowLeft, ArrowRight, Menu, Minus, Square, X } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'
import { Button } from '@/renderer/components/ui'
import { useLayoutStore } from '@/renderer/store'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [platform, setPlatform] = useState<string>('')
  const { toggleSidebar, toggleMobileSidebar } = useLayoutStore()

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getPlatform().then(setPlatform)
    }
  }, [])

  const handleMinimize = () => {
    window.electronAPI?.minimize()
  }

  const handleMaximize = () => {
    window.electronAPI?.maximize()
    setIsMaximized(!isMaximized)
  }

  const handleClose = () => {
    window.electronAPI?.close()
  }

  const handleDoubleClick = () => {
    handleMaximize()
  }

  const isMac = platform === 'darwin'
  const isWindows = platform === 'win32'

  return (
    <header
      className={cn(
        'h-10 shrink-0 bg-background-base relative flex items-center',
        'select-none'
      )}
      onDoubleClick={handleDoubleClick}
    >
      {/* Left Section */}
      <div className={cn('flex items-center min-w-0 flex-1', !isMac && 'pl-2')}>
        {/* macOS traffic light spacing */}
        {isMac && <div className="h-full shrink-0 w-[72px]" />}

        {/* Mobile menu button */}
        <div className="xl:hidden w-10 shrink-0 flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-md"
            onClick={toggleMobileSidebar}
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* Desktop sidebar toggle & navigation */}
        <div className="hidden xl:flex items-center gap-1 shrink-0 ml-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={toggleSidebar}
          >
            <PanelLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Center Section - App Title */}
      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
        <span className="text-xs font-medium text-text-weak pointer-events-auto">
          Ripperdoc
        </span>
      </div>

      {/* Right Section - Window Controls */}
      <div className="flex items-center justify-end flex-1">
        {isWindows && (
          <div className="flex items-center">
            <button
              onClick={handleMinimize}
              className={cn(
                'w-11 h-10 flex items-center justify-center',
                'text-text-weak hover:text-text-base hover:bg-surface-base-hover',
                'transition-colors'
              )}
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={handleMaximize}
              className={cn(
                'w-11 h-10 flex items-center justify-center',
                'text-text-weak hover:text-text-base hover:bg-surface-base-hover',
                'transition-colors'
              )}
            >
              {isMaximized ? (
                <div className="w-3 h-3 border-[1.5px] border-current" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={handleClose}
              className={cn(
                'w-11 h-10 flex items-center justify-center',
                'text-text-weak hover:bg-error-base hover:text-white',
                'transition-colors'
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {!isWindows && !isMac && (
          <div className="pr-4">
            <span className="text-xs text-text-weak">Ripperdoc</span>
          </div>
        )}
      </div>
    </header>
  )
}
