import { useState, useRef, useEffect } from 'react'
import type { Theme, TrashAutoPurge } from '../../types'
import { useApp } from '../../store/AppContext'
import { AboutModal } from '../modals/AboutModal'

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

const PURGE_PRESETS: { label: string; ms: TrashAutoPurge }[] = [
  { label: 'Never',   ms: null },
  { label: '1 hour',  ms: 60 * 60_000 },
  { label: '7 days',  ms: 7 * 24 * 3_600_000 },
]

function formatPurgeDuration(ms: TrashAutoPurge): string {
  if (ms === null) return 'Never'
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`
  if (ms < 86_400_000) {
    const h = Math.round(ms / 3_600_000)
    return `${h} hr`
  }
  const d = Math.round(ms / 86_400_000)
  return `${d} day${d !== 1 ? 's' : ''}`
}

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

export function Settings({ onOpenHelp, isOnHelp }: { onOpenHelp?: () => void; isOnHelp?: boolean } = {}) {
  const { state, dispatch } = useApp()
  const [open, setOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [menuView, setMenuView] = useState<'main' | 'themes' | 'purge'>('main')
  const [customValue, setCustomValue] = useState('')
  const [customUnit, setCustomUnit] = useState<'min' | 'hr' | 'day'>('day')
  const [warnFlash, setWarnFlash] = useState(false)
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setTimeout(() => { setMenuView('main'); setCustomValue('') }, 200)
      return
    }
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
  const activeTheme = ALL_THEMES.find((t) => t.id === state.theme) || DEFAULT_THEME
  const iconColor = activeTheme.accent

  return (
    <>
    <div ref={ref} className="relative app-no-drag">
      {/* Gear trigger — fills navbar height */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Settings"
        style={{ color: open ? iconColor : undefined }}
        className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors app-no-drag ${
          open ? 'bg-accent/10 hover:bg-accent/15' : 'text-muted hover:text-fg hover:bg-fg/8'
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
        <div className={`absolute right-0 top-full mt-1.5 bg-panel border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-pop transition-all app-no-drag ${menuView === 'themes' ? 'w-44' : menuView === 'purge' ? 'w-52' : 'w-max min-w-[192px] max-w-[260px]'}`}>
          {menuView === 'main' ? (
            <>
              <div className="px-2 pt-2 pb-1.5">
                <button
                  onClick={() => setMenuView('themes')}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-fg hover:bg-fg/5 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color: iconColor }}>{isDark ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="4" strokeWidth={2} />
                        <path strokeLinecap="round" strokeWidth={2} d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                      </svg>
                    )}</span>
                    <span className="font-medium text-fg-2 group-hover:text-fg">Theme</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted group-hover:text-fg-2 transition-colors">
                    <span>{activeTheme.label}</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>

              <div className="mx-3 my-0.5 border-t border-border" />

              {/* Tips toggle */}
              <div className="group flex items-center justify-between px-3 py-2 mx-1 rounded-lg hover:bg-fg/5 transition-colors">
                <div>
                  <p className="text-xs text-fg-2 font-medium group-hover:text-fg transition-colors">Tips</p>
                  <p className="text-[10px] text-muted mt-0.5 group-hover:text-fg-2 transition-colors">{state.tipsEnabled ? 'Showing tips' : 'Tips hidden'}</p>
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
              <div className="group flex items-center justify-between px-3 py-2 mx-1 rounded-lg hover:bg-fg/5 transition-colors">
                <div>
                  <p className="text-xs text-fg-2 font-medium group-hover:text-fg transition-colors">Delete prompt</p>
                  <p className="text-[10px] text-muted mt-0.5 group-hover:text-fg-2 transition-colors">{state.deleteConfirmEnabled ? 'Ask before deleting' : 'Delete directly'}</p>
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

              {/* Hold action toggle */}
              <div className="group flex items-center justify-between px-3 py-2 mx-1 rounded-lg hover:bg-fg/5 transition-colors">
                <div>
                  <p className="text-xs text-fg-2 font-medium group-hover:text-fg transition-colors">Hold action</p>
                  <p className="text-[10px] text-muted mt-0.5 group-hover:text-fg-2 transition-colors">
                    {state.holdAction === 'copy' ? 'Hold to copy, click to edit' : 'Hold to edit, click to copy'}
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={state.holdAction === 'copy'}
                  onClick={() => dispatch({ type: 'SET_HOLD_ACTION', payload: state.holdAction === 'copy' ? 'edit' : 'copy' })}
                  className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ${
                    state.holdAction === 'copy' ? 'bg-accent' : 'bg-fg/20'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    state.holdAction === 'copy' ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Empty trash after */}
              <button
                onClick={() => setMenuView('purge')}
                className="w-full flex items-center justify-between gap-4 pl-1 pr-2 py-1.5 mx-2 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 rounded-lg transition-colors group"
              >
                <span className="font-medium pl-0.5 whitespace-nowrap">
                  {state.trashAutoPurge === null ? 'Never auto-empty trash' : 'Empty trash every'}
                </span>
                <div className="flex items-center gap-1">
                  {state.trashAutoPurge !== null && (
                    <span style={{ color: iconColor }} className="font-semibold">{formatPurgeDuration(state.trashAutoPurge)}</span>
                  )}
                  <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <div className="mx-3 my-0.5 border-t border-border" />

              {/* Tips + About section */}
              <div className="px-2 pt-1.5 pb-2 space-y-0.5">
                {!isOnHelp && (
                  <button
                    onClick={() => { setOpen(false); onOpenHelp?.() }}
                    className="w-full text-left pl-1 pr-2 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 rounded-lg transition-colors flex items-center justify-between group"
                  >
                    <span>Help Center</span>
                    <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => { setOpen(false); setAboutOpen(true); }}
                  className="w-full text-left pl-1 pr-2 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 rounded-lg transition-colors flex items-center justify-between group"
                >
                  <span>About</span>
                  <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </>
          ) : menuView === 'purge' ? (
            <div className="flex flex-col">
              <div className="sticky top-0 bg-panel/80 backdrop-blur-md border-b border-border px-2 py-1.5 flex items-center gap-1 z-10">
                <button onClick={() => setMenuView('main')} className="p-1 rounded-lg text-muted hover:text-fg hover:bg-fg/8 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-xs font-semibold text-fg">Empty Trash After</span>
              </div>

              <div className="pt-1.5">
                {PURGE_PRESETS.map(({ label, ms }) => (
                  <button
                    key={label}
                    onClick={() => { dispatch({ type: 'SET_TRASH_AUTO_PURGE', payload: ms }); setMenuView('main') }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${
                      state.trashAutoPurge === ms ? 'text-accent bg-accent/8 font-medium' : 'text-fg-2 hover:text-fg hover:bg-fg/5'
                    }`}
                  >
                    {label}
                    {state.trashAutoPurge === ms && <ActiveIcon />}
                  </button>
                ))}
              </div>

              <div className="mx-3 my-1.5 border-t border-border" />

              <div className="px-3 pb-3">
                <p className="text-[9px] font-semibold tracking-widest uppercase text-muted/60 mb-2 select-none">Custom</p>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customValue}
                    onChange={(e) => {
                      const val = e.target.value
                      const max = customUnit === 'min' ? 60 : customUnit === 'hr' ? 24 : Infinity
                      if (Number(val) > max) {
                        if (warnTimerRef.current) clearTimeout(warnTimerRef.current)
                        setWarnFlash(true)
                        warnTimerRef.current = setTimeout(() => setWarnFlash(false), 1500)
                        return
                      }
                      setWarnFlash(false)
                      setCustomValue(val)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const n = Number(customValue)
                        if (!n || n <= 0) return
                        const unitMs = customUnit === 'min' ? 60_000 : customUnit === 'hr' ? 3_600_000 : 86_400_000
                        dispatch({ type: 'SET_TRASH_AUTO_PURGE', payload: Math.round(n * unitMs) })
                        setCustomValue('')
                        setMenuView('main')
                      }
                    }}
                    placeholder="30"
                    className="w-14 bg-surface border border-border rounded-md px-2 py-1 text-xs text-fg placeholder-muted focus:outline-none focus:border-accent transition-colors"
                  />
                  <select
                    value={customUnit}
                    onChange={(e) => {
                      const unit = e.target.value as 'min' | 'hr' | 'day'
                      if (unit === 'hr' && Number(customValue) > 24) setCustomValue('24')
                      if (unit === 'min' && Number(customValue) > 60) setCustomValue('60')
                      setWarnFlash(false)
                      setCustomUnit(unit)
                    }}
                    className="flex-1 bg-surface border border-border rounded-md px-1.5 py-1 text-xs text-fg focus:outline-none focus:border-accent transition-colors"
                  >
                    <option value="min">minutes</option>
                    <option value="hr">hours</option>
                    <option value="day">days</option>
                  </select>
                </div>
                {(customUnit === 'hr' || customUnit === 'min') && (
                  <p className={`text-[10px] mt-1.5 transition-colors duration-300 ${
                    warnFlash ? 'text-orange-400 font-medium' : 'text-muted'
                  }`}>
                    {customUnit === 'min' ? 'Max 60 min — use hours for longer.' : 'Max 24 hrs — use days for longer.'}
                  </p>
                )}
                <button
                  onClick={() => {
                    const n = Number(customValue)
                    if (!n || n <= 0) return
                    const unitMs = customUnit === 'min' ? 60_000 : customUnit === 'hr' ? 3_600_000 : 86_400_000
                    dispatch({ type: 'SET_TRASH_AUTO_PURGE', payload: Math.round(n * unitMs) })
                    setCustomValue('')
                    setMenuView('main')
                  }}
                  disabled={!customValue || Number(customValue) <= 0}
                  className="mt-2 w-full py-1 text-xs font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  Set
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col max-h-[60vh] overflow-y-auto">
              <div className="sticky top-0 bg-panel/80 backdrop-blur-md border-b border-border px-2 py-1.5 flex items-center gap-1 z-10">
                <button
                  onClick={() => setMenuView('main')}
                  className="p-1 rounded-lg text-muted hover:text-fg hover:bg-fg/8 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-xs font-semibold text-fg">Theme</span>
              </div>
              
              <div className="pt-2">
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
                <div className="pb-2" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>

    <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
</>
  )
}
