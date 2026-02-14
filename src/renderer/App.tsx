import { useEffect, useState } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { useSettingsStore } from './store/settingsSlice'
import { TooltipProvider } from './components/ui'
import './i18n'

export function App() {
  const [isReady, setIsReady] = useState(false)
  const { theme, initTheme } = useSettingsStore()

  useEffect(() => {
    // Initialize theme
    initTheme()

    // Setup menu listeners
    if (window.electronAPI) {
      window.electronAPI.onMenuNewSession(() => {
        // Handle new session
        console.log('New session requested')
      })

      window.electronAPI.onMenuOpenDirectory((path) => {
        // Handle open directory
        console.log('Open directory:', path)
      })

      window.electronAPI.onMenuToggleSidebar(() => {
        // Handle toggle sidebar
        console.log('Toggle sidebar')
      })

      window.electronAPI.onMenuToggleTerminal(() => {
        // Handle toggle terminal
        console.log('Toggle terminal')
      })

      window.electronAPI.onMenuCommandPalette(() => {
        // Handle command palette
        console.log('Command palette')
      })
    }

    setIsReady(true)
  }, [initTheme])

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.add(isDark ? 'dark' : 'light')
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  if (!isReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background-base">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-base border-t-transparent" />
          <span className="text-sm text-text-weak">Loading Ripperdoc...</span>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <AppLayout />
    </TooltipProvider>
  )
}
