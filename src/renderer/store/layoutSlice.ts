import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Project {
  id: string
  name: string
  path: string
  isGitRepo: boolean
  branches?: string[]
  currentBranch?: string
  lastOpened: number
}

export interface Workspace {
  id: string
  projectId: string
  name: string
  branch?: string
}

export interface Session {
  id: string
  projectId: string
  workspaceId?: string
  title: string
  createdAt: number
  updatedAt: number
}

interface LayoutState {
  // Navigation
  activeProjectId: string | null
  activeWorkspaceId: string | null
  activeSessionId: string | null

  // Sidebar - matching opencode structure
  sidebarOpened: boolean
  sidebarWidth: number
  sidebarHovering: boolean
  mobileSidebarOpened: boolean

  // Panels
  activeSecondaryPanel: 'files' | 'search' | 'git' | 'terminal'

  // Tabs
  openFiles: string[]
  activeFileId: string | null

  // Actions
  setActiveProject: (id: string | null) => void
  setActiveWorkspace: (id: string | null) => void
  setActiveSession: (id: string | null) => void
  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void
  setSidebarWidth: (width: number) => void
  setSidebarHovering: (hovering: boolean) => void
  toggleMobileSidebar: () => void
  setActiveSecondaryPanel: (panel: LayoutState['activeSecondaryPanel']) => void
  openFile: (path: string) => void
  closeFile: (path: string) => void
  setActiveFile: (path: string | null) => void
}

const DEFAULT_SIDEBAR_WIDTH = 280

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      activeWorkspaceId: null,
      activeSessionId: null,
      sidebarOpened: true,
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
      sidebarHovering: false,
      mobileSidebarOpened: false,
      activeSecondaryPanel: 'terminal',
      openFiles: [],
      activeFileId: null,

      setActiveProject: (id) => set({ activeProjectId: id, activeWorkspaceId: null, activeSessionId: null }),

      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

      setActiveSession: (id) => set({ activeSessionId: id }),

      toggleSidebar: () => set((state) => ({ sidebarOpened: !state.sidebarOpened })),

      openSidebar: () => set({ sidebarOpened: true }),

      closeSidebar: () => set({ sidebarOpened: false }),

      setSidebarWidth: (width) => set({ sidebarWidth: width }),

      setSidebarHovering: (sidebarHovering) => set({ sidebarHovering }),

      toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpened: !state.mobileSidebarOpened })),

      setActiveSecondaryPanel: (activeSecondaryPanel) => set({ activeSecondaryPanel }),

      openFile: (path) =>
        set((state) => ({
          openFiles: state.openFiles.includes(path) ? state.openFiles : [...state.openFiles, path],
          activeFileId: path
        })),

      closeFile: (path) =>
        set((state) => {
          const newOpenFiles = state.openFiles.filter((f) => f !== path)
          return {
            openFiles: newOpenFiles,
            activeFileId: state.activeFileId === path ? newOpenFiles[0] || null : state.activeFileId
          }
        }),

      setActiveFile: (path) => set({ activeFileId: path })
    }),
    {
      name: 'ripperdoc-layout',
      partialize: (state) => ({
        sidebarOpened: state.sidebarOpened,
        sidebarWidth: state.sidebarWidth,
        activeSecondaryPanel: state.activeSecondaryPanel
      })
    }
  )
)
