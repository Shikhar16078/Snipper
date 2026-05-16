import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../store/AppContext'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { Modal } from '../modals/Modal'
import { Button } from '../ui/Button'
import { Settings } from '../ui/Settings'
import { extractLinks, getLinkTitle } from '../../utils/links'
import type { TrashedSnip, TrashedFolder, TrashedSection } from '../../types'

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatPurgeDue(deletedAt: number, purgeMs: number | null): { label: string; urgent: boolean } | null {
  if (purgeMs === null) return null
  const remaining = deletedAt + purgeMs - Date.now()
  if (remaining <= 0) return { label: 'Deleting soon', urgent: true }
  const mins = Math.ceil(remaining / 60_000)
  if (mins < 60) return { label: `${mins}m left`, urgent: true }
  const hrs = Math.ceil(remaining / 3_600_000)
  if (hrs < 24) return { label: `${hrs}h left`, urgent: true }
  const days = Math.ceil(remaining / 86_400_000)
  return { label: `${days}d left`, urgent: false }
}

interface TrashViewProps {
  collapsed: boolean
  onToggleSidebar: () => void
  onOpenHelp: () => void
  onOpenImport?: () => void
  onOpenExport?: () => void
}

const recoverButtonClasses =
  'text-white border-emerald-600/35 bg-emerald-500 hover:bg-emerald-600 hover:border-emerald-600/50 dark:text-emerald-400 dark:border-emerald-400/35 dark:bg-transparent dark:hover:bg-emerald-400/10 dark:hover:border-emerald-400/60'
const deleteButtonClasses =
  'text-white border-red-600/35 bg-red-500 hover:bg-red-600 hover:border-red-600/50 dark:text-red-500 dark:border-red-500/35 dark:bg-transparent dark:hover:bg-red-500/10 dark:hover:border-red-500/60'

export function TrashView({ collapsed, onToggleSidebar, onOpenHelp, onOpenImport, onOpenExport }: TrashViewProps) {
  const { state, dispatch } = useApp()
  const [expandAll, setExpandAll] = useState(false)
  const [search, setSearch] = useState('')
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false)
  const [confirmRecoverAll, setConfirmRecoverAll] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const isMac = (window as any).api?.platform === 'darwin'

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

  const q = search.trim().toLowerCase()
  const visibleItems = q
    ? state.trash.filter((item) => {
        if (item.type === 'snip') return item.snip.name.toLowerCase().includes(q) || item.snip.body.toLowerCase().includes(q)
        if (item.type === 'section') return item.section.name.toLowerCase().includes(q)
        return item.folders[0]?.name.toLowerCase().includes(q)
      })
    : state.trash

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface">
      {/* Navbar — mirrors SnipGrid */}
      <div
        className={`flex items-center gap-2 pr-4 border-b border-border flex-shrink-0 transition-[padding] duration-200 ${
          isMac
            ? `drag-region select-none h-[40px] ${collapsed ? 'pl-[80px]' : 'pl-4'}`
            : 'py-2.5 pl-4'
        }`}
      >
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

        {/* Title badge */}
        <div className="flex items-center gap-1.5 bg-panel border border-border shadow-sm rounded-lg px-2.5 h-[26px] mr-1">
          <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
          </svg>
          <h2 className="text-xs font-bold text-fg tracking-wide whitespace-nowrap">Trash</h2>
        </div>

        {visibleItems.length > 0 && !q && (
          <span className="flex items-center justify-center min-w-[26px] h-[26px] text-[10px] font-bold text-muted bg-panel border border-border px-1.5 rounded-md shadow-sm tabular-nums">
            {visibleItems.length}
          </span>
        )}
        {q && (
          <span className="flex items-center justify-center h-[26px] text-[10px] font-bold text-accent bg-accent/8 border border-accent/20 px-2 rounded-md shadow-sm tabular-nums">
            {visibleItems.length} result{visibleItems.length !== 1 ? 's' : ''}
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
              placeholder="Search trash…"
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
          className={`p-1.5 rounded-md transition-colors app-no-drag ${expandAll ? 'text-accent bg-accent/10' : 'text-muted hover:text-fg hover:bg-fg/8'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={expandAll ? 'M5 15l7-7 7 7' : 'M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5'} />
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

        {/* Recover All */}
        {state.trash.length > 0 && (
          <button
            onClick={() => setConfirmRecoverAll(true)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors app-no-drag ${recoverButtonClasses}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Recover All
          </button>
        )}

        {/* Empty Trash */}
        {state.trash.length > 0 && (
          <button
            onClick={() => setConfirmEmptyTrash(true)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors app-no-drag ${deleteButtonClasses}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
            </svg>
            Empty Trash
          </button>
        )}

        {/* Settings */}
        <Settings onOpenHelp={onOpenHelp} onOpenImport={onOpenImport} onOpenExport={onOpenExport} />
      </div>

      {/* Cards */}
      {state.trash.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-8 select-none">
          <div className="w-12 h-12 rounded-2xl bg-panel border border-border flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
            </svg>
          </div>
          <p className="text-sm font-medium text-fg mb-1">Trash is empty</p>
          <p className="text-xs text-muted">Deleted snips and folders appear here</p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-8 select-none">
          <p className="text-sm font-medium text-fg mb-1">No results</p>
          <p className="text-xs text-muted">Try a different search term</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className={state.viewMode === 'grid' ? 'grid grid-cols-2 xl:grid-cols-3 gap-3' : 'flex flex-col gap-2'}>
            {visibleItems.map((item) =>
              item.type === 'snip'
                ? <TrashedSnipCard key={item.id} item={item} expanded={expandAll} />
                : item.type === 'section'
                  ? <TrashedSectionCard key={item.id} item={item} />
                  : <TrashedFolderCard key={item.id} item={item} />
            )}
          </div>
        </div>
      )}

      {/* Recover All confirm */}
      <Modal open={confirmRecoverAll} onClose={() => setConfirmRecoverAll(false)} title="Recover All?">
        <p className="text-xs text-muted mb-5">
          All <span className="font-semibold text-fg">{state.trash.length} item{state.trash.length !== 1 ? 's' : ''}</span> will be restored to their original locations.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmRecoverAll(false)}>Cancel</Button>
          <button
            onClick={() => { dispatch({ type: 'RESTORE_ALL_TRASH' }); setConfirmRecoverAll(false) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${recoverButtonClasses}`}
          >
            Recover All
          </button>
        </div>
      </Modal>

      {/* Empty Trash confirm */}
      <Modal open={confirmEmptyTrash} onClose={() => setConfirmEmptyTrash(false)} title="Empty Trash?">
        <p className="text-xs text-muted mb-5">
          All <span className="font-semibold text-fg">{state.trash.length} item{state.trash.length !== 1 ? 's' : ''}</span> will be permanently deleted. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmEmptyTrash(false)}>Cancel</Button>
          <button
            onClick={() => { dispatch({ type: 'EMPTY_TRASH' }); setConfirmEmptyTrash(false) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${deleteButtonClasses}`}
          >
            Empty Trash
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── Trashed Snip Card ────────────────────────────────────────────────────────

function TrashedSnipCard({ item, expanded }: { item: TrashedSnip; expanded: boolean }) {
  const { state, dispatch } = useApp()
  const purgeDue = formatPurgeDue(item.deletedAt, state.trashAutoPurge)
  const { copy, copied } = useCopyToClipboard(1500)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [linksOpen, setLinksOpen] = useState(false)
  const linksRef = useRef<HTMLDivElement>(null)
  const links = extractLinks(item.snip.body)

  function restoreDestination() {
    if (!item.snip.folderId) return state.allSnipsLabel || 'All Snips'
    const folder = state.folders.find((f) => f.id === item.snip.folderId)
    return folder ? folder.name : (state.allSnipsLabel || 'All Snips')
  }

  useEffect(() => {
    if (!linksOpen) return
    function onOutside(e: MouseEvent) {
      if (linksRef.current && !linksRef.current.contains(e.target as Node)) setLinksOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [linksOpen])

  return (
    <>
      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return
          if (linksRef.current?.contains(e.target as Node)) return
          copy(item.snip.body)
        }}
        className={`relative group select-none rounded-xl border transition-all duration-500 ease-in-out cursor-pointer flex flex-col
          ${linksOpen ? 'z-20' : ''}
          ${copied
            ? 'border-green-500/50 bg-green-500/5 ring-1 ring-green-500/20'
            : 'border-border bg-panel hover:border-fg/25 hover:shadow-md'
          }`}
      >
        {/* Copied overlay */}
        <div className={`absolute inset-0 flex items-center justify-center rounded-xl z-10 pointer-events-none transition-all duration-500 ease-in-out ${copied ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-500/12 px-3 py-1.5 rounded-full border border-green-500/25 shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Copied
          </span>
        </div>

        <div className="p-3 flex flex-col flex-1">
          <div className={`flex flex-col flex-1 transition-[filter,opacity] duration-500 ease-in-out ${copied ? 'blur-[4px] opacity-20' : ''}`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <h3 className="text-sm font-semibold leading-snug text-fg truncate">{item.snip.name}</h3>
              <span className="flex-shrink-0 text-[10px] font-medium text-fg/60 border border-fg/40 bg-fg/12 dark:text-fg/30 dark:border-fg/30 dark:bg-fg/8 rounded-md px-1.5 py-0.5 -mt-0.5">{timeAgo(item.deletedAt)}</span>
            </div>

            {/* Body */}
            <p className={`text-xs font-mono leading-relaxed break-words whitespace-pre-wrap text-muted ${expanded ? '' : 'line-clamp-3'}`}>
              {item.snip.body}
            </p>

            {/* Footer row: purge label + Links + Recover + Delete */}
            <div className="mt-auto pt-2.5 border-t border-border/60 flex items-center gap-1.5">
              {purgeDue && (
                <span className={`text-[10px] font-medium border rounded-md px-1.5 py-0.5 ${
                  purgeDue.urgent
                    ? 'text-red-400 border-red-400/40 bg-red-400/5'
                    : 'text-orange-400 border-orange-400/40 bg-orange-400/5'
                }`}>
                  {purgeDue.label}
                </span>
              )}
              {links.length > 0 && (
                links.length === 1 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const url = links[0]
                      if ((window as any).api?.openUrl) (window as any).api.openUrl(url)
                      else window.open(url, '_blank', 'noopener,noreferrer')
                    }}
                    className="flex items-center gap-1 text-[11px] font-medium text-accent border border-accent/30 hover:border-accent/60 hover:bg-accent/8 px-2 py-1 rounded-lg transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Visit
                  </button>
                ) : (
                  <div ref={linksRef} className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setLinksOpen((v) => !v)}
                      className="flex items-center gap-1 text-[11px] font-medium text-accent border border-accent/30 hover:border-accent/60 hover:bg-accent/8 px-2 py-1 rounded-lg transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 11-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 115.656 5.656l-1.5 1.5" />
                      </svg>
                      Links ({links.length})
                    </button>

                    {linksOpen && (
                      <div className="absolute left-0 top-full mt-1 w-60 max-h-44 overflow-y-auto bg-panel border border-border rounded-xl shadow-xl z-50 p-1.5">
                        {links.map((url) => (
                          <button
                            key={url}
                            onClick={() => {
                              if ((window as any).api?.openUrl) (window as any).api.openUrl(url)
                              else window.open(url, '_blank', 'noopener,noreferrer')
                              setLinksOpen(false)
                            }}
                            className="group w-full text-left px-2.5 py-2 rounded-lg border border-transparent hover:border-accent/35 hover:bg-gradient-to-r hover:from-accent/10 hover:to-accent/5 transition-all duration-150"
                            title={url}
                          >
                            <p className="text-[11px] font-semibold text-fg truncate group-hover:text-accent transition-colors">{getLinkTitle(url, item.snip.linkTitles)}</p>
                            <div className="flex items-center gap-1">
                              <p className="text-[10px] text-muted truncate flex-1">{url}</p>
                              <svg className="w-3 h-3 text-muted group-hover:text-accent opacity-0 group-hover:opacity-100 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 4h6m0 0v6m0-6L10 14" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 14v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h6" />
                              </svg>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}
              <div className="flex-1" />
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmRestore(true) }}
                className={`flex items-center gap-1 text-[11px] font-medium border px-2 py-1 rounded-lg transition-colors ${recoverButtonClasses}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Recover
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
                className={`flex items-center gap-1 text-[11px] font-medium border px-2 py-1 rounded-lg transition-colors ${deleteButtonClasses}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7M3 7h18M9 7V4h6v3" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Restore confirm */}
      <Modal open={confirmRestore} onClose={() => setConfirmRestore(false)} title="Restore snip?">
        <p className="text-xs text-muted mb-5">
          <span className="font-semibold text-fg">{item.snip.name}</span> will be restored to the{' '}
          <span className="font-semibold text-fg-2">{restoreDestination()}</span> folder.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmRestore(false)}>Cancel</Button>
          <button
            onClick={() => { dispatch({ type: 'RESTORE_TRASH_ITEM', payload: { id: item.id } }); setConfirmRestore(false) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${recoverButtonClasses}`}
          >
            Restore
          </button>
        </div>
      </Modal>

      {/* Delete forever confirm */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Permanently delete?">
        <p className="text-xs text-muted mb-5">
          <span className="font-semibold text-fg">{item.snip.name}</span> will be permanently deleted. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <button
            onClick={() => { dispatch({ type: 'PERMANENTLY_DELETE_TRASH_ITEM', payload: { id: item.id } }); setConfirmDelete(false) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${deleteButtonClasses}`}
          >
            Delete Forever
          </button>
        </div>
      </Modal>
    </>
  )
}

// ── Trashed Section Card ─────────────────────────────────────────────────────

function TrashedSectionCard({ item }: { item: TrashedSection }) {
  const { state, dispatch } = useApp()
  const purgeDue = formatPurgeDue(item.deletedAt, state.trashAutoPurge)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const snipCount = item.snipIds.length
  const folderName = state.folders.find((f) => f.id === item.section.folderId)?.name ?? 'Unknown folder'

  return (
    <>
      <div className="select-none rounded-xl border border-border bg-panel hover:border-fg/25 hover:shadow-md transition-all cursor-default flex flex-col">
        <div className="p-3 flex flex-col flex-1">
          <div className="flex items-center gap-2 min-w-0 mb-2.5">
            <svg className="w-4 h-4 flex-shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <h3 className="text-sm font-semibold leading-snug text-fg truncate flex-1 min-w-0">{item.section.name}</h3>
            <span className="flex-shrink-0 text-[10px] text-muted border border-border rounded-md px-1.5 py-0.5">{timeAgo(item.deletedAt)}</span>
          </div>
          <p className="text-xs text-muted">
            {snipCount > 0 ? `${snipCount} snip${snipCount !== 1 ? 's' : ''}` : 'Empty section'}{' '}
            in <span className="font-medium text-fg-2">{folderName}</span>
          </p>

          <div className="mt-auto pt-2.5 border-t border-border/60 flex items-center gap-1.5">
            {purgeDue && (
              <span className={`text-[10px] font-medium border rounded-md px-1.5 py-0.5 ${
                purgeDue.urgent
                  ? 'text-red-400 border-red-400/40 bg-red-400/5'
                  : 'text-orange-400 border-orange-400/40 bg-orange-400/5'
              }`}>
                {purgeDue.label}
              </span>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setConfirmRestore(true)}
              className={`flex items-center gap-1 text-[11px] font-medium border px-2 py-1 rounded-lg transition-colors ${recoverButtonClasses}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Recover
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className={`flex items-center gap-1 text-[11px] font-medium border px-2 py-1 rounded-lg transition-colors ${deleteButtonClasses}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7M3 7h18M9 7V4h6v3" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      <Modal open={confirmRestore} onClose={() => setConfirmRestore(false)} title="Restore section?">
        <p className="text-xs text-muted mb-5">
          <span className="font-semibold text-fg">{item.section.name}</span> will be restored to{' '}
          <span className="font-semibold text-fg-2">{folderName}</span>
          {snipCount > 0 && <>, and {snipCount} snip{snipCount !== 1 ? 's' : ''} will be re-assigned to it</>}.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmRestore(false)}>Cancel</Button>
          <button
            onClick={() => { dispatch({ type: 'RESTORE_TRASH_ITEM', payload: { id: item.id } }); setConfirmRestore(false) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${recoverButtonClasses}`}
          >
            Restore
          </button>
        </div>
      </Modal>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Permanently delete?">
        <p className="text-xs text-muted mb-5">
          Section <span className="font-semibold text-fg">{item.section.name}</span> will be permanently deleted. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <button
            onClick={() => { dispatch({ type: 'PERMANENTLY_DELETE_TRASH_ITEM', payload: { id: item.id } }); setConfirmDelete(false) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${deleteButtonClasses}`}
          >
            Delete Forever
          </button>
        </div>
      </Modal>
    </>
  )
}

// ── Trashed Folder Card ──────────────────────────────────────────────────────

function TrashedFolderCard({ item }: { item: TrashedFolder }) {
  const { state, dispatch } = useApp()
  const purgeDue = formatPurgeDue(item.deletedAt, state.trashAutoPurge)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const rootFolder = item.folders.find((f) => f.id === item.id)
  const name = rootFolder?.name ?? 'Unknown folder'
  const subfolderCount = item.folders.length - 1
  const snipCount = item.snips.length

  const subtitleParts: string[] = []
  if (snipCount > 0) subtitleParts.push(`${snipCount} snip${snipCount !== 1 ? 's' : ''}`)
  if (subfolderCount > 0) subtitleParts.push(`${subfolderCount} subfolder${subfolderCount !== 1 ? 's' : ''}`)
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(', ') : 'Empty folder'

  function restoreDestination() {
    if (!rootFolder || rootFolder.parentId === null) return 'top level'
    const parent = state.folders.find((f) => f.id === rootFolder.parentId)
    return parent ? parent.name : 'top level'
  }

  return (
    <>
      <div className="select-none rounded-xl border border-border bg-panel hover:border-fg/25 hover:shadow-md transition-all cursor-default flex flex-col">
        <div className="p-3 flex flex-col flex-1">
          <div className="flex items-center gap-2 min-w-0 mb-2.5">
            <svg className="w-4 h-4 flex-shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            <h3 className="text-sm font-semibold leading-snug text-fg truncate flex-1 min-w-0">{name}</h3>
            <span className="flex-shrink-0 text-[10px] text-muted border border-border rounded-md px-1.5 py-0.5">{timeAgo(item.deletedAt)}</span>
          </div>

          <p className="text-xs text-muted">{subtitle}</p>

          {/* Snip name previews */}
          {item.snips.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-border/60 space-y-1">
              {item.snips.slice(0, 3).map((s) => (
                <p key={s.id} className="text-[11px] text-muted truncate">· {s.name}</p>
              ))}
              {item.snips.length > 3 && (
                <p className="text-[11px] text-muted">· and {item.snips.length - 3} more…</p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-auto pt-2.5 border-t border-border/60 flex items-center gap-1.5">
            {purgeDue && (
              <span className={`text-[10px] font-medium ${purgeDue.urgent ? 'text-red-400' : 'text-orange-400'}`}>
                {purgeDue.label}
              </span>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setConfirmRestore(true)}
              className={`flex items-center gap-1 text-[11px] font-medium border px-2 py-1 rounded-lg transition-colors ${recoverButtonClasses}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Recover
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className={`flex items-center gap-1 text-[11px] font-medium border px-2 py-1 rounded-lg transition-colors ${deleteButtonClasses}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7M3 7h18M9 7V4h6v3" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Restore confirm */}
      <Modal open={confirmRestore} onClose={() => setConfirmRestore(false)} title="Restore folder?">
        <p className="text-xs text-muted mb-5">
          <span className="font-semibold text-fg">{name}</span> will be restored to{' '}
          <span className="font-semibold text-fg-2">
            {restoreDestination() === 'top level' ? 'the top level' : restoreDestination()}
          </span>
          {(subfolderCount > 0 || snipCount > 0) && <> along with all its contents</>}.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmRestore(false)}>Cancel</Button>
          <button
            onClick={() => { dispatch({ type: 'RESTORE_TRASH_ITEM', payload: { id: item.id } }); setConfirmRestore(false) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${recoverButtonClasses}`}
          >
            Restore
          </button>
        </div>
      </Modal>

      {/* Delete forever confirm */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Permanently delete?">
        <p className="text-xs text-muted mb-5">
          <span className="font-semibold text-fg">{name}</span> and all its contents will be permanently deleted. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <button
            onClick={() => { dispatch({ type: 'PERMANENTLY_DELETE_TRASH_ITEM', payload: { id: item.id } }); setConfirmDelete(false) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${deleteButtonClasses}`}
          >
            Delete Forever
          </button>
        </div>
      </Modal>
    </>
  )
}
