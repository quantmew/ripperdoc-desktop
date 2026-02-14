import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'
export type Language = 'en' | 'zh'

interface SettingsState {
  theme: Theme
  language: Language
  fontSize: number
  sidebarWidth: number
  secondaryPanelHeight: number
  showTerminal: boolean
  showSecondaryPanel: boolean

  // Actions
  setTheme: (theme: Theme) => void
  setLanguage: (language: Language) => void
  setFontSize: (size: number) => void
  setSidebarWidth: (width: number) => void
  setSecondaryPanelHeight: (height: number) => void
  toggleTerminal: () => void
  toggleSecondaryPanel: () => void
  initTheme: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      language: 'en',
      fontSize: 14,
      sidebarWidth: 260,
      secondaryPanelHeight: 200,
      showTerminal: true,
      showSecondaryPanel: true,

      setTheme: (theme) => {
        set({ theme })
        // Apply theme to DOM
        const root = document.documentElement
        root.classList.remove('light', 'dark')

        if (theme === 'system') {
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.classList.add(isDark ? 'dark' : 'light')
        } else {
          root.classList.add(theme)
        }

        // Persist to electron
        if (window.electronAPI) {
          window.electronAPI.setTheme(theme)
        }
      },

      setLanguage: (language) => set({ language }),

      setFontSize: (fontSize) => set({ fontSize }),

      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),

      setSecondaryPanelHeight: (secondaryPanelHeight) => set({ secondaryPanelHeight }),

      toggleTerminal: () => set((state) => ({ showTerminal: !state.showTerminal })),

      toggleSecondaryPanel: () => set((state) => ({ showSecondaryPanel: !state.showSecondaryPanel })),

      initTheme: () => {
        const { theme } = get()
        const root = document.documentElement
        root.classList.remove('light', 'dark')

        if (theme === 'system') {
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.classList.add(isDark ? 'dark' : 'light')

          // Listen for system theme changes
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (get().theme === 'system') {
              root.classList.remove('light', 'dark')
              root.classList.add(e.matches ? 'dark' : 'light')
            }
          })
        } else {
          root.classList.add(theme)
        }
      }
    }),
    {
      name: 'ripperdoc-settings'
    }
  )
)
