import { defineConfig } from 'electron-builder'

export default defineConfig({
  appId: 'com.ripperdoc.desktop',
  productName: 'Ripperdoc',
  copyright: 'Copyright © 2024 Ripperdoc Team',
  directories: {
    output: 'dist',
    buildResources: 'resources'
  },
  files: [
    'out/**/*',
    '!node_modules/**/*'
  ],
  asar: true,
  asarUnpack: [
    '**/node_modules/node-pty/**/*',
    '**/node_modules/@electron/**/*'
  ],
  win: {
    target: ['nsis', 'portable'],
    icon: 'resources/icon.ico'
  },
  mac: {
    target: ['dmg', 'zip'],
    icon: 'resources/icon.icns',
    category: 'public.app-category.developer-tools',
    hardenedRuntime: true,
    gatekeeperAssess: false
  },
  linux: {
    target: ['AppImage', 'deb'],
    icon: 'resources/icons',
    category: 'Development'
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true
  },
  publish: {
    provider: 'github',
    owner: 'quantmew',
    repo: 'ripperdoc-desktop'
  }
})
