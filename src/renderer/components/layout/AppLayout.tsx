import { useState, useRef, useEffect } from 'react'
import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { MainContent } from './MainContent'
import { FileTree } from '../file/FileTree'
import { useLayoutStore } from '@/renderer/store'
import { cn } from '@/renderer/lib/utils'
import { ChevronRight, Files } from 'lucide-react'

const RIGHT_PANEL_MIN_WIDTH = 200
const RIGHT_PANEL_DEFAULT_WIDTH = 280

export function AppLayout() {
  const { sidebarOpened } = useLayoutStore()
  const [rightPanelOpened, setRightPanelOpened] = useState(true)
  const [rightPanelWidth, setRightPanelWidth] = useState(RIGHT_PANEL_DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  // Resize handler for right panel - improved version
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startXRef.current - e.clientX // Note: reversed for right panel
      const newWidth = startWidthRef.current + deltaX

      if (newWidth >= RIGHT_PANEL_MIN_WIDTH && newWidth <= window.innerWidth * 0.4) {
        setRightPanelWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    startXRef.current = e.clientX
    startWidthRef.current = rightPanelWidth
    setIsResizing(true)
  }

  return (
    <div className="h-screen w-screen bg-background-base flex flex-col select-none [&_input]:select-text [&_textarea]:select-text overflow-hidden">
      {/* Title Bar */}
      <TitleBar />

      {/* Main Layout */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main
          className={cn(
            'flex-1 min-w-0 overflow-hidden flex flex-col',
            'border-t border-border-weak',
            sidebarOpened ? '' : 'xl:border-l xl:rounded-tl-sm'
          )}
        >
          <MainContent />
        </main>

        {/* Right Panel - File Tree */}
        <aside
          className={cn(
            'hidden xl:flex flex-col border-t border-border-weak border-l border-border-weak',
            'bg-background-base relative',
            !rightPanelOpened && 'w-12'
          )}
          style={{ width: rightPanelOpened ? `${rightPanelWidth}px` : undefined }}
        >
          {/* Header */}
          <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-border-weak">
            {rightPanelOpened && (
              <span className="text-xs font-medium text-text-weak uppercase tracking-wider">Files</span>
            )}
            <button
              onClick={() => setRightPanelOpened(!rightPanelOpened)}
              className={cn(
                'w-6 h-6 flex items-center justify-center rounded-md',
                'text-text-weak hover:bg-surface-base-hover hover:text-text-base',
                'transition-colors'
              )}
            >
              {rightPanelOpened ? <ChevronRight className="w-4 h-4" /> : <Files className="w-4 h-4" />}
            </button>
          </div>

          {/* Content */}
          {rightPanelOpened && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <FileTree />
            </div>
          )}

          {/* Resize Handle */}
          {rightPanelOpened && (
            <div
              className={cn(
                'absolute top-0 left-0 bottom-0 w-1 cursor-col-resize',
                'hover:bg-interactive-base/30',
                'transition-colors z-10',
                isResizing && 'bg-interactive-base/40'
              )}
              style={{ marginLeft: '-2px', paddingLeft: '4px' }}
              onMouseDown={handleResizeStart}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
