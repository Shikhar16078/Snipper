import { useState, useRef, useEffect } from 'react'
import type { Snip, Folder } from '../../types'
import { useApp } from '../../store/AppContext'
import { SnipCard } from './SnipCard'
import { EmptyState } from './EmptyState'
import { Settings } from '../ui/Settings'
import { TipsFooter } from './TipsFooter'

interface SnipGridProps {
  onAdd: () => void
  onEdit: (snip: Snip) => void
  collapsed: boolean
  onToggleSidebar: () => void
  onOpenHelp: () => void
}

function getAllDescendantIds(folderId: string, folders: Folder[]): string[] {
  const children = folders.filter((f) => f.parentId === folderId)
  return children.flatMap((c) => [c.id, ...getAllDescendantIds(c.id, folders)])
}

export function SnipGrid({ onAdd, onEdit, collapsed, onToggleSidebar, onOpenHelp }: SnipGridProps) {
  const { state, dispatch } = useApp()
  const [search, setSearch] = useState('')
  const [expandAll, setExpandAll] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Cmd/Ctrl+F focuses the search bar
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setSearch('')
        searchRef.current?.blur()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const folderSnips =
    state.selectedFolderId === null
      ? [...state.snips]
      : state.snips.filter((s) => {
          const ids = [state.selectedFolderId!, ...getAllDescendantIds(state.selectedFolderId!, state.folders)]
          return ids.includes(s.folderId)
        })

  const q = search.trim().toLowerCase()
  const visibleSnips = q
    ? folderSnips.filter(
        (s) => s.name.toLowerCase().includes(q) || s.body.toLowerCase().includes(q),
      )
    : folderSnips

  visibleSnips.sort((a, b) => b.updatedAt - a.updatedAt)

  const currentFolder = state.folders.find((f) => f.id === state.selectedFolderId)
  const title = currentFolder ? currentFolder.name : (state.allSnipsLabel || 'All Snips')

  const isMac = window.api?.platform === 'darwin'

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface">
      {/* ── Top navbar ── */}
      <div 
        className={`flex items-center gap-2 pr-4 border-b border-border flex-shrink-0 transition-[padding] duration-200 ${
          isMac
            ? `drag-region select-none h-[40px] ${collapsed ? 'pl-[80px]' : 'pl-4'}`
            : 'py-2.5 pl-4'
        }`}
      >
        {/* Sidebar Toggle (Only when collapsed) */}
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

        {/* Title Badge */}
        <div className="flex items-center gap-1.5 bg-panel border border-border shadow-sm rounded-lg px-2.5 h-[26px] mr-1">
          {currentFolder ? (
            <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          )}
          <h2 className="text-xs font-bold text-fg tracking-wide whitespace-nowrap">{title}</h2>
        </div>
        {visibleSnips.length > 0 && !q && (
          <span className="flex items-center justify-center min-w-[26px] h-[26px] text-[10px] font-bold text-muted bg-panel border border-border px-1.5 rounded-md shadow-sm tabular-nums">
            {visibleSnips.length}
          </span>
        )}
        {q && (
          <span className="flex items-center justify-center h-[26px] text-[10px] font-bold text-accent bg-accent/8 border border-accent/20 px-2 rounded-md shadow-sm tabular-nums">
            {visibleSnips.length} result{visibleSnips.length !== 1 ? 's' : ''}
          </span>
        )}

        <div className="flex-1 flex items-center justify-center px-4">
          <div className="relative w-full max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or content…"
              className="w-full bg-panel border border-border rounded-lg pl-8 pr-8 py-1 text-xs text-fg placeholder-muted focus:outline-none focus:border-accent transition-colors app-no-drag"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); searchRef.current?.focus() }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg transition-colors app-no-drag"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Expand-all toggle */}
        <button
          onClick={() => setExpandAll((x) => !x)}
          title={expandAll ? 'Collapse cards' : 'Expand all cards'}
          className={`p-1.5 rounded-md transition-colors app-no-drag ${
            expandAll
              ? 'text-accent bg-accent/10'
              : 'text-muted hover:text-fg hover:bg-fg/8'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={expandAll
                ? 'M5 15l7-7 7 7'           // collapse icon (chevron up)
                : 'M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5'  // expand icon
              }
            />
          </svg>
        </button>

        {/* View mode toggle */}
        <div className="flex items-center bg-fg/6 rounded-lg p-0.5">
          <button
            onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: { mode: 'grid' } })}
            className={`p-1.5 rounded-md transition-colors app-no-drag ${state.viewMode === 'grid' ? 'bg-panel text-fg shadow-sm' : 'text-muted hover:text-fg-2'}`}
            title="Grid view"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: { mode: 'list' } })}
            className={`p-1.5 rounded-md transition-colors app-no-drag ${state.viewMode === 'list' ? 'bg-panel text-fg shadow-sm' : 'text-muted hover:text-fg-2'}`}
            title="List view"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* New Snip */}
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors app-no-drag"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Snip
        </button>

        {/* Settings */}
        <Settings onOpenHelp={onOpenHelp} />
      </div>

      {/* ── Cards ── */}
      {visibleSnips.length === 0 ? (
        <EmptyState onAdd={onAdd} isSearching={!!q} />
      ) : (
        <div
          className="flex-1 overflow-y-auto p-4"
          onMouseDown={(e) => {
            // Prevent text selection on double-click in the empty space
            if (e.detail >= 2 && (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'DIV')) {
              // We only want to prevent default if they aren't clicking text or an interactive element
              const target = e.target as HTMLElement
              if (!target.closest('p, h2, h3, span, button, input, textarea, .snip-card')) {
                e.preventDefault()
              }
            }
          }}
        >
          <div className={state.viewMode === 'grid' ? 'grid grid-cols-2 xl:grid-cols-3 gap-3' : 'flex flex-col gap-2'}>
            {visibleSnips.map((snip) => (
              <SnipCard key={snip.id} snip={snip} onEdit={onEdit} expanded={expandAll} />
            ))}
          </div>
        </div>
      )}

      {/* ── Tips footer ── */}
      <TipsFooter visible={state.tipsEnabled} />
    </div>
  )
}
