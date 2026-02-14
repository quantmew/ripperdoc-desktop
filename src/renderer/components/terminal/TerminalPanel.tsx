import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

interface TerminalInstance {
  id: string
  terminal: Terminal
  fitAddon: FitAddon
}

export function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<TerminalInstance | null>(null)
  const [terminalId, setTerminalId] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create terminal instance
    const terminal = new Terminal({
      fontFamily: 'var(--font-family-mono)',
      fontSize: 13,
      lineHeight: 1.4,
      theme: {
        background: 'var(--terminal-background)',
        foreground: 'var(--terminal-text)',
        cursor: 'var(--terminal-cursor)',
        cursorAccent: 'var(--terminal-background)',
        selectionBackground: 'rgba(255, 255, 255, 0.2)',
        black: '#1e1e1e',
        red: '#f14c4c',
        green: '#23d18b',
        yellow: '#f5f543',
        blue: '#3b8eea',
        magenta: '#d670d6',
        cyan: '#29b8db',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)

    terminal.open(containerRef.current)
    fitAddon.fit()

    // Handle resize
    const handleResize = () => {
      fitAddon.fit()
      if (terminalId && window.electronAPI) {
        window.electronAPI.resizeTerminal(terminalId, terminal.cols, terminal.rows)
      }
    }

    window.addEventListener('resize', handleResize)
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.current)

    // Handle terminal input
    terminal.onData((data) => {
      if (terminalId && window.electronAPI) {
        window.electronAPI.writeTerminal(terminalId, data)
      }
    })

    // Create PTY session
    const initTerminal = async () => {
      if (window.electronAPI) {
        const id = await window.electronAPI.createTerminal(terminal.cols, terminal.rows)
        setTerminalId(id)
        terminalRef.current = { id, terminal, fitAddon }

        // Listen for terminal data
        window.electronAPI.onTerminalData((receivedId, data) => {
          if (receivedId === id) {
            terminal.write(data)
          }
        })

        window.electronAPI.onTerminalData((receivedId, code) => {
          if (receivedId === id) {
            console.log(`Terminal exited with code ${code}`)
          }
        })
      }
    }

    initTerminal()

    // Welcome message for demo
    terminal.writeln('\x1b[1;32mWelcome to Ripperdoc Terminal\x1b[0m')
    terminal.writeln('Type commands and press Enter to execute.\r\n')

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
      if (terminalId && window.electronAPI) {
        window.electronAPI.destroyTerminal(terminalId)
      }
      terminal.dispose()
    }
  }, [])

  return (
    <div className="h-full w-full bg-terminal-background p-1">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
