import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, Workspace, Session } from './layoutSlice'

interface ProjectState {
  projects: Project[]
  workspaces: Workspace[]
  sessions: Session[]

  // Actions
  addProject: (project: Project) => void
  removeProject: (id: string) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  reorderProjects: (startIndex: number, endIndex: number) => void

  addWorkspace: (workspace: Workspace) => void
  removeWorkspace: (id: string) => void

  addSession: (session: Session) => void
  removeSession: (id: string) => void
  updateSession: (id: string, updates: Partial<Session>) => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      workspaces: [],
      sessions: [],

      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, project]
        })),

      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          workspaces: state.workspaces.filter((w) => w.projectId !== id),
          sessions: state.sessions.filter((s) => s.projectId !== id)
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p))
        })),

      reorderProjects: (startIndex, endIndex) =>
        set((state) => {
          const result = Array.from(state.projects)
          const [removed] = result.splice(startIndex, 1)
          result.splice(endIndex, 0, removed)
          return { projects: result }
        }),

      addWorkspace: (workspace) =>
        set((state) => ({
          workspaces: [...state.workspaces, workspace]
        })),

      removeWorkspace: (id) =>
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== id)
        })),

      addSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, session]
        })),

      removeSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id)
        })),

      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...updates } : s))
        }))
    }),
    {
      name: 'ripperdoc-projects'
    }
  )
)
