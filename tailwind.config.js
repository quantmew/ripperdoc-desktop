/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background
        'background-base': 'var(--background-base)',
        'background-weak': 'var(--background-weak)',
        'background-strong': 'var(--background-strong)',

        // Surface
        'surface-base': 'var(--surface-base)',
        'surface-base-hover': 'var(--surface-base-hover)',
        'surface-base-active': 'var(--surface-base-active)',
        'surface-raised': 'var(--surface-raised-base)',
        'surface-raised-base': 'var(--surface-raised-base)',
        'surface-raised-base-hover': 'var(--surface-raised-base-hover)',
        'surface-raised-base-active': 'var(--surface-raised-base-active)',
        'surface-raised-strong': 'var(--surface-raised-strong)',
        'surface-weak': 'var(--surface-weak)',
        'surface-strong': 'var(--surface-strong)',
        'surface-sunken': 'var(--surface-base-active)',

        // Background variations
        'background-stronger': 'var(--background-strong)',

        // Text
        'text-base': 'var(--text-base)',
        'text-weak': 'var(--text-weak)',
        'text-weaker': 'var(--text-weaker)',
        'text-strong': 'var(--text-strong)',
        'text-invert-base': 'var(--text-invert-base)',

        // Border
        'border-base': 'var(--border-base)',
        'border-weak': 'var(--border-weak-base)',
        'border-weak-base': 'var(--border-weak-base)',
        'border-strong-base': 'var(--border-strong-base)',
        'border-selected': 'var(--border-selected)',
        'border-weak-selected': 'var(--border-weak-selected)',

        // Icon
        'icon-base': 'var(--icon-base)',
        'icon-hover': 'var(--icon-hover)',
        'icon-active': 'var(--icon-active)',
        'icon-disabled': 'var(--icon-disabled)',
        'icon-invert-base': 'var(--icon-invert-base)',
        'icon-strong-base': 'var(--icon-strong-base)',
        'icon-strong-hover': 'var(--icon-strong-hover)',
        'icon-strong-active': 'var(--icon-strong-active)',

        // Button
        'button-primary-bg': 'var(--button-primary-base)',
        'button-primary-hover': 'var(--button-primary-hover)',
        'button-secondary-bg': 'var(--button-secondary-base)',
        'button-secondary-hover': 'var(--button-secondary-hover)',
        'button-ghost-hover': 'var(--button-ghost-hover)',

        // Interactive
        'interactive-base': 'var(--interactive-base)',
        'interactive-hover': 'var(--interactive-hover)',
        'interactive-active': 'var(--interactive-active)',
        'interactive-weak': 'var(--interactive-weak)',

        // Primary (aliases for interactive)
        'primary-base': 'var(--interactive-base)',
        'primary-weak': 'var(--interactive-weak)',

        // Semantic
        'success-base': 'var(--success-base)',
        'success-weak': 'var(--success-weak)',
        'warning-base': 'var(--warning-base)',
        'warning-weak': 'var(--warning-weak)',
        'error': 'var(--error-base)',
        'error-base': 'var(--error-base)',
        'error-weak': 'var(--error-weak)',
        'info-base': 'var(--info-base)',
        'info-weak': 'var(--info-weak)',

        // Sidebar
        'sidebar-background': 'var(--sidebar-background)',
        'sidebar-border': 'var(--sidebar-border)',
        'sidebar-item-hover': 'var(--sidebar-item-hover)',
        'sidebar-item-active': 'var(--sidebar-item-active)',

        // Input
        'input-background': 'var(--input-background)',
        'input-border': 'var(--input-border)',
        'input-border-hover': 'var(--input-border-hover)',
        'input-border-focus': 'var(--input-border-focus)',
        'input-placeholder': 'var(--input-placeholder)',

        // Titlebar
        'titlebar-background': 'var(--titlebar-background)',
        'titlebar-border': 'var(--titlebar-border)',

        // Terminal
        'terminal-background': 'var(--terminal-background)',
        'terminal-text': 'var(--terminal-text)',

        // Chat
        'chat-user-bg': 'var(--chat-user-bg)',
        'chat-assistant-bg': 'var(--chat-assistant-bg)',
        'chat-code-bg': 'var(--chat-code-bg)',

        // Code
        'code-background': 'var(--code-background)',
        'code-text': 'var(--code-text)',
      },
      fontFamily: {
        sans: ['var(--font-family-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-family-mono)', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': '11px',
        xs: '12px',
        sm: '13px',
        base: '14px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        'xs': '0 1px 2px -0.5px rgb(0 0 0 / 0.05), 0 0.5px 1.5px 0 rgb(0 0 0 / 0.05)',
        'xs-border': '0 0 0 1px var(--border-base), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '10px',
      },
      spacing: {
        '4.5': '18px',
        '15': '60px',
        '61': '244px',
      },
      width: {
        'sidebar': '244px',
        'sidebar-collapsed': '48px',
      },
      minWidth: {
        'sidebar': '48px',
      },
      maxWidth: {
        'sidebar': '30vw',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'fade-in': 'fadeIn 150ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      transitionDuration: {
        'fast': '100ms',
        'normal': '150ms',
        'slow': '200ms',
      },
    },
  },
  plugins: [],
}
