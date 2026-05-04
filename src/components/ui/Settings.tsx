import { useState, useRef, useEffect } from 'react'
import type { Theme } from '../../types'
import { useApp } from '../../store/AppContext'

interface ThemeOption {
  id: Theme
  label: string
  accent: string
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
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${
        active ? 'text-accent bg-accent/8 font-medium' : 'text-fg-2 hover:text-fg hover:bg-fg/5'
      }`}
    >
      {t.label}
      {active && <ActiveIcon />}
    </button>
  )
}

export function Settings() {
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

  function selectTheme(theme: Theme) {
    dispatch({ type: 'SET_THEME', payload: { theme } })
  }

  const isDark = DARK_IDS.includes(state.theme)
  const iconColor = ALL_THEMES.find((t) => t.id === state.theme)?.accent ?? '#4F46E5'

  return (
    <div ref={ref} className="relative">
      {/* Gear trigger — fills navbar height */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Settings"
        style={{ color: open ? undefined : iconColor }}
        className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
          open ? 'text-fg bg-fg/8' : 'hover:bg-fg/8'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-panel border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-pop">
          {/* Theme section */}
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted select-none flex items-center gap-1.5">
              <span style={{ color: iconColor }}>{isDark ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" strokeWidth={2} />
                  <path strokeLinecap="round" strokeWidth={2} d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              )}</span>
              Theme
            </p>
          </div>

          {/* Default */}
          <div className="px-3 pt-0.5 pb-0.5">
            <p className="text-[9px] font-semibold tracking-widest uppercase text-muted/60 select-none">Default</p>
          </div>
          <ThemeRow t={DEFAULT_THEME} active={state.theme === DEFAULT_THEME.id} onSelect={() => selectTheme(DEFAULT_THEME.id)} />

          <div className="mx-3 my-1 border-t border-border" />

          {/* Light */}
          <div className="px-3 pb-0.5">
            <p className="text-[9px] font-semibold tracking-widest uppercase text-muted/60 select-none">Light</p>
          </div>
          {LIGHT_THEMES.map((t) => (
            <ThemeRow key={t.id} t={t} active={state.theme === t.id} onSelect={() => selectTheme(t.id)} />
          ))}

          <div className="mx-3 my-1 border-t border-border" />

          {/* Dark */}
          <div className="px-3 pb-0.5">
            <p className="text-[9px] font-semibold tracking-widest uppercase text-muted/60 select-none">Dark</p>
          </div>
          {DARK_THEMES.map((t) => (
            <ThemeRow key={t.id} t={t} active={state.theme === t.id} onSelect={() => selectTheme(t.id)} />
          ))}

          <div className="mx-3 my-2 border-t border-border" />

          {/* Tips toggle */}
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-xs text-fg-2 font-medium">Tips</p>
              <p className="text-[10px] text-muted mt-0.5">{state.tipsEnabled ? 'Showing tips' : 'Tips hidden'}</p>
            </div>
            <button
              role="switch"
              aria-checked={state.tipsEnabled}
              onClick={() => dispatch({ type: 'SET_TIPS_ENABLED', payload: !state.tipsEnabled })}
              className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ${
                state.tipsEnabled ? 'bg-accent' : 'bg-fg/20'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                state.tipsEnabled ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Delete confirm toggle */}
          <div className="flex items-center justify-between px-3 py-2 pb-3">
            <div>
              <p className="text-xs text-fg-2 font-medium">Delete prompt</p>
              <p className="text-[10px] text-muted mt-0.5">{state.deleteConfirmEnabled ? 'Ask before deleting' : 'Delete directly'}</p>
            </div>
            <button
              role="switch"
              aria-checked={state.deleteConfirmEnabled}
              onClick={() => dispatch({ type: 'SET_DELETE_CONFIRM_ENABLED', payload: !state.deleteConfirmEnabled })}
              className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ${
                state.deleteConfirmEnabled ? 'bg-accent' : 'bg-fg/20'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                state.deleteConfirmEnabled ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
