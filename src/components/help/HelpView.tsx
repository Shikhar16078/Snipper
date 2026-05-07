import { useState, useRef } from 'react'
import { TIP_CATEGORIES } from '../snips/TipsFooter'
import { Settings } from '../ui/Settings'

const CATEGORY_ICONS: JSX.Element[] = [
  // Getting Started — lightning bolt
  <svg key="start" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>,
  // Working with Snips — document stack
  <svg key="snips" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>,
  // Folders & Sidebar — folder
  <svg key="folders" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>,
  // Search & Navigation — magnifying glass
  <svg key="search" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>,
  // Trash & Recovery — trash can
  <svg key="trash" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>,
]

interface HelpViewProps {
  collapsed: boolean
  onToggleSidebar: () => void
  onOpenHelp: () => void
  onGoHome: () => void
}

export function HelpView({ collapsed, onToggleSidebar, onOpenHelp, onGoHome }: HelpViewProps) {
  const [selected, setSelected] = useState(0)
  const [navDirection, setNavDirection] = useState<'forward' | 'backward'>('forward')
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const isMac = (window as any).api?.platform === 'darwin'
  const cat = TIP_CATEGORIES[selected]
  const total = TIP_CATEGORIES.length
  const prevIndex = (selected - 1 + total) % total
  const nextIndex = (selected + 1) % total

  const trimmed = query.trim().toLowerCase()
  const searchResults = trimmed
    ? TIP_CATEGORIES.flatMap((c, ci) =>
        c.tips
          .map((tip, ti) => ({ tip, categoryTitle: c.title, ci, ti }))
          .filter(({ tip }) => tip.toLowerCase().includes(trimmed))
      )
    : []

  function navigateTo(index: number, direction?: 'forward' | 'backward') {
    if (index === selected) return
    setNavDirection(direction ?? (index > selected ? 'forward' : 'backward'))
    setSelected(index)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface">

      {/* Navbar */}
      <div className={`flex items-center gap-2 pr-4 border-b border-border flex-shrink-0 transition-[padding] duration-200 ${
        isMac ? `drag-region select-none h-[40px] ${collapsed ? 'pl-[80px]' : 'pl-4'}` : 'py-2.5 pl-4'
      }`}>
        {collapsed && (
          <button
            onClick={onToggleSidebar}
            className="p-1 -ml-1 rounded-md text-muted hover:text-fg hover:bg-fg/8 transition-colors app-no-drag"
            title="Expand sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v18" />
            </svg>
          </button>
        )}

        {/* Back button */}
        <button
          onClick={onGoHome}
          title="Back"
          className="p-1 -ml-1 rounded-md text-muted hover:text-fg hover:bg-fg/8 transition-colors app-no-drag"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-1.5 bg-panel border border-border shadow-sm rounded-lg px-2.5 h-[26px] flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xs font-bold text-fg tracking-wide whitespace-nowrap">Help Center</h2>
        </div>

        {/* Search */}
        <div className="flex-1 flex items-center justify-center px-4 app-no-drag">
          <div className="relative w-full max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setQuery('') }}
              placeholder="Search tips…"
              className="w-full bg-panel border border-border rounded-lg pl-8 pr-8 py-1 text-xs text-fg placeholder-muted focus:outline-none focus:border-accent transition-colors app-no-drag"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); searchRef.current?.focus() }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg transition-colors app-no-drag"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <Settings onOpenHelp={onOpenHelp} isOnHelp={true} />
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Category sidebar — hidden while searching */}
        {!trimmed && (
          <div className="w-48 flex-shrink-0 border-r border-border overflow-y-auto py-3">
            {TIP_CATEGORIES.map((c, i) => (
              <button
                key={c.title}
                onClick={() => navigateTo(i)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                  selected === i
                    ? 'text-accent bg-accent/8 font-semibold border-r-2 border-accent'
                    : 'text-fg-2 hover:text-fg hover:bg-fg/5'
                }`}
              >
                <span className={selected === i ? 'text-accent' : 'text-muted'}>
                  {CATEGORY_ICONS[i]}
                </span>
                <div className="min-w-0">
                  <p className="text-xs truncate">{c.title}</p>
                  <p className="text-[10px] text-muted font-normal mt-0.5">{c.tips.length} tips</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {trimmed ? (
            /* Search results */
            <div className="max-w-2xl mx-auto px-10 py-8">
              <p className="text-xs text-muted mb-4">
                {searchResults.length === 0
                  ? 'No tips match your search.'
                  : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
              </p>
              <div className="space-y-2">
                {searchResults.map(({ tip, categoryTitle, ci, ti }) => (
                  <div
                    key={`${ci}-${ti}`}
                    className="group flex items-start gap-3 p-3.5 rounded-xl border border-border bg-panel hover:border-accent/25 hover:bg-accent/5 hover:shadow-sm transition-all"
                  >
                    <svg className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5 transition-all group-hover:drop-shadow-[0_0_5px_rgba(var(--accent),0.7)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-fg-2 leading-relaxed group-hover:text-fg transition-colors">{tip}</p>
                      <span className="inline-block mt-1.5 text-[10px] text-muted bg-fg/5 rounded-md px-1.5 py-0.5">{categoryTitle}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Normal category view */
            <div key={selected} className="max-w-2xl mx-auto px-10 py-8 min-h-full flex flex-col">

              {/* Section header */}
              <div className="help-content-stagger flex items-center gap-3 mb-1" style={{ animationDelay: '40ms' }}>
                <span className="text-accent">{CATEGORY_ICONS[selected]}</span>
                <h1 className="text-base font-bold text-fg">{cat.title}</h1>
              </div>
              <p className="help-content-stagger text-xs text-muted mb-6 pl-7" style={{ animationDelay: '100ms' }}>
                {cat.description}
              </p>

              {/* Tips */}
              <div className="space-y-2">
                {cat.tips.map((tip, i) => (
                  <div
                    key={i}
                    className="help-content-stagger group flex items-start gap-3 p-3.5 rounded-xl border border-border bg-panel hover:border-accent/25 hover:bg-accent/5 hover:shadow-sm transition-all"
                    style={{ animationDelay: `${170 + i * 55}ms` }}
                  >
                    <svg className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5 transition-all group-hover:drop-shadow-[0_0_5px_rgba(var(--accent),0.7)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    <p className="text-xs text-fg-2 leading-relaxed group-hover:text-fg transition-colors">{tip}</p>
                  </div>
                ))}
              </div>

              {/* Footer nav */}
              <div className="flex items-center justify-between mt-auto pt-6 border-t border-border">
                <button
                  onClick={() => navigateTo(prevIndex, 'backward')}
                  className={`help-footer-nav help-footer-nav-prev flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors ${
                    navDirection === 'backward' ? 'help-footer-nav-active' : ''
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {TIP_CATEGORIES[prevIndex].title}
                </button>
                <span className="help-footer-index text-[10px] text-muted tabular-nums">
                  {selected + 1} / {TIP_CATEGORIES.length}
                </span>
                <button
                  onClick={() => navigateTo(nextIndex, 'forward')}
                  className={`help-footer-nav help-footer-nav-next flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors ${
                    navDirection === 'forward' ? 'help-footer-nav-active' : ''
                  }`}
                >
                  {TIP_CATEGORIES[nextIndex].title}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
