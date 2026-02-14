import { Terminal, Files, Search, GitBranch, X } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/renderer/components/ui'
import { TerminalPanel } from '@/renderer/components/terminal/TerminalPanel'
import { FileTree } from '@/renderer/components/file/FileTree'
import { useLayoutStore, useSettingsStore } from '@/renderer/store'

export function SecondaryPanel() {
  const { activeSecondaryPanel, setActiveSecondaryPanel } = useLayoutStore()
  const { toggleSecondaryPanel } = useSettingsStore()

  return (
    <div className="h-full flex flex-col bg-surface-base border-t border-border-base">
      <Tabs value={activeSecondaryPanel} onValueChange={(v) => setActiveSecondaryPanel(v as typeof activeSecondaryPanel)} className="h-full flex flex-col">
        {/* Tab Header */}
        <div className="flex items-center justify-between border-b border-border-base">
          <TabsList className="bg-transparent p-0 h-auto">
            <TabsTrigger value="files" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary-base rounded-none px-3 py-2">
              <Files className="w-4 h-4 mr-1.5" />
              Files
            </TabsTrigger>
            <TabsTrigger value="terminal" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary-base rounded-none px-3 py-2">
              <Terminal className="w-4 h-4 mr-1.5" />
              Terminal
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary-base rounded-none px-3 py-2">
              <Search className="w-4 h-4 mr-1.5" />
              Search
            </TabsTrigger>
            <TabsTrigger value="git" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary-base rounded-none px-3 py-2">
              <GitBranch className="w-4 h-4 mr-1.5" />
              Git
            </TabsTrigger>
          </TabsList>
          <button
            onClick={toggleSecondaryPanel}
            className="p-1.5 hover:bg-surface-raised rounded transition-colors mr-1"
          >
            <X className="w-4 h-4 text-text-weak" />
          </button>
        </div>

        {/* Tab Content */}
        <TabsContent value="files" className="flex-1 overflow-hidden m-0">
          <FileTree />
        </TabsContent>
        <TabsContent value="terminal" className="flex-1 overflow-hidden m-0">
          <TerminalPanel />
        </TabsContent>
        <TabsContent value="search" className="flex-1 overflow-hidden m-0 p-4">
          <div className="text-center text-text-weak text-sm py-8">
            Search functionality coming soon
          </div>
        </TabsContent>
        <TabsContent value="git" className="flex-1 overflow-hidden m-0 p-4">
          <div className="text-center text-text-weak text-sm py-8">
            Git integration coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
