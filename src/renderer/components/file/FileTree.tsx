import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'
import { ScrollArea } from '@/renderer/components/ui'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

// Mock file tree - in production, this would come from the backend
const mockFileTree: FileNode[] = [
  {
    name: 'src',
    path: '/src',
    type: 'directory',
    children: [
      {
        name: 'main',
        path: '/src/main',
        type: 'directory',
        children: [
          { name: 'index.ts', path: '/src/main/index.ts', type: 'file' },
          { name: 'app.ts', path: '/src/main/app.ts', type: 'file' },
        ]
      },
      {
        name: 'renderer',
        path: '/src/renderer',
        type: 'directory',
        children: [
          { name: 'App.tsx', path: '/src/renderer/App.tsx', type: 'file' },
          { name: 'main.tsx', path: '/src/renderer/main.tsx', type: 'file' },
          {
            name: 'components',
            path: '/src/renderer/components',
            type: 'directory',
            children: [
              { name: 'ui', path: '/src/renderer/components/ui', type: 'directory' },
              { name: 'layout', path: '/src/renderer/components/layout', type: 'directory' },
            ]
          }
        ]
      }
    ]
  },
  { name: 'package.json', path: '/package.json', type: 'file' },
  { name: 'tsconfig.json', path: '/tsconfig.json', type: 'file' },
  { name: 'README.md', path: '/README.md', type: 'file' },
]

export function FileTree() {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['/src']))
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  const togglePath = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const handleFileClick = (path: string) => {
    setSelectedPath(path)
    // In production, this would open the file in the editor
    console.log('Open file:', path)
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {mockFileTree.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            depth={0}
            expandedPaths={expandedPaths}
            selectedPath={selectedPath}
            onToggle={togglePath}
            onSelect={handleFileClick}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

interface FileTreeNodeProps {
  node: FileNode
  depth: number
  expandedPaths: Set<string>
  selectedPath: string | null
  onToggle: (path: string) => void
  onSelect: (path: string) => void
}

function FileTreeNode({ node, depth, expandedPaths, selectedPath, onToggle, onSelect }: FileTreeNodeProps) {
  const isDirectory = node.type === 'directory'
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path

  const handleClick = () => {
    if (isDirectory) {
      onToggle(node.path)
    } else {
      onSelect(node.path)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center gap-1 px-1.5 py-1 rounded-md',
          'text-sm hover:bg-surface-raised transition-colors',
          isSelected && 'bg-primary-weak text-primary-base'
        )}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        {isDirectory ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 shrink-0 text-text-weak" />
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0 text-text-weak" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 shrink-0 text-primary-base" />
            ) : (
              <Folder className="w-4 h-4 shrink-0 text-primary-base" />
            )}
          </>
        ) : (
          <>
            <span className="w-4 shrink-0" />
            <File className="w-4 h-4 shrink-0 text-text-weak" />
          </>
        )}
        <span className="truncate text-left">{node.name}</span>
      </button>

      {isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
