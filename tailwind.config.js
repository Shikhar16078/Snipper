/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // All driven by CSS variables — auto-swap on theme change
        surface:  'rgb(var(--surface)  / <alpha-value>)',
        panel:    'rgb(var(--panel)    / <alpha-value>)',
        sidebar:  'rgb(var(--sidebar)  / <alpha-value>)',
        border:   'rgb(var(--border)   / <alpha-value>)',
        fg:       'rgb(var(--fg)       / <alpha-value>)',
        'fg-2':   'rgb(var(--fg-2)     / <alpha-value>)',
        muted:    'rgb(var(--muted)    / <alpha-value>)',
        accent:   'rgb(var(--accent)   / <alpha-value>)',
        'accent-h':'rgb(var(--accent-h)/ <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        'pop': {
          '0%':   { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
      },
      animation: {
        'pop':           'pop 0.15s ease-out forwards',
      },
    },
  },
  plugins: [],
}
