# Ripperdoc Desktop

A modern AI coding assistant desktop application built with Electron, React, and TypeScript.

## Features

- 🤖 AI-powered coding assistance
- 📁 Project and workspace management
- 💬 Chat-based interface with streaming responses
- 🖥️ Integrated terminal
- 📝 File browser and editor
- 🌙 Dark/Light theme support
- 🌐 Internationalization (English, Chinese)
- ⌨️ Keyboard shortcuts

## Tech Stack

- **Framework**: Electron 32
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **UI Components**: Radix UI
- **Build Tool**: Vite + electron-vite
- **Code Editor**: Monaco Editor
- **Terminal**: xterm.js + node-pty

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Package for current platform
npm run package

# Package for specific platform
npm run package:win
npm run package:mac
npm run package:linux
```

### Project Structure

```
ripperdoc-desktop/
├── src/
│   ├── main/           # Electron main process
│   │   ├── core/       # Core app logic
│   │   ├── server/     # Ripperdoc server management
│   │   └── pty/        # Terminal process management
│   ├── preload/        # Preload scripts
│   └── renderer/       # React renderer process
│       ├── components/ # UI components
│       │   ├── ui/     # Base UI components
│       │   ├── layout/ # Layout components
│       │   ├── session/# Chat session components
│       │   ├── file/   # File browser components
│       │   └── terminal/# Terminal components
│       ├── store/      # Zustand stores
│       ├── i18n/       # Internationalization
│       └── styles/     # CSS and themes
├── configs/            # Build configurations
├── resources/          # App icons and assets
└── scripts/            # Build scripts
```

## License

MIT
