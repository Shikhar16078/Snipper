import { useState, useRef, useEffect } from 'react'
import type { Theme } from '../../types'
import { useApp } from '../../store/AppContext'

interface ThemeOption {
  id: Theme
  label: string
  accent: string  // used only to color the trigger icon
}

const DEFAULT_THEME: ThemeOption = { id: 'stone', label: 'Stone', accent: '#D4AF37' }

const LIGHT_THEMES: ThemeOption[] = [
  { id: 'light',        label: 'Ivory',  accent: '#4F46E5' },
  { id: 'light-pink',   label: 'Blush',  accent: '#EC4899' },
  { id: 'light-sage',   label: 'Sage',   accent: '#0D9488' },
  { id: 'light-dusk',   label: 'Dusk',   accent: '#D97706' },
  { id: 'light-arctic', label: 'Arctic', accent: '#0EA5E9' },
]

const DARK_THEMES: ThemeOption[] = [
  { id: 'dark',          label: 'Obsidian', accent: '#0ABF53' },
  { id: 'dark-maroon',   label: 'Merlot',   accent: '#DC2626' },
  { id: 'dark-midnight', label: 'Midnight', accent: '#60A5FA' },
  { id: 'dark-ember',    label: 'Ember',    accent: '#F97316' },
  { id: 'dark-nebula',   label: 'Nebula',   accent: '#A78BFA' },
]

const ALL_THEMES = [DEFAULT_THEME, ...LIGHT_THEMES, ...DARK_THEMES]

const DARK_IDS: Theme[] = ['stone', 'dark', 'dark-maroon', 'dark-midnight', 'dark-ember', 'dark-nebula']

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" strokeWidth={2} />
      <path strokeLinecap="round" strokeWidth={2} d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

function ActiveIcon() {
  return (
    <svg className="w-3.5 h-3.5 ml-auto flex-shrink-0 text-accent" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function ThemeRow({ t, active, onSelect }: { t: ThemeOption; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors ${
        active ? 'text-accent bg-accent/8 font-medium' : 'text-fg-2 hover:text-fg hover:bg-fg/5'
      }`}
    >
      {t.label}
      {active && <ActiveIcon />}
    </button>
  )
}

export function ThemePicker() {
  const { state, dispatch } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function select(theme: Theme) {
    dispatch({ type: 'SET_THEME', payload: { theme } })
    setOpen(false)
  }

  const isDark = DARK_IDS.includes(state.theme)
  const iconColor = ALL_THEMES.find((t) => t.id === state.theme)?.accent ?? '#4F46E5'

  return (
    <div ref={ref} className="relative">
      {/* Trigger — icon colored with current theme's accent */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Change theme"
        style={{ color: iconColor }}
        className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-fg/8 transition-colors"
      >
        {isDark ? <MoonIcon /> : <SunIcon />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-40 bg-panel border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-pop">
          {/* Default */}
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted select-none">Default</p>
          </div>
          <ThemeRow t={DEFAULT_THEME} active={state.theme === DEFAULT_THEME.id} onSelect={() => select(DEFAULT_THEME.id)} />

          <div className="mx-3 my-1.5 border-t border-border" />

          {/* Light */}
          <div className="px-3 pb-1">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted select-none">Light</p>
          </div>
          {LIGHT_THEMES.map((t) => (
            <ThemeRow key={t.id} t={t} active={state.theme === t.id} onSelect={() => select(t.id)} />
          ))}

          <div className="mx-3 my-1.5 border-t border-border" />

          {/* Dark */}
          <div className="px-3 pb-1">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted select-none">Dark</p>
          </div>
          {DARK_THEMES.map((t) => (
            <ThemeRow key={t.id} t={t} active={state.theme === t.id} onSelect={() => select(t.id)} />
          ))}
          <div className="pb-1.5" />
        </div>
      )}
    </div>
  )
}
