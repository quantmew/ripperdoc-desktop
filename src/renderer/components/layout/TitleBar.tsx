import { useState, useEffect } from 'react'
import { PanelLeft, ArrowLeft, ArrowRight, Menu } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'
import { Button } from '@/renderer/components/ui'
import { useLayoutStore } from '@/renderer/store'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [platform, setPlatform] = useState<string>('')
  const { sidebarOpened, toggleSidebar, toggleMobileSidebar } = useLayoutStore()

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

  const isMac = platform === 'darwin'
  const isWindows = platform === 'win32'

  return (
    <header
      className={cn(
        'h-10 shrink-0 bg-background-base relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center',
        'select-none'
      )}
    >
      {/* Left Section */}
      <div className={cn('flex items-center min-w-0', !isMac && 'pl-2')}>
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
      <div className="min-w-0 flex items-center justify-center pointer-events-none">
        <span className="text-xs font-medium text-text-weak pointer-events-auto">
          Ripperdoc
        </span>
      </div>

      {/* Right Section */}
      <div
        className={cn('flex items-center min-w-0 justify-end', !isWindows && 'pr-6')}
      >
        {/* Windows window controls */}
        {isWindows && (
          <div className="flex items-center no-drag">
            <button
              onClick={handleMinimize}
              className={cn(
                'w-10 h-8 flex items-center justify-center',
                'text-text-weak hover:text-text-base hover:bg-surface-raised',
                'transition-colors'
              )}
            >
              <span className="w-4 h-[1px] bg-current" />
            </button>
            <button
              onClick={handleMaximize}
              className={cn(
                'w-10 h-8 flex items-center justify-center',
                'text-text-weak hover:text-text-base hover:bg-surface-raised',
                'transition-colors'
              )}
            >
              <div className="w-3 h-3 border border-current" />
            </button>
            <button
              onClick={handleClose}
              className={cn(
                'w-10 h-8 flex items-center justify-center',
                'text-text-weak hover:text-white hover:bg-error-base',
                'transition-colors'
              )}
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
