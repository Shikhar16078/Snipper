import { useState, useRef, useEffect } from 'react'
import type { Snip, Folder, SnipSort } from '../../types'
import { useApp } from '../../store/AppContext'
import { flattenFolders } from '../../utils/folders'
import { SnipCard } from './SnipCard'
import { EmptyState } from './EmptyState'
import { Settings } from '../ui/Settings'
import { TipsFooter } from './TipsFooter'

const SORT_OPTIONS: { value: SnipSort; label: string }[] = [
  { value: 'updated', label: 'Last modified' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'az',     label: 'A → Z' },
  { value: 'za',     label: 'Z → A' },
  { value: 'most-used', label: 'Most used' },
]

function sortSnips(snips: Snip[], sort: SnipSort): Snip[] {
  return [...snips].sort((a, b) => {
    switch (sort) {
      case 'az':        return a.name.localeCompare(b.name)
      case 'za':        return b.name.localeCompare(a.name)
      case 'newest':    return b.createdAt - a.createdAt
      case 'oldest':    return a.createdAt - b.createdAt
      case 'most-used': return (b.copyCount ?? 0) - (a.copyCount ?? 0)
      default:          return b.updatedAt - a.updatedAt
    }
  })
}

function getAllDescendantIds(folderId: string, folders: Folder[]): string[] {
  const children = folders.filter((f) => f.parentId === folderId)
  return children.flatMap((c) => [c.id, ...getAllDescendantIds(c.id, folders)])
}

function FilterChip({ label, onRemove, icon }: { label: string; onRemove: () => void; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 bg-accent/12 text-accent border border-accent/25 rounded-full pl-2 pr-1 py-0.5 text-[10px] font-medium">
      {icon && <span className="opacity-70 flex items-center">{icon}</span>}
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-accent/20 transition-colors"
      >
        <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  )
}

interface SnipGridProps {
  onAdd: () => void
  onEdit: (snip: Snip) => void
  collapsed: boolean
  onToggleSidebar: () => void
  onOpenHelp: () => void
  onOpenImport?: () => void
  onOpenExport?: () => void
}

export function SnipGrid({ onAdd, onEdit, collapsed, onToggleSidebar, onOpenHelp, onOpenImport, onOpenExport }: SnipGridProps) {
  const { state, dispatch } = useApp()
  const [search, setSearch] = useState('')
  const [expandAll, setExpandAll] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  // Star filter (navbar toggle)
  const [starFilter, setStarFilter] = useState(false)

  // Folder filter
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterFolderIds, setFilterFolderIds] = useState<Set<string>>(new Set())
  const [folderSearch, setFolderSearch] = useState('')

  const searchRef = useRef<HTMLInputElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sortOpen) return
    function onOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [sortOpen])

  useEffect(() => {
    if (!filterOpen) { setFolderSearch(''); return }
    function onOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [filterOpen])

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

  // ── Snip pool (current view scope) ──────────────────────────────────────
  const isUnfiled = state.selectedFolderId === '__unfiled__'
  const selectedTag = state.tags.find((t) => t.id === state.selectedTagId) ?? null
  const viewSnips =
    state.selectedTagId
      ? state.snips.filter((s) => s.tagIds?.includes(state.selectedTagId!))
      : state.selectedFolderId === null
        ? [...state.snips]
        : isUnfiled
          ? state.snips.filter((s) => !state.folders.some((f) => f.id === s.folderId))
          : state.snips.filter((s) => {
              const ids = [state.selectedFolderId!, ...getAllDescendantIds(state.selectedFolderId!, state.folders)]
              return ids.includes(s.folderId)
            })

  // ── Apply filters ────────────────────────────────────────────────────────
  const scopeBase  = filterFolderIds.size > 0
    ? state.snips.filter((s) => filterFolderIds.has(s.folderId))
    : viewSnips
  const starBase   = starFilter ? scopeBase.filter((s) => s.pinned) : scopeBase

  const q = search.trim().toLowerCase()
  const filtered = q
    ? starBase.filter((s) => s.name.toLowerCase().includes(q) || s.body.toLowerCase().includes(q))
    : starBase

  const displaySnips = sortSnips(filtered, state.snipSort)

  const hasFilters  = filterFolderIds.size > 0
  const filterCount = filterFolderIds.size

  function clearFilters() {
    setFilterFolderIds(new Set())
  }

  function toggleFolderId(id: string) {
    setFilterFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const currentFolder = state.folders.find((f) => f.id === state.selectedFolderId)
  const title = selectedTag ? selectedTag.name : isUnfiled ? 'Unfiled' : currentFolder ? currentFolder.name : (state.allSnipsLabel || 'All Snips')

  const flatFolders = flattenFolders(state.folders)
  const folderQ = folderSearch.trim().toLowerCase()
  const filteredFolderList = folderQ
    ? flatFolders.filter(({ folder }) => folder.name.toLowerCase().includes(folderQ))
    : flatFolders

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
        {/* Sidebar Toggle */}
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
          {selectedTag ? (
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: selectedTag.color }} />
          ) : isUnfiled ? (
            <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          ) : currentFolder ? (
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

        {displaySnips.length > 0 && !q && !hasFilters && (
          <span className="flex items-center justify-center min-w-[26px] h-[26px] text-[10px] font-bold text-muted bg-panel border border-border px-1.5 rounded-md shadow-sm tabular-nums">
            {displaySnips.length}
          </span>
        )}
        {(q || hasFilters) && (
          <span className="flex items-center justify-center h-[26px] text-[10px] font-bold text-accent bg-accent/8 border border-accent/20 px-2 rounded-md shadow-sm tabular-nums">
            {displaySnips.length} result{displaySnips.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* Search */}
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
              placeholder={filterFolderIds.size > 0 ? `Search in ${filterFolderIds.size === 1 ? state.folders.find(f => filterFolderIds.has(f.id))?.name ?? 'selected folder' : `${filterFolderIds.size} folders`}…` : 'Search by name or content…'}
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

        {/* Filter (search scope) */}
        <div ref={filterRef} className="relative app-no-drag">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            title="Filter snips"
            className={`relative p-1.5 rounded-md transition-colors ${
              hasFilters || filterOpen
                ? 'text-accent bg-accent/10'
                : 'text-muted hover:text-fg hover:bg-fg/8'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {filterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-accent text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                {filterCount > 9 ? '9+' : filterCount}
              </span>
            )}
          </button>

          {/* Filter dropdown */}
          {filterOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-panel border border-border rounded-xl shadow-xl z-50 animate-pop overflow-hidden">
              <div className="p-2.5">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-2 px-1">Search in folders</p>
                <div className="relative mb-2">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={folderSearch}
                    onChange={(e) => setFolderSearch(e.target.value)}
                    placeholder="Search folders…"
                    className="w-full bg-surface border border-border rounded-lg pl-7 pr-2 py-1 text-[11px] text-fg placeholder-muted focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {flatFolders.length === 0 ? (
                    <p className="px-2 py-1.5 text-[11px] text-muted">No folders yet</p>
                  ) : filteredFolderList.length === 0 ? (
                    <p className="px-2 py-1.5 text-[11px] text-muted">No folders found</p>
                  ) : (
                    filteredFolderList.map(({ folder, depth }) => {
                      const checked = filterFolderIds.has(folder.id)
                      return (
                        <button
                          key={folder.id}
                          onClick={() => toggleFolderId(folder.id)}
                          style={{ paddingLeft: `${8 + depth * 12}px` }}
                          className={`w-full text-left flex items-center gap-2 pr-2 py-1 rounded-lg text-xs transition-colors ${
                            checked ? 'bg-accent/10 text-accent' : 'text-fg-2 hover:text-fg hover:bg-fg/5'
                          }`}
                        >
                          <svg className={`w-3 h-3 flex-shrink-0 ${checked ? 'text-accent' : 'text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                          </svg>
                          <span className="flex-1 truncate">{folder.name}</span>
                          {checked && (
                            <svg className="w-3 h-3 flex-shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
              {hasFilters && (
                <div className="px-3 py-2 border-t border-border">
                  <button
                    onClick={() => { clearFilters(); setFilterOpen(false) }}
                    className="w-full text-center text-[11px] text-muted hover:text-fg transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-border flex-shrink-0" />

        {/* Star filter */}
        <button
          onClick={() => setStarFilter((v) => !v)}
          title={starFilter ? 'Show all snips' : 'Show starred only'}
          className={`p-1.5 rounded-md transition-colors app-no-drag ${
            starFilter ? 'text-amber-400 bg-amber-400/15' : 'text-muted hover:text-fg hover:bg-fg/8'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill={starFilter ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={starFilter ? 0 : 2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>

        <div className="w-px h-4 bg-border flex-shrink-0" />

        {/* Sort */}
        <div ref={sortRef} className="relative app-no-drag">
          <button
            onClick={() => setSortOpen((v) => !v)}
            title="Sort snippets"
            className={`p-1.5 rounded-md transition-colors ${
              state.snipSort !== 'updated' || sortOpen
                ? 'text-accent bg-accent/10'
                : 'text-muted hover:text-fg hover:bg-fg/8'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-panel border border-border rounded-xl shadow-xl py-1.5 z-50 animate-pop">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { dispatch({ type: 'SET_SNIP_SORT', payload: opt.value }); setSortOpen(false) }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition-colors ${
                    state.snipSort === opt.value
                      ? 'text-accent font-semibold'
                      : 'text-fg-2 hover:text-fg hover:bg-fg/5'
                  }`}
                >
                  {opt.label}
                  {state.snipSort === opt.value && (
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-border flex-shrink-0" />

        {/* Expand-all toggle */}
        <button
          onClick={() => setExpandAll((x) => !x)}
          title={expandAll ? 'Collapse cards' : 'Expand all cards'}
          className={`p-1.5 rounded-md transition-colors app-no-drag ${
            expandAll ? 'text-accent bg-accent/10' : 'text-muted hover:text-fg hover:bg-fg/8'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={expandAll
                ? 'M5 15l7-7 7 7'
                : 'M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5'
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

        <Settings onOpenHelp={onOpenHelp} onOpenImport={onOpenImport} onOpenExport={onOpenExport} />
      </div>

      {/* ── Active filter chips ── */}
      {hasFilters && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-border flex-shrink-0 flex-wrap bg-surface/60">
          {[...filterFolderIds].map((id) => {
            const folder = state.folders.find((f) => f.id === id)
            if (!folder) return null
            return (
              <FilterChip
                key={id}
                label={folder.name}
                onRemove={() => toggleFolderId(id)}
                icon={
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                }
              />
            )
          })}
          <button
            onClick={clearFilters}
            className="text-[10px] text-muted hover:text-fg transition-colors ml-0.5"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Cards ── */}
      {displaySnips.length === 0 ? (
        <EmptyState
          onAdd={onAdd}
          isSearching={!!q}
          isFiltering={(hasFilters || starFilter) && !q}
          onClearFilters={clearFilters}
        />
      ) : (
        <div
          className="flex-1 overflow-y-auto p-4"
          onMouseDown={(e) => {
            if (e.detail >= 2 && (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'DIV')) {
              const target = e.target as HTMLElement
              if (!target.closest('p, h2, h3, span, button, input, textarea, .snip-card')) {
                e.preventDefault()
              }
            }
          }}
        >
          <div
            className={state.viewMode === 'grid' ? 'grid gap-3' : 'flex flex-col gap-2'}
            style={state.viewMode === 'grid' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' } : undefined}
          >
            {displaySnips.map((snip) => (
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
