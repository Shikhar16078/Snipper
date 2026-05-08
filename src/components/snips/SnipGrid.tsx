import { useState, useRef, useEffect } from 'react'
import type { Snip, Folder, SnipSort } from '../../types'

type PendingBulkDrop =
  | { type: 'move'; snipIds: string[]; folderId: string; folderName: string }
  | { type: 'tag';  snipIds: string[]; tagId: string; tagName: string; tagColor: string }
  | { type: 'trash'; snipIds: string[] }
import { useApp } from '../../store/AppContext'
import { flattenFolders } from '../../utils/folders'
import { SnipCard } from './SnipCard'
import { EmptyState } from './EmptyState'
import { Settings } from '../ui/Settings'
import { TipsFooter } from './TipsFooter'
import { Modal } from '../modals/Modal'
import { Button } from '../ui/Button'

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

  // Multi-select
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedSnipIds, setSelectedSnipIds] = useState<Set<string>>(new Set())
  const [bulkModal, setBulkModal] = useState<'move' | 'tag' | 'delete' | null>(null)
  const [bulkMoveSearch, setBulkMoveSearch] = useState('')
  const [bulkTagSearch, setBulkTagSearch] = useState('')
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)
  const [pendingBulkDrop, setPendingBulkDrop] = useState<PendingBulkDrop | null>(null)
  const [bulkContextPos, setBulkContextPos] = useState<{ x: number; y: number } | null>(null)
  const bulkContextRef = useRef<HTMLDivElement>(null)

  function exitSelectionMode() {
    setIsSelectionMode(false)
    setSelectedSnipIds(new Set())
    setBulkModal(null)
    setDiscardConfirmOpen(false)
    setPendingBulkDrop(null)
  }

  function requestExitSelectionMode() {
    if (selectedSnipIds.size > 0) setDiscardConfirmOpen(true)
    else exitSelectionMode()
  }

  function toggleSnipSelection(id: string) {
    setSelectedSnipIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

  useEffect(() => {
    if (!bulkContextPos) return
    function onOutside(e: MouseEvent) {
      if (bulkContextRef.current && !bulkContextRef.current.contains(e.target as Node)) setBulkContextPos(null)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [bulkContextPos])

  // Exit selection mode when view changes
  useEffect(() => { exitSelectionMode() }, [state.selectedFolderId, state.selectedTagId])

  // Enter = Discard on the confirm dialog
  useEffect(() => {
    if (!discardConfirmOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter') { e.preventDefault(); exitSelectionMode() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [discardConfirmOpen])

  // Listen for bulk drop pending confirmation
  useEffect(() => {
    function onPending(e: Event) { setPendingBulkDrop((e as CustomEvent<PendingBulkDrop>).detail) }
    document.addEventListener('snipper:bulk-drop-pending', onPending)
    return () => document.removeEventListener('snipper:bulk-drop-pending', onPending)
  }, [])

  // Escape: close bulk modal first, then confirm-discard selection
  useEffect(() => {
    if (!isSelectionMode) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (bulkModal !== null) return          // modal handles its own Escape
      if (pendingBulkDrop !== null) { setPendingBulkDrop(null); return }
      if (discardConfirmOpen) { setDiscardConfirmOpen(false); return }
      requestExitSelectionMode()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isSelectionMode, bulkModal, pendingBulkDrop, discardConfirmOpen, selectedSnipIds])

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

        {/* Select */}
        <button
          onClick={() => { if (isSelectionMode) requestExitSelectionMode(); else setIsSelectionMode(true) }}
          title={isSelectionMode ? 'Exit selection mode' : 'Select multiple snips'}
          className={`p-1.5 rounded-md transition-colors app-no-drag ${
            isSelectionMode ? 'text-accent bg-accent/10' : 'text-muted hover:text-fg hover:bg-fg/8'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 17.5h7M17.5 14v7" />
          </svg>
        </button>

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

      {/* ── Selection action bar ── */}
      {isSelectionMode && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-accent/5 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-fg">{selectedSnipIds.size} selected</span>
            <button
              onClick={() => {
                if (selectedSnipIds.size === displaySnips.length) {
                  setSelectedSnipIds(new Set())
                } else {
                  setSelectedSnipIds(new Set(displaySnips.map((s) => s.id)))
                }
              }}
              className="text-accent hover:underline"
            >
              {selectedSnipIds.size === displaySnips.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => { setBulkMoveSearch(''); setBulkModal('move') }}
            disabled={selectedSnipIds.size === 0}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border text-fg-2 hover:text-fg hover:bg-fg/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            Move
          </button>
          <button
            onClick={() => { setBulkTagSearch(''); setBulkModal('tag') }}
            disabled={selectedSnipIds.size === 0}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border text-fg-2 hover:text-fg hover:bg-fg/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Tag
          </button>
          <button
            onClick={() => {
              if (state.deleteConfirmEnabled) {
                setBulkModal('delete')
              } else {
                for (const id of selectedSnipIds) dispatch({ type: 'DELETE_SNIP', payload: { id } })
                exitSelectionMode()
              }
            }}
            disabled={selectedSnipIds.size === 0}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-red-500/30 text-red-500 hover:bg-red-500/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
            </svg>
            Delete
          </button>
          <div className="w-px h-4 bg-border flex-shrink-0" />
          <button
            onClick={requestExitSelectionMode}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-muted hover:text-fg hover:bg-fg/8 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

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

      {/* ── Main content ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0">
          {displaySnips.length === 0 ? (
            <EmptyState
              onAdd={onAdd}
              isSearching={!!q}
              isFiltering={(hasFilters || starFilter) && !q}
              onClearFilters={clearFilters}
              tagName={!q && !hasFilters && !starFilter && selectedTag ? selectedTag.name : undefined}
            />
          ) : (
            <div
              className="flex-1 overflow-y-auto p-4 h-full"
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
                  <SnipCard
                    key={snip.id}
                    snip={snip}
                    onEdit={onEdit}
                    expanded={expandAll}
                    selected={selectedSnipIds.has(snip.id)}
                    isSelectionMode={isSelectionMode}
                    onToggleSelect={toggleSnipSelection}
                    onBulkContextMenu={(x, y) => setBulkContextPos({ x, y })}
                    bulkDragIds={isSelectionMode && selectedSnipIds.has(snip.id) ? [...selectedSnipIds] : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Tips footer ── */}
      <TipsFooter visible={state.tipsEnabled} />

      {/* ── Bulk Move modal ── */}
      <Modal open={bulkModal === 'move'} onClose={() => setBulkModal(null)} title="Move to folder">
        <div className="relative mb-3">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={bulkMoveSearch}
            onChange={(e) => setBulkMoveSearch(e.target.value)}
            placeholder="Search folders…"
            autoFocus
            className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-fg placeholder-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        {(() => {
          const q = bulkMoveSearch.trim().toLowerCase()
          const all = flattenFolders(state.folders)
          const filtered = q ? all.filter(({ folder }) => folder.name.toLowerCase().includes(q)) : all
          return filtered.length === 0 ? (
            <p className="text-xs text-muted py-2">{state.folders.length === 0 ? 'No folders yet.' : 'No folders found.'}</p>
          ) : (
            <div className="max-h-52 overflow-y-auto -mx-1">
              {filtered.map(({ folder, depth }) => (
                <button
                  key={folder.id}
                  onClick={() => {
                    for (const id of selectedSnipIds) dispatch({ type: 'MOVE_SNIP', payload: { id, folderId: folder.id } })
                    exitSelectionMode()
                  }}
                  style={{ paddingLeft: `${8 + depth * 12}px` }}
                  className="w-full text-left flex items-center gap-2 pr-3 py-1.5 rounded-lg text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}
            </div>
          )
        })()}
      </Modal>

      {/* ── Bulk Tag modal ── */}
      <Modal open={bulkModal === 'tag'} onClose={() => setBulkModal(null)} title="Assign tags">
        {state.tags.length > 0 && (
          <div className="relative mb-3">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={bulkTagSearch}
              onChange={(e) => setBulkTagSearch(e.target.value)}
              placeholder="Search tags…"
              autoFocus
              className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-fg placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        )}
        {state.tags.length === 0 ? (
          <p className="text-xs text-muted py-2">No tags yet. Create tags from the sidebar.</p>
        ) : (() => {
          const q = bulkTagSearch.trim().toLowerCase()
          const filtered = q ? state.tags.filter((t) => t.name.toLowerCase().includes(q)) : state.tags
          const selectedIds = [...selectedSnipIds]
          return filtered.length === 0 ? (
            <p className="text-xs text-muted py-2">No tags found.</p>
          ) : (
            <div className="max-h-52 overflow-y-auto -mx-1 mb-4">
              {filtered.map((tag) => {
                const hasCount = selectedIds.filter((id) => state.snips.find((s) => s.id === id)?.tagIds?.includes(tag.id)).length
                const tagState: 'all' | 'none' | 'some' = hasCount === selectedIds.length ? 'all' : hasCount === 0 ? 'none' : 'some'
                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      const addTag = tagState !== 'all'
                      for (const snipId of selectedSnipIds) {
                        const snip = state.snips.find((s) => s.id === snipId)
                        if (!snip) continue
                        const current = snip.tagIds ?? []
                        const has = current.includes(tag.id)
                        if (addTag && !has) dispatch({ type: 'SET_SNIP_TAGS', payload: { snipId, tagIds: [...current, tag.id] } })
                        else if (!addTag && has) dispatch({ type: 'SET_SNIP_TAGS', payload: { snipId, tagIds: current.filter((id) => id !== tag.id) } })
                      }
                    }}
                    className="w-full text-left flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors"
                  >
                    <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center ${
                      tagState === 'all' ? 'border-accent bg-accent' : tagState === 'some' ? 'border-accent bg-accent/20' : 'border-border'
                    }`}>
                      {tagState === 'all' && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {tagState === 'some' && <div className="w-1.5 h-0.5 bg-accent rounded-full" />}
                    </div>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="flex-1 truncate">{tag.name}</span>
                  </button>
                )
              })}
            </div>
          )
        })()}
        <div className="flex justify-end">
          <Button onClick={() => setBulkModal(null)}>Done</Button>
        </div>
      </Modal>

      {/* ── Bulk context menu ── */}
      {bulkContextPos && (
        <div
          ref={bulkContextRef}
          style={{
            position: 'fixed',
            left: Math.min(bulkContextPos.x, window.innerWidth - 176),
            top: Math.min(bulkContextPos.y, window.innerHeight - 140),
            zIndex: 9999,
          }}
          className="w-44 bg-panel border border-border rounded-xl shadow-xl py-1.5 animate-pop"
        >
          <div className="px-3 py-1 mb-0.5">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
              {selectedSnipIds.size} selected
            </span>
          </div>
          <div className="border-t border-border mx-2 mb-1" />
          <button
            onClick={() => { setBulkContextPos(null); setBulkMoveSearch(''); setBulkModal('move') }}
            className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors flex items-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            Move
          </button>
          <button
            onClick={() => { setBulkContextPos(null); setBulkTagSearch(''); setBulkModal('tag') }}
            className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors flex items-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Tag
          </button>
          <div className="border-t border-border mx-2 my-1" />
          <button
            onClick={() => {
              setBulkContextPos(null)
              if (state.deleteConfirmEnabled) setBulkModal('delete')
              else { for (const id of selectedSnipIds) dispatch({ type: 'DELETE_SNIP', payload: { id } }); exitSelectionMode() }
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/8 transition-colors flex items-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
            </svg>
            Delete
          </button>
        </div>
      )}

      {/* ── Bulk drop confirmation ── */}
      <Modal
        open={pendingBulkDrop !== null}
        onClose={() => setPendingBulkDrop(null)}
        title={
          pendingBulkDrop?.type === 'move'  ? 'Move snips?' :
          pendingBulkDrop?.type === 'tag'   ? 'Assign tag?' :
          'Move to Trash?'
        }
      >
        {pendingBulkDrop?.type === 'move' && (
          <p className="text-xs text-muted mb-5">
            Move <span className="font-semibold text-fg">{pendingBulkDrop.snipIds.length} snip{pendingBulkDrop.snipIds.length !== 1 ? 's' : ''}</span> to <span className="font-semibold text-fg">"{pendingBulkDrop.folderName}"</span>?
          </p>
        )}
        {pendingBulkDrop?.type === 'tag' && (
          <div className="flex items-center gap-2 mb-5 text-xs text-muted">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pendingBulkDrop.tagColor }} />
            Add tag <span className="font-semibold text-fg">"{pendingBulkDrop.tagName}"</span> to <span className="font-semibold text-fg">{pendingBulkDrop.snipIds.length} snip{pendingBulkDrop.snipIds.length !== 1 ? 's' : ''}</span>?
          </div>
        )}
        {pendingBulkDrop?.type === 'trash' && (
          <p className="text-xs text-muted mb-5">
            Move <span className="font-semibold text-fg">{pendingBulkDrop.snipIds.length} snip{pendingBulkDrop.snipIds.length !== 1 ? 's' : ''}</span> to Trash? You can restore them later.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setPendingBulkDrop(null)}>Cancel</Button>
          {pendingBulkDrop?.type === 'trash' ? (
            <button
              onClick={() => {
                for (const id of pendingBulkDrop.snipIds) dispatch({ type: 'DELETE_SNIP', payload: { id } })
                exitSelectionMode()
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              Move to Trash
            </button>
          ) : (
            <Button onClick={() => {
              if (!pendingBulkDrop) return
              if (pendingBulkDrop.type === 'move') {
                for (const id of pendingBulkDrop.snipIds)
                  dispatch({ type: 'MOVE_SNIP', payload: { id, folderId: pendingBulkDrop.folderId } })
              } else if (pendingBulkDrop.type === 'tag') {
                for (const snipId of pendingBulkDrop.snipIds) {
                  const snip = state.snips.find((s) => s.id === snipId)
                  if (!snip) continue
                  const next = [...new Set([...(snip.tagIds ?? []), pendingBulkDrop.tagId])]
                  dispatch({ type: 'SET_SNIP_TAGS', payload: { snipId, tagIds: next } })
                }
              }
              exitSelectionMode()
            }}>
              {pendingBulkDrop?.type === 'move' ? 'Move' : 'Add Tag'}
            </Button>
          )}
        </div>
      </Modal>

      {/* ── Discard selection confirm ── */}
      <Modal open={discardConfirmOpen} onClose={() => setDiscardConfirmOpen(false)} title="Discard selection?">
        <p className="text-xs text-muted mb-5">
          You have <span className="font-semibold text-fg">{selectedSnipIds.size} snip{selectedSnipIds.size !== 1 ? 's' : ''}</span> selected. Discard the selection?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDiscardConfirmOpen(false)} className="border border-accent/50 text-accent hover:text-accent hover:bg-accent/8">Keep selecting</Button>
          <Button onClick={exitSelectionMode}>Discard</Button>
        </div>
      </Modal>

      {/* ── Bulk Delete modal ── */}
      <Modal open={bulkModal === 'delete'} onClose={() => setBulkModal(null)} title="Move to Trash?">
        <p className="text-xs text-muted mb-5">
          Move <span className="font-semibold text-fg">{selectedSnipIds.size} snip{selectedSnipIds.size !== 1 ? 's' : ''}</span> to Trash? You can restore them later.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setBulkModal(null)}>Cancel</Button>
          <button
            onClick={() => {
              for (const id of selectedSnipIds) dispatch({ type: 'DELETE_SNIP', payload: { id } })
              exitSelectionMode()
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            Move to Trash
          </button>
        </div>
      </Modal>
    </div>
  )
}
