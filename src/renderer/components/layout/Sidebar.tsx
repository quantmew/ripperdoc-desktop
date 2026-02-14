import { useState, useCallback, useRef, useEffect } from 'react'
import {
  FolderOpen,
  Plus,
  MessageSquare,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/renderer/lib/utils'
import { useLayoutStore, useProjectStore } from '@/renderer/store'
import { Button, ScrollArea, Tooltip } from '@/renderer/components/ui'

const SIDEBAR_ICON_WIDTH = 64 // w-16
const SIDEBAR_MIN_WIDTH = 244
const SIDEBAR_MAX_WIDTH_RATIO = 0.3

export function Sidebar() {
  const {
    sidebarOpened,
    sidebarWidth,
    setSidebarWidth,
    activeProjectId,
    activeSessionId,
    setActiveProject,
    setActiveSession,
    mobileSidebarOpened
  } = useLayoutStore()
  const { projects, sessions } = useProjectStore()
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [isResizing, setIsResizing] = useState(false)
  const [hoverProject, setHoverProject] = useState<string | null>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  const currentProject = projects.find((p) => p.id === activeProjectId)

  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }, [])

  const handleAddProject = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectDirectory()
      if (path) {
        console.log('Selected directory:', path)
      }
    }
  }

  const handleNewSession = () => {
    console.log('Create new session')
  }

  // Resize handler
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return
      const rect = sidebarRef.current.getBoundingClientRect()
      const newWidth = e.clientX - rect.left
      const maxWidth = window.innerWidth * SIDEBAR_MAX_WIDTH_RATIO + SIDEBAR_ICON_WIDTH
      if (newWidth >= SIDEBAR_MIN_WIDTH && newWidth <= maxWidth) {
        setSidebarWidth(newWidth - SIDEBAR_ICON_WIDTH)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, setSidebarWidth])

  // Desktop sidebar
  return (
    <>
      {/* Desktop Sidebar */}
      <nav
        ref={sidebarRef}
        data-component="sidebar-nav-desktop"
        className={cn(
          'hidden xl:block relative shrink-0',
          'transition-[width] duration-0'
        )}
        style={{
          width: sidebarOpened ? `${Math.max(sidebarWidth, SIDEBAR_MIN_WIDTH)}px` : `${SIDEBAR_ICON_WIDTH}px`
        }}
      >
        <div className="flex h-full w-full overflow-hidden">
          {/* Icon Strip - Always visible */}
          <div className="w-16 shrink-0 bg-background-base flex flex-col items-center overflow-hidden">
            {/* Project Icons */}
            <div className="flex-1 min-h-0 w-full">
              <div className="h-full w-full flex flex-col items-center gap-3 px-3 py-2 overflow-y-auto scrollbar-hide">
                {projects.map((project) => (
                  <Tooltip key={project.id} content={project.name} placement="right">
                    <button
                      onClick={() => setActiveProject(project.id)}
                      onMouseEnter={() => !sidebarOpened && setHoverProject(project.id)}
                      className={cn(
                        'w-10 h-10 rounded-md flex items-center justify-center',
                        'transition-colors',
                        activeProjectId === project.id
                          ? 'bg-surface-base-active text-text-strong'
                          : 'text-text-weak hover:bg-surface-base-hover hover:text-text-base'
                      )}
                    >
                      <FolderOpen className="w-5 h-5" />
                    </button>
                  </Tooltip>
                ))}

                {/* Add Project Button */}
                <Tooltip content="Add Project" placement="right">
                  <button
                    onClick={handleAddProject}
                    className={cn(
                      'w-10 h-10 rounded-md flex items-center justify-center',
                      'text-text-weak hover:bg-surface-base-hover hover:text-text-base',
                      'transition-colors'
                    )}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Bottom Icons */}
            <div className="shrink-0 w-full pt-3 pb-3 flex flex-col items-center gap-2">
              <Tooltip content="Settings" placement="right">
                <button
                  className={cn(
                    'w-10 h-10 rounded-md flex items-center justify-center',
                    'text-text-weak hover:bg-surface-base-hover hover:text-text-base',
                    'transition-colors'
                  )}
                >
                  <Settings className="w-5 h-5" />
                </button>
              </Tooltip>
              <Tooltip content="Help" placement="right">
                <button
                  className={cn(
                    'w-10 h-10 rounded-md flex items-center justify-center',
                    'text-text-weak hover:bg-surface-base-hover hover:text-text-base',
                    'transition-colors'
                  )}
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Expanded Panel */}
          {sidebarOpened && (
            <div
              className="flex-1 min-w-0 flex flex-col bg-background-stronger border border-b-0 border-border-weak rounded-tl-sm"
              style={{ width: `${Math.max(sidebarWidth - SIDEBAR_ICON_WIDTH, 0)}px` }}
            >
              {/* Project Header */}
              {currentProject && (
                <div className="shrink-0 px-2 py-1">
                  <div className="flex items-start justify-between gap-2 p-2 pr-1">
                    <div className="flex flex-col min-w-0">
                      <span className="text-base font-medium text-text-strong truncate">
                        {currentProject.name}
                      </span>
                      <span className="text-xs text-text-base truncate">
                        {currentProject.path}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* New Session Button */}
              <div className="shrink-0 py-4 px-3">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleNewSession}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Session
                </Button>
              </div>

              {/* Sessions List */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="px-2 py-1 space-y-0.5">
                  {sessions
                    .filter((s) => s.projectId === activeProjectId)
                    .map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setActiveSession(session.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded-md',
                          'text-sm text-text-weak hover:text-text-base hover:bg-sidebar-item-hover',
                          'transition-colors',
                          activeSessionId === session.id && 'bg-sidebar-item-active text-text-base'
                        )}
                      >
                        <MessageSquare className="w-4 h-4 shrink-0" />
                        <span className="flex-1 truncate text-left">{session.title}</span>
                      </button>
                    ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Resize Handle */}
          {sidebarOpened && (
            <div
              className={cn(
                'absolute top-0 right-0 bottom-0 w-1 cursor-col-resize',
                'hover:bg-interactive-base/20 active:bg-interactive-base/40',
                'transition-colors z-10',
                isResizing && 'bg-interactive-base/40'
              )}
              onMouseDown={() => setIsResizing(true)}
            />
          )}
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpened && (
        <div
          className="xl:hidden fixed inset-0 top-10 z-40 bg-black/50"
          onClick={() => useLayoutStore.getState().toggleMobileSidebar()}
        />
      )}

      {/* Mobile Sidebar */}
      <nav
        data-component="sidebar-nav-mobile"
        className={cn(
          'xl:hidden fixed top-10 bottom-0 left-0 z-50 w-72 bg-background-base',
          'transition-transform duration-200 ease-out',
          mobileSidebarOpened ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile content similar to desktop */}
        <div className="h-full w-full flex flex-col">
          {/* Project List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  setActiveProject(project.id)
                  useLayoutStore.getState().toggleMobileSidebar()
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md',
                  'text-sm text-text-base hover:bg-sidebar-item-hover',
                  'transition-colors',
                  activeProjectId === project.id && 'bg-sidebar-item-active'
                )}
              >
                <FolderOpen className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate text-left">{project.name}</span>
              </button>
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="shrink-0 p-2 border-t border-border-weak">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </div>
      </nav>
    </>
  )
}
