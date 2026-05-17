import React, { useState, useRef, useEffect } from 'react'
import type { Snip, Section, SnipSort } from '../../types'
import { generateId } from '../../utils/id'

type PendingBulkDrop =
  | { type: 'move'; snipIds: string[]; folderId: string; folderName: string }
  | { type: 'tag';  snipIds: string[]; tagId: string; tagName: string; tagColor: string }
  | { type: 'trash'; snipIds: string[] }
  | { type: 'section'; snipIds: string[]; sectionId: string | null; sectionName: string }
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


type SectionDisplayItem =
  | { kind: 'general'; id: '__general__'; _order: number }
  | { kind: 'explicit'; id: string; section: Section; _order: number }

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
  onAdd: (sectionId?: string | null) => void
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
  const [starSectionOpen, setStarSectionOpen] = useState(true)
  const [unstarSectionOpen, setUnstarSectionOpen] = useState(true)

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
    setBulkMoveStep('folder')
    setBulkMoveFolderTarget(null)
    setPendingMoveSection(null)
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

  // Sections
  const [sectionCollapsed, setSectionCollapsed] = useState<Record<string, boolean>>({})
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null)
  const [renameSectionValue, setRenameSectionValue] = useState('')
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null)
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null)
  const [sectionDropIndex, setSectionDropIndex] = useState<number | null>(null)
  const newSectionIdRef = useRef<string | null>(null)
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null)
  const [bulkMoveStep, setBulkMoveStep] = useState<'folder' | 'section'>('folder')
  const [bulkMoveFolderTarget, setBulkMoveFolderTarget] = useState<{ id: string; name: string } | null>(null)
  const [pendingMoveSection, setPendingMoveSection] = useState<string | null>(null)

  // Section Organizer modal
  const [sectionOrganizerOpen, setSectionOrganizerOpen] = useState(false)
  const [orgRenamingId, setOrgRenamingId] = useState<string | null>(null)
  const [orgRenameValue, setOrgRenameValue] = useState('')
  const [orgDraggingId, setOrgDraggingId] = useState<string | null>(null)
  const [orgDropIndex, setOrgDropIndex] = useState<number | null>(null)
  const [newSectionInput, setNewSectionInput] = useState('')
  const [orgConfirmDeleteId, setOrgConfirmDeleteId] = useState<string | null>(null)
  const [isAddingSection, setIsAddingSection] = useState(false)

  const [filterPos, setFilterPos] = useState<React.CSSProperties | null>(null)
  const [sortPos, setSortPos] = useState<React.CSSProperties | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sortOpen) return
    function onOutside(e: MouseEvent) {
      const inBtn = sortRef.current?.contains(e.target as Node)
      const inDropdown = sortDropdownRef.current?.contains(e.target as Node)
      if (!inBtn && !inDropdown) setSortOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [sortOpen])

  useEffect(() => {
    if (!filterOpen) { setFolderSearch(''); return }
    function onOutside(e: MouseEvent) {
      const inBtn = filterRef.current?.contains(e.target as Node)
      const inDropdown = filterDropdownRef.current?.contains(e.target as Node)
      if (!inBtn && !inDropdown) setFilterOpen(false)
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
          : state.snips.filter((s) => s.folderId === state.selectedFolderId)

  // ── Apply filters ────────────────────────────────────────────────────────
  const scopeBase  = filterFolderIds.size > 0
    ? state.snips.filter((s) => filterFolderIds.has(s.folderId))
    : viewSnips

  const q = search.trim().toLowerCase()
  const filtered = q
    ? scopeBase.filter((s) => s.name.toLowerCase().includes(q) || s.body.toLowerCase().includes(q))
    : scopeBase

  const displaySnips = sortSnips(filtered, state.snipSort)

  // When star filter is active, split into two groups instead of hiding non-starred
  const starredSnips   = starFilter ? displaySnips.filter((s) => s.pinned)  : []
  const unstarredSnips = starFilter ? displaySnips.filter((s) => !s.pinned) : []

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

  const folderSections = currentFolder && !state.selectedTagId && !isUnfiled
    ? [...state.sections.filter((s) => s.folderId === currentFolder.id)].sort((a, b) => a.order - b.order)
    : []
  const hasSections = folderSections.length > 0

  const generalDisplayOrder = currentFolder?.defaultSectionOrder ?? -1
  const orderedSectionDisplay: SectionDisplayItem[] = (currentFolder && !state.selectedTagId && !isUnfiled) ? [
    { kind: 'general' as const, id: '__general__' as const, _order: generalDisplayOrder },
    ...folderSections.map((s) => ({ kind: 'explicit' as const, id: s.id, section: s, _order: s.order })),
  ].sort((a, b) => a._order - b._order) : []

  const allSectionIds = hasSections
    ? [
        '__general__',
        ...folderSections.map((s) => s.id),
      ]
    : []
  const allSectionsCollapsed = allSectionIds.length > 0 && allSectionIds.every((id) => sectionCollapsed[id] ?? false)

  function toggleAllSections() {
    if (allSectionsCollapsed) {
      setSectionCollapsed({})
    } else {
      const next: Record<string, boolean> = {}
      for (const id of allSectionIds) next[id] = true
      setSectionCollapsed(next)
    }
  }

  function addSection() {
    if (!currentFolder) return
    const id = generateId()
    dispatch({ type: 'ADD_SECTION', payload: { id, folderId: currentFolder.id, name: 'New Section' } })
    newSectionIdRef.current = id
    setRenamingSectionId(id)
    setRenameSectionValue('')
    setIsAddingSection(true)
  }

  function handleSectionReorder(draggedId: string, targetDropIndex: number) {
    if (!currentFolder) return
    const currentIndex = orderedSectionDisplay.findIndex((item) => item.id === draggedId)
    if (currentIndex === -1) return
    if (targetDropIndex === currentIndex || targetDropIndex === currentIndex + 1) return
    const newItems = [...orderedSectionDisplay]
    const [moved] = newItems.splice(currentIndex, 1)
    const insertAt = targetDropIndex > currentIndex ? targetDropIndex - 1 : targetDropIndex
    newItems.splice(insertAt, 0, moved)
    dispatch({
      type: 'REORDER_SECTIONS_IN_FOLDER',
      payload: { folderId: currentFolder.id, orderedIds: newItems.map((item) => item.id) },
    })
  }

  function commitSectionRename(sectionId: string, name: string, isDefault: boolean) {
    const trimmed = name.trim()
    const isNew = newSectionIdRef.current === sectionId
    newSectionIdRef.current = null
    setRenamingSectionId(null)
    setIsAddingSection(false)
    if (!trimmed) {
      if (isNew) dispatch({ type: 'DELETE_SECTION', payload: { sectionId } })
      return
    }
    if (isDefault) {
      dispatch({ type: 'RENAME_DEFAULT_SECTION', payload: { folderId: currentFolder!.id, name: trimmed } })
    } else {
      dispatch({ type: 'RENAME_SECTION', payload: { sectionId, name: trimmed } })
    }
  }

  function cancelSectionRename(sectionId: string) {
    if (newSectionIdRef.current === sectionId) {
      dispatch({ type: 'DELETE_SECTION', payload: { sectionId } })
      newSectionIdRef.current = null
    }
    setRenamingSectionId(null)
    setIsAddingSection(false)
  }

  function handleSectionDragOver(e: React.DragEvent, sectionId: string | null) {
    if (!e.dataTransfer.types.includes('text/plain')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSectionId(sectionId ?? '__general__')
  }

  function handleSectionDrop(e: React.DragEvent, sectionId: string | null, sectionName: string) {
    setDragOverSectionId(null)
    if (e.dataTransfer.types.includes('application/json')) {
      const ids = JSON.parse(e.dataTransfer.getData('application/json')) as string[]
      document.dispatchEvent(new CustomEvent('snipper:bulk-drop-pending', {
        detail: { type: 'section', snipIds: ids, sectionId, sectionName } satisfies PendingBulkDrop,
      }))
    } else {
      const snipId = e.dataTransfer.getData('text/plain')
      if (snipId) dispatch({ type: 'SET_SNIP_SECTION', payload: { snipId, sectionId } })
    }
  }

  // Toolbar position derived classes
  const tbPos = state.toolbarPosition ?? 'right'
  const tbVertical = tbPos === 'left' || tbPos === 'right'
  const tbWrapperClass = {
    left:   'absolute left-0 inset-y-0 overflow-y-auto flex flex-col px-2 py-4 pointer-events-none',
    right:  'absolute right-0 inset-y-0 overflow-y-auto flex flex-col px-2 py-4 pointer-events-none',
    top:    'absolute top-0 inset-x-0 overflow-x-auto flex flex-row py-2 px-4 pointer-events-none',
    bottom: 'absolute bottom-0 inset-x-0 overflow-x-auto flex flex-row py-2 px-4 pointer-events-none',
  }[tbPos]
  const tbPillClass = tbVertical
    ? 'pointer-events-auto flex flex-col items-center py-2 px-1 gap-0.5 bg-panel border border-border rounded-2xl shadow-md m-auto'
    : 'pointer-events-auto flex flex-row items-center px-2 py-1 gap-0.5 bg-panel border border-border rounded-2xl shadow-md m-auto'
  const tbDividerClass = tbVertical
    ? 'w-5 h-px bg-border/80 my-0.5 flex-shrink-0'
    : 'h-5 w-px bg-border/80 mx-0.5 flex-shrink-0'
  const contentPad = { left: 'pl-14', right: 'pr-14', top: 'pt-14', bottom: 'pb-20' }[tbPos]

  function tbDropdownPos(rect: DOMRect): React.CSSProperties {
    if (tbPos === 'left')   return { position: 'fixed', top: rect.top, left: rect.right + 4 }
    if (tbPos === 'top')    return { position: 'fixed', top: rect.bottom + 4, left: rect.left }
    if (tbPos === 'bottom') return { position: 'fixed', bottom: window.innerHeight - rect.top + 4, left: rect.left }
    return { position: 'fixed', top: rect.top, right: window.innerWidth - rect.left + 4 }
  }

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

        <div className="flex items-center gap-2 app-no-drag">
          {/* New Snip */}
          <button
            onClick={() => onAdd()}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors app-no-drag"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Snip
          </button>

          <Settings onOpenHelp={onOpenHelp} onOpenImport={onOpenImport} onOpenExport={onOpenExport} />
        </div>
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
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div className="absolute inset-0 flex flex-col">
          {(currentFolder && !isUnfiled && !state.selectedTagId && !starFilter) ? (
            /* ── Sections view ── */
            (() => {
              if (q && displaySnips.length === 0) {
                return (
                  <EmptyState
                    onAdd={onAdd}
                    isSearching={true}
                    isFiltering={false}
                    onClearFilters={clearFilters}
                  />
                )
              }

              const validSectionIds = new Set(folderSections.map((s) => s.id))
              const unsectioned = displaySnips.filter((s) => !s.sectionId || !validSectionIds.has(s.sectionId))
              const snipsBySection = Object.fromEntries(
                folderSections.map((sec) => [sec.id, displaySnips.filter((s) => s.sectionId === sec.id)])
              )
              const defaultName = currentFolder?.defaultSectionName ?? 'General'
              const isGeneralRenaming = renamingSectionId === '__general__'

              // Fully empty folder: no sections and no snips
              if (orderedSectionDisplay.length === 0 && displaySnips.length === 0) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center gap-5 h-full p-8">
                    <div className="w-14 h-14 rounded-2xl bg-fg/5 border border-border flex items-center justify-center">
                      <svg className="w-7 h-7 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                      </svg>
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-semibold text-fg">This folder is empty</p>
                      <p className="text-xs text-muted max-w-[260px] leading-relaxed">Add your first snip, or create sections to keep things organized.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onAdd()}
                        className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Snip
                      </button>
                      <button
                        onClick={addSection}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-fg-2 hover:text-fg hover:bg-fg/8 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 15v6m3-3h-6" />
                        </svg>
                        New Section
                      </button>
                    </div>
                  </div>
                )
              }

              function renderSectionGrid(snips: Snip[], sectionIdForAdd?: string | null) {
                return snips.length === 0 ? (
                  <div className="flex items-center gap-2 py-3 px-3 rounded-lg border border-dashed border-border/60 my-0.5">
                    <svg className="w-3.5 h-3.5 text-muted/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs text-muted/70">No snips yet</span>
                    <button onClick={() => onAdd(sectionIdForAdd)} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium transition-colors">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      New Snip
                    </button>
                  </div>
                ) : (
                  <div
                    className={state.viewMode === 'grid' ? 'grid gap-3' : 'flex flex-col gap-2'}
                    style={state.viewMode === 'grid' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' } : undefined}
                  >
                    {snips.map((snip) => (
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
                )
              }

              const isSectionDragging = draggingSectionId !== null

              function renderDropLine(index: number) {
                if (!isSectionDragging || sectionDropIndex !== index) return null
                return <div className="h-0.5 rounded-full bg-accent -my-2 mx-1 pointer-events-none" />
              }

              return (
                <div className={`flex-1 overflow-y-auto p-4 h-full space-y-5 ${contentPad}`}>
                  {renderDropLine(0)}
                  {orderedSectionDisplay.map((item, index) => {
                    const isDraggedItem = draggingSectionId === item.id

                    if (item.kind === 'general') {
                      if (q && unsectioned.length === 0) return null
                      const isCollapsed = sectionCollapsed.__general__ ?? false
                      const isDragOver = dragOverSectionId === '__general__' && !isSectionDragging
                      return (
                        <div
                          key="__general__"
                          style={{ opacity: isDraggedItem ? 0.4 : 1 }}
                          onDragOver={(e) => {
                            if (!e.dataTransfer.types.includes('application/section-id')) return
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            const rect = e.currentTarget.getBoundingClientRect()
                            setSectionDropIndex(e.clientY < rect.top + rect.height / 2 ? index : index + 1)
                          }}
                          onDrop={(e) => {
                            if (!e.dataTransfer.types.includes('application/section-id')) return
                            e.preventDefault()
                            const draggedId = e.dataTransfer.getData('application/section-id')
                            handleSectionReorder(draggedId, sectionDropIndex ?? orderedSectionDisplay.length)
                            setSectionDropIndex(null)
                            setDraggingSectionId(null)
                          }}
                        >
                          <div
                            className={`group flex items-center gap-1.5 mb-2.5 py-1 px-2 -mx-2 rounded-lg transition-colors ${
                              isDragOver ? 'bg-accent/10 outline outline-1 outline-accent/30' : ''
                            }`}
                            onDragOver={(e) => {
                              if (e.dataTransfer.types.includes('text/plain')) handleSectionDragOver(e, null)
                            }}
                            onDragLeave={() => {
                              if (!isSectionDragging) setDragOverSectionId(null)
                            }}
                            onDrop={(e) => {
                              if (!e.dataTransfer.types.includes('application/section-id')) {
                                handleSectionDrop(e, null, defaultName)
                                e.stopPropagation()
                              }
                            }}
                          >
                            <button
                              onClick={() => setSectionCollapsed((p) => ({ ...p, __general__: !isCollapsed }))}
                              className="flex-shrink-0"
                            >
                              <svg
                                className={`w-3 h-3 text-muted transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            {isGeneralRenaming ? (
                              <input
                                autoFocus
                                value={renameSectionValue}
                                onChange={(e) => setRenameSectionValue(e.target.value)}
                                onBlur={() => commitSectionRename('__general__', renameSectionValue, true)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.currentTarget.blur()
                                  if (e.key === 'Escape') { cancelSectionRename('__general__'); e.preventDefault() }
                                }}
                                placeholder="Section name…"
                                className="flex-1 text-xs font-semibold text-fg bg-transparent border-0 border-b border-accent outline-none min-w-0 placeholder:text-muted/60"
                              />
                            ) : (
                              <span className="text-xs font-semibold text-fg-2">{defaultName}</span>
                            )}
                            <span className="text-[10px] text-muted tabular-nums">{unsectioned.length}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateRows: isCollapsed ? '0fr' : '1fr', transition: 'grid-template-rows 220ms ease' }}>
                            <div style={{ overflow: 'hidden' }}>{renderSectionGrid(unsectioned, null)}</div>
                          </div>
                          {renderDropLine(index + 1)}
                        </div>
                      )
                    }

                    const { section } = item
                    const sectionSnips = snipsBySection[section.id] ?? []
                    if (q && sectionSnips.length === 0) return null
                    const isCollapsed = sectionCollapsed[section.id] ?? false
                    const isDragOver = dragOverSectionId === section.id && !isSectionDragging
                    const isRenaming = renamingSectionId === section.id

                    return (
                      <div
                        key={section.id}
                        style={{ opacity: isDraggedItem ? 0.4 : 1 }}
                        onDragOver={(e) => {
                          if (!e.dataTransfer.types.includes('application/section-id')) return
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                          const rect = e.currentTarget.getBoundingClientRect()
                          setSectionDropIndex(e.clientY < rect.top + rect.height / 2 ? index : index + 1)
                        }}
                        onDrop={(e) => {
                          if (!e.dataTransfer.types.includes('application/section-id')) return
                          e.preventDefault()
                          const draggedId = e.dataTransfer.getData('application/section-id')
                          handleSectionReorder(draggedId, sectionDropIndex ?? orderedSectionDisplay.length)
                          setSectionDropIndex(null)
                          setDraggingSectionId(null)
                        }}
                      >
                        <div
                          className={`group flex items-center gap-1.5 mb-2.5 py-1 px-2 -mx-2 rounded-lg transition-colors ${
                            isDragOver ? 'bg-accent/10 outline outline-1 outline-accent/30' : ''
                          }`}
                          onDragOver={(e) => {
                            if (e.dataTransfer.types.includes('text/plain')) handleSectionDragOver(e, section.id)
                          }}
                          onDragLeave={() => {
                            if (!isSectionDragging) setDragOverSectionId(null)
                          }}
                          onDrop={(e) => {
                            if (!e.dataTransfer.types.includes('application/section-id')) {
                              handleSectionDrop(e, section.id, section.name)
                              e.stopPropagation()
                            }
                          }}
                        >
                          <button
                            onClick={() => setSectionCollapsed((p) => ({ ...p, [section.id]: !isCollapsed }))}
                            className="flex-shrink-0"
                          >
                            <svg
                              className={`w-3 h-3 text-muted transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          {isRenaming ? (
                            <input
                              autoFocus
                              value={renameSectionValue}
                              onChange={(e) => setRenameSectionValue(e.target.value)}
                              onBlur={() => commitSectionRename(section.id, renameSectionValue, false)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur()
                                if (e.key === 'Escape') { cancelSectionRename(section.id); e.preventDefault() }
                              }}
                              placeholder="Section name…"
                              className="flex-1 text-xs font-semibold text-fg bg-transparent border-0 border-b border-accent outline-none min-w-0 placeholder:text-muted/60"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-fg-2">{section.name}</span>
                          )}
                          <span className="text-[10px] text-muted tabular-nums">{sectionSnips.length}</span>
                        </div>
                        {!(isAddingSection && renamingSectionId === section.id) && (
                          <div style={{ display: 'grid', gridTemplateRows: isCollapsed ? '0fr' : '1fr', transition: 'grid-template-rows 220ms ease' }}>
                            <div style={{ overflow: 'hidden' }}>{renderSectionGrid(sectionSnips, section.id)}</div>
                          </div>
                        )}
                        {renderDropLine(index + 1)}
                      </div>
                    )
                  })}

                  {/* Fallback: render unsectioned snips when General heading is disabled */}

                  {/* Quick-add section divider */}
                  {!isAddingSection && (
                    <button onClick={addSection} className="group flex items-center w-full gap-2 py-3">
                      <span className="flex-1 h-px bg-border group-hover:bg-accent/40 transition-colors duration-150" />
                      <span className="flex items-center gap-1.5 border border-border group-hover:border-accent/40 bg-surface rounded-md px-2.5 py-0.5 flex-shrink-0 text-[11px] font-semibold text-muted group-hover:text-accent transition-colors duration-150">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        New Section
                      </span>
                      <span className="flex-1 h-px bg-border group-hover:bg-accent/40 transition-colors duration-150" />
                    </button>
                  )}
                </div>
              )
            })()
          ) : displaySnips.length === 0 ? (
            <EmptyState
              onAdd={onAdd}
              isSearching={!!q}
              isFiltering={hasFilters && !q}
              onClearFilters={clearFilters}
              tagName={!q && !hasFilters && !starFilter && selectedTag ? selectedTag.name : undefined}
            />
          ) : starFilter ? (
            <div className={`flex-1 overflow-y-auto p-4 h-full ${contentPad}`}>
              {starredSnips.length === 0 ? (
                /* ── Nothing starred: banner + all snips ── */
                <>
                  <div className="flex items-center gap-3 mb-4 px-3.5 py-2.5 rounded-xl bg-accent/8 border border-accent/20">
                    <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-accent">Nothing starred yet</p>
                      <p className="text-[11px] text-muted leading-relaxed">Star a snip to have it show up here separately.</p>
                    </div>
                  </div>
                  <div
                    className={state.viewMode === 'grid' ? 'grid gap-3' : 'flex flex-col gap-2'}
                    style={state.viewMode === 'grid' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' } : undefined}
                  >
                    {unstarredSnips.map((snip) => (
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
                </>
              ) : (
                /* ── Has starred items: two collapsible sections ── */
                <div className="space-y-4">
                  {/* Starred section */}
                  <div>
                    <button
                      onClick={() => setStarSectionOpen((v) => !v)}
                      className="flex items-center gap-2 mb-2.5 group w-full text-left"
                    >
                      <svg
                        className={`w-3 h-3 text-muted transition-transform duration-150 ${starSectionOpen ? 'rotate-90' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                      <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span className="text-xs font-semibold text-fg-2 group-hover:text-fg transition-colors">Starred</span>
                      <span className="text-[10px] text-muted tabular-nums">{starredSnips.length}</span>
                    </button>
                    {starSectionOpen && (
                      <div
                        className={state.viewMode === 'grid' ? 'grid gap-3' : 'flex flex-col gap-2'}
                        style={state.viewMode === 'grid' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' } : undefined}
                      >
                        {starredSnips.map((snip) => (
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
                    )}
                  </div>

                  {unstarredSnips.length > 0 && (
                    <>
                      <div className="border-t border-border" />
                      {/* Not starred section */}
                      <div>
                        <button
                          onClick={() => setUnstarSectionOpen((v) => !v)}
                          className="flex items-center gap-2 mb-2.5 group w-full text-left"
                        >
                          <svg
                            className={`w-3 h-3 text-muted transition-transform duration-150 ${unstarSectionOpen ? 'rotate-90' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                          <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="text-xs font-semibold text-fg-2 group-hover:text-fg transition-colors">Not Starred</span>
                          <span className="text-[10px] text-muted tabular-nums">{unstarredSnips.length}</span>
                        </button>
                        {unstarSectionOpen && (
                          <div
                            className={state.viewMode === 'grid' ? 'grid gap-3' : 'flex flex-col gap-2'}
                            style={state.viewMode === 'grid' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' } : undefined}
                          >
                            {unstarredSnips.map((snip) => (
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
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── Normal flat view ── */
            <div
              className={`flex-1 overflow-y-auto p-4 h-full ${contentPad}`}
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

        {/* ── Floating toolbar ── */}
        <div className={tbWrapperClass}>
          <div className={tbPillClass}>
            {/* Filter */}
            <div ref={filterRef}>
              <button
                onClick={() => {
                  if (!filterOpen && filterRef.current) {
                    setFilterPos(tbDropdownPos(filterRef.current.getBoundingClientRect()))
                  }
                  setFilterOpen((v) => !v)
                }}
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
            </div>
            {filterOpen && filterPos && (
              <div
                ref={filterDropdownRef}
                style={filterPos}
                className="w-56 bg-panel border border-border rounded-xl shadow-xl z-[200] animate-pop overflow-hidden"
              >
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

            {/* Star filter */}
            <button
              onClick={() => setStarFilter((v) => !v)}
              title={starFilter ? 'Show all snips' : 'Show starred only'}
              className={`p-1.5 rounded-md transition-colors ${
                starFilter ? 'text-amber-400 bg-amber-400/15' : 'text-muted hover:text-fg hover:bg-fg/8'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill={starFilter ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={starFilter ? 0 : 2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>

            <div className={tbDividerClass} />

            {/* Sort */}
            <div ref={sortRef}>
              <button
                onClick={() => {
                  if (!sortOpen && sortRef.current) {
                    setSortPos(tbDropdownPos(sortRef.current.getBoundingClientRect()))
                  }
                  setSortOpen((v) => !v)
                }}
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
            </div>
            {sortOpen && sortPos && (
              <div
                ref={sortDropdownRef}
                style={sortPos}
                className="w-40 bg-panel border border-border rounded-xl shadow-xl py-1.5 z-[200] animate-pop"
              >
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

            <div className={tbDividerClass} />

            {/* Expand-all toggle */}
            <button
              onClick={() => setExpandAll((x) => !x)}
              title={expandAll ? 'Collapse cards' : 'Expand all cards'}
              className={`p-1.5 rounded-md transition-colors ${
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
            <div className={`${tbVertical ? 'flex flex-col' : 'flex flex-row'} items-center bg-fg/6 rounded-lg p-0.5`}>
              <button
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: { mode: 'grid' } })}
                className={`p-1.5 rounded-md transition-colors ${state.viewMode === 'grid' ? 'bg-panel text-fg shadow-sm' : 'text-muted hover:text-fg-2'}`}
                title="Grid view"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: { mode: 'list' } })}
                className={`p-1.5 rounded-md transition-colors ${state.viewMode === 'list' ? 'bg-panel text-fg shadow-sm' : 'text-muted hover:text-fg-2'}`}
                title="List view"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            <div className={tbDividerClass} />

            {/* Multi-select */}
            <button
              onClick={() => { if (isSelectionMode) requestExitSelectionMode(); else setIsSelectionMode(true) }}
              title={isSelectionMode ? 'Exit selection mode' : 'Select multiple snips'}
              className={`p-1.5 rounded-md transition-colors ${
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

            {/* Section controls — only when a specific folder is selected */}
            {currentFolder && !isUnfiled && !state.selectedTagId && (
              <>
                <div className={tbDividerClass} />
                {hasSections && (
                  <button
                    onClick={toggleAllSections}
                    title={allSectionsCollapsed ? 'Expand all sections' : 'Collapse all sections'}
                    className="p-1.5 rounded-md transition-colors text-muted hover:text-fg hover:bg-fg/8"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {allSectionsCollapsed ? (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 18l4 4 4-4" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22v-8" />
                        </>
                      ) : (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 22l4-4 4 4" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18v-4" />
                        </>
                      )}
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => { setNewSectionInput(''); setOrgRenamingId(null); setSectionOrganizerOpen(true) }}
                  title="Organize sections"
                  className={`p-1.5 rounded-md transition-colors ${sectionOrganizerOpen ? 'text-accent bg-accent/10' : 'text-muted hover:text-fg hover:bg-fg/8'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h12M9 12h12M9 19h12" />
                    <circle cx="5" cy="5" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* ── Tips footer ── */}
      <TipsFooter visible={state.tipsEnabled} />

      {/* ── Delete section confirm ── */}
      {deletingSectionId && (() => {
        const section = state.sections.find((s) => s.id === deletingSectionId)
        const sectionName = section?.name ?? 'this section'
        const snipCount = state.snips.filter((s) => s.sectionId === deletingSectionId).length
        const folder = section ? state.folders.find((f) => f.id === section.folderId) : null
        const defaultName = folder?.defaultSectionName ?? 'General'
        return (
          <Modal open={true} onClose={() => setDeletingSectionId(null)} title="Delete section?">
            <p className="text-xs text-muted mb-5">
              <span className="font-semibold text-fg">"{sectionName}"</span> will be moved to Trash.
              {snipCount > 0 && (
                <> The <span className="font-semibold text-fg">{snipCount} snip{snipCount !== 1 ? 's' : ''}</span> inside will fall back to <span className="font-semibold text-fg">{defaultName}</span> — they stay in the folder and can be reassigned.</>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeletingSectionId(null)}>Cancel</Button>
              <button
                onClick={() => {
                  dispatch({ type: 'DELETE_SECTION', payload: { sectionId: deletingSectionId } })
                  setDeletingSectionId(null)
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Delete Section
              </button>
            </div>
          </Modal>
        )
      })()}

      {/* ── Section Organizer modal ── */}
      <Modal
        open={sectionOrganizerOpen}
        onClose={() => { setSectionOrganizerOpen(false); setOrgRenamingId(null); setOrgDraggingId(null); setOrgDropIndex(null); setOrgConfirmDeleteId(null) }}
        title="Organize Sections"
      >
        {currentFolder && (
          <>
            <div className="space-y-0.5 mb-4 min-h-[40px]">
              {orderedSectionDisplay.length === 0 ? (
                <p className="text-xs text-muted py-2">No sections yet. Add one below.</p>
              ) : (
                <>
                  {orgDropIndex === 0 && <div className="h-0.5 rounded-full bg-accent mx-1 my-1 pointer-events-none" />}
                  {orderedSectionDisplay.map((item, index) => {
                    const isGeneral = item.kind === 'general'
                    const name = isGeneral ? (currentFolder.defaultSectionName ?? 'General') : item.section.name
                    const isRenaming = orgRenamingId === item.id
                    const isDragging = orgDraggingId === item.id
                    const isConfirmingDelete = orgConfirmDeleteId === item.id
                    const validSectionIdsOrg = new Set(folderSections.map((s) => s.id))
                    const snipCount = isGeneral
                      ? displaySnips.filter((s) => !s.sectionId || !validSectionIdsOrg.has(s.sectionId)).length
                      : displaySnips.filter((s) => s.sectionId === item.id).length

                    return (
                      <div key={item.id}>
                        <div
                          onDragOver={(e) => {
                            if (!e.dataTransfer.types.includes('application/org-section-id')) return
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            const rect = e.currentTarget.getBoundingClientRect()
                            setOrgDropIndex(e.clientY < rect.top + rect.height / 2 ? index : index + 1)
                          }}
                          onDrop={(e) => {
                            if (!e.dataTransfer.types.includes('application/org-section-id')) return
                            e.preventDefault()
                            const draggedId = e.dataTransfer.getData('application/org-section-id')
                            handleSectionReorder(draggedId, orgDropIndex ?? orderedSectionDisplay.length)
                            setOrgDraggingId(null)
                            setOrgDropIndex(null)
                          }}
                          style={{ opacity: isDragging ? 0.4 : 1 }}
                          className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-fg/5 group"
                        >
                          {isConfirmingDelete ? (
                            /* ── Inline delete confirm ── */
                            <>
                              <span className="flex-1 text-xs text-fg">
                                Delete <span className="font-semibold">"{name}"</span>?
                                {snipCount > 0 && <span className="text-muted"> ({snipCount} snip{snipCount !== 1 ? 's' : ''} → General)</span>}
                              </span>
                              <button
                                onClick={() => setOrgConfirmDeleteId(null)}
                                className="px-2 py-0.5 rounded-md text-xs text-fg-2 hover:text-fg hover:bg-fg/8 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  dispatch({ type: 'DELETE_SECTION', payload: { sectionId: item.id } })
                                  setOrgConfirmDeleteId(null)
                                }}
                                className="px-2 py-0.5 rounded-md text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            /* ── Normal row ── */
                            <>
                              {/* Name + count badge */}
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                {isRenaming ? (
                                  <input
                                    autoFocus
                                    value={orgRenameValue}
                                    onChange={(e) => setOrgRenameValue(e.target.value)}
                                    onBlur={() => {
                                      const trimmed = orgRenameValue.trim()
                                      if (trimmed) {
                                        if (isGeneral) {
                                          dispatch({ type: 'RENAME_DEFAULT_SECTION', payload: { folderId: currentFolder.id, name: trimmed } })
                                        } else {
                                          dispatch({ type: 'RENAME_SECTION', payload: { sectionId: item.id, name: trimmed } })
                                        }
                                      }
                                      setOrgRenamingId(null)
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') e.currentTarget.blur()
                                      if (e.key === 'Escape') { setOrgRenamingId(null); e.preventDefault() }
                                    }}
                                    className="flex-1 text-xs font-medium text-fg bg-transparent border-0 border-b border-accent outline-none min-w-0"
                                  />
                                ) : (
                                  <span className="text-xs font-medium text-fg truncate">{name}</span>
                                )}
                                <span className="text-[10px] text-muted bg-fg/8 rounded px-1.5 py-0.5 tabular-nums flex-shrink-0">{snipCount}</span>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => { setOrgRenamingId(item.id); setOrgRenameValue(name) }}
                                  className="p-1 rounded text-muted hover:text-fg-2 hover:bg-fg/8 transition-colors"
                                  title="Rename section"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z" />
                                  </svg>
                                </button>
                                {!isGeneral && (
                                  <button
                                    onClick={() => setOrgConfirmDeleteId(item.id)}
                                    className="p-1 rounded text-muted hover:text-red-500 hover:bg-red-500/8 transition-colors"
                                    title="Delete section"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
                                    </svg>
                                  </button>
                                )}
                                {/* Drag handle — rightmost */}
                                <span
                                  draggable
                                  onDragStart={(e) => {
                                    setOrgDraggingId(item.id)
                                    e.dataTransfer.setData('application/org-section-id', item.id)
                                    e.dataTransfer.effectAllowed = 'move'
                                  }}
                                  onDragEnd={() => { setOrgDraggingId(null); setOrgDropIndex(null) }}
                                  className="p-1 cursor-grab active:cursor-grabbing text-muted hover:text-fg-2 transition-colors"
                                  title="Drag to reorder"
                                >
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                                    <circle cx="5" cy="4" r="1.2" /><circle cx="11" cy="4" r="1.2" />
                                    <circle cx="5" cy="8" r="1.2" /><circle cx="11" cy="8" r="1.2" />
                                    <circle cx="5" cy="12" r="1.2" /><circle cx="11" cy="12" r="1.2" />
                                  </svg>
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        {orgDraggingId && orgDropIndex === index + 1 && (
                          <div className="h-0.5 rounded-full bg-accent mx-1 my-1 pointer-events-none" />
                        )}
                      </div>
                    )
                  })}
                </>
              )}
            </div>

            {/* Add new section */}
            <div className="border-t border-border pt-3">
              <div className="flex gap-2">
                <input
                  value={newSectionInput}
                  onChange={(e) => setNewSectionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSectionInput.trim()) {
                      dispatch({ type: 'ADD_SECTION', payload: { id: generateId(), folderId: currentFolder.id, name: newSectionInput.trim() } })
                      setNewSectionInput('')
                    }
                  }}
                  placeholder="New section name…"
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-fg placeholder-muted focus:outline-none focus:border-accent transition-colors"
                />
                <Button
                  onClick={() => {
                    if (!newSectionInput.trim()) return
                    dispatch({ type: 'ADD_SECTION', payload: { id: generateId(), folderId: currentFolder.id, name: newSectionInput.trim() } })
                    setNewSectionInput('')
                  }}
                  disabled={!newSectionInput.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* ── Bulk Move modal ── */}
      <Modal
        open={bulkModal === 'move'}
        onClose={() => { setBulkModal(null); setBulkMoveStep('folder'); setBulkMoveFolderTarget(null) }}
        title={bulkMoveStep === 'folder' ? 'Move to folder' : `Sections in "${bulkMoveFolderTarget?.name}"`}
      >
        {bulkMoveStep === 'folder' ? (
          <>
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
                  {filtered.map(({ folder, depth }) => {
                    const hasSubSections = state.sections.some((s) => s.folderId === folder.id)
                    return (
                      <button
                        key={folder.id}
                        onClick={() => {
                          if (hasSubSections) {
                            setBulkMoveFolderTarget({ id: folder.id, name: folder.name })
                            setBulkMoveStep('section')
                          } else {
                            for (const id of selectedSnipIds) {
                              dispatch({ type: 'MOVE_SNIP', payload: { id, folderId: folder.id } })
                              dispatch({ type: 'SET_SNIP_SECTION', payload: { snipId: id, sectionId: null } })
                            }
                            exitSelectionMode()
                          }
                        }}
                        style={{ paddingLeft: `${8 + depth * 12}px` }}
                        className="w-full text-left flex items-center gap-2 pr-3 py-1.5 rounded-lg text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 flex-shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        </svg>
                        <span className="flex-1 truncate">{folder.name}</span>
                        {hasSubSections && (
                          <svg className="w-3 h-3 flex-shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })()}
          </>
        ) : bulkMoveFolderTarget ? (
          <>
            <button
              onClick={() => { setBulkMoveStep('folder'); setBulkMoveFolderTarget(null) }}
              className="flex items-center gap-1.5 text-xs text-fg-2 hover:text-fg mb-3 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to folders
            </button>
            {(() => {
              const targetSections = state.sections
                .filter((s) => s.folderId === bulkMoveFolderTarget.id)
                .sort((a, b) => a.order - b.order)
              const folder = state.folders.find((f) => f.id === bulkMoveFolderTarget.id)
              const defaultName = folder?.defaultSectionName ?? 'General'
              const options: Array<{ id: string | null; name: string }> = [
                { id: null, name: defaultName },
                ...targetSections.map((s) => ({ id: s.id, name: s.name })),
              ]
              return (
                <div className="max-h-52 overflow-y-auto -mx-1">
                  {options.map((opt) => (
                    <button
                      key={opt.id ?? '__general__'}
                      onClick={() => {
                        for (const id of selectedSnipIds) {
                          dispatch({ type: 'MOVE_SNIP', payload: { id, folderId: bulkMoveFolderTarget.id } })
                          dispatch({ type: 'SET_SNIP_SECTION', payload: { snipId: id, sectionId: opt.id } })
                        }
                        exitSelectionMode()
                      }}
                      className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      <span className="truncate">{opt.name}</span>
                    </button>
                  ))}
                </div>
              )
            })()}
          </>
        ) : null}
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
        onClose={() => { setPendingBulkDrop(null); setPendingMoveSection(null) }}
        title={
          pendingBulkDrop?.type === 'move'    ? 'Move snips?' :
          pendingBulkDrop?.type === 'tag'     ? 'Assign tag?' :
          pendingBulkDrop?.type === 'section' ? 'Move to section?' :
          'Move to Trash?'
        }
      >
        {pendingBulkDrop?.type === 'move' && (
          <>
            <p className="text-xs text-muted mb-3">
              Move <span className="font-semibold text-fg">{pendingBulkDrop.snipIds.length} snip{pendingBulkDrop.snipIds.length !== 1 ? 's' : ''}</span> to <span className="font-semibold text-fg">"{pendingBulkDrop.folderName}"</span>?
            </p>
            {(() => {
              const dropSections = state.sections
                .filter((s) => s.folderId === pendingBulkDrop.folderId)
                .sort((a, b) => a.order - b.order)
              if (dropSections.length === 0) return null
              const folder = state.folders.find((f) => f.id === pendingBulkDrop.folderId)
              const defaultName = folder?.defaultSectionName ?? 'General'
              return (
                <div className="mb-4">
                  <label className="block text-[10px] font-semibold tracking-wide uppercase text-muted mb-1.5">Section</label>
                  <select
                    value={pendingMoveSection ?? ''}
                    onChange={(e) => setPendingMoveSection(e.target.value || null)}
                    className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:outline-none focus:border-accent transition-colors"
                  >
                    <option value="">{defaultName}</option>
                    {dropSections.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )
            })()}
          </>
        )}
        {pendingBulkDrop?.type === 'tag' && (
          <div className="flex items-center gap-2 mb-5 text-xs text-muted">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pendingBulkDrop.tagColor }} />
            Add tag <span className="font-semibold text-fg">"{pendingBulkDrop.tagName}"</span> to <span className="font-semibold text-fg">{pendingBulkDrop.snipIds.length} snip{pendingBulkDrop.snipIds.length !== 1 ? 's' : ''}</span>?
          </div>
        )}
        {pendingBulkDrop?.type === 'section' && (
          <p className="text-xs text-muted mb-5">
            Move <span className="font-semibold text-fg">{pendingBulkDrop.snipIds.length} snip{pendingBulkDrop.snipIds.length !== 1 ? 's' : ''}</span> to section <span className="font-semibold text-fg">"{pendingBulkDrop.sectionName}"</span>?
          </p>
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
                const hasSections = state.sections.some((s) => s.folderId === pendingBulkDrop.folderId)
                for (const id of pendingBulkDrop.snipIds) {
                  dispatch({ type: 'MOVE_SNIP', payload: { id, folderId: pendingBulkDrop.folderId } })
                  if (hasSections) dispatch({ type: 'SET_SNIP_SECTION', payload: { snipId: id, sectionId: pendingMoveSection } })
                }
              } else if (pendingBulkDrop.type === 'tag') {
                for (const snipId of pendingBulkDrop.snipIds) {
                  const snip = state.snips.find((s) => s.id === snipId)
                  if (!snip) continue
                  const next = [...new Set([...(snip.tagIds ?? []), pendingBulkDrop.tagId])]
                  dispatch({ type: 'SET_SNIP_TAGS', payload: { snipId, tagIds: next } })
                }
              } else if (pendingBulkDrop.type === 'section') {
                for (const snipId of pendingBulkDrop.snipIds)
                  dispatch({ type: 'SET_SNIP_SECTION', payload: { snipId, sectionId: pendingBulkDrop.sectionId } })
              }
              exitSelectionMode()
            }}>
              {pendingBulkDrop?.type === 'move' ? 'Move' : pendingBulkDrop?.type === 'section' ? 'Move' : 'Add Tag'}
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
