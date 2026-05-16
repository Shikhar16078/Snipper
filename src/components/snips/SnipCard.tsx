import { useState, useRef, useEffect } from 'react'
import type { Snip } from '../../types'
import { useApp } from '../../store/AppContext'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { useDrag } from '../../context/DragContext'
import { flattenFolders } from '../../utils/folders'
import { extractLinks, getLinkTitle } from '../../utils/links'
import { Modal } from '../modals/Modal'
import { Button } from '../ui/Button'

interface SnipCardProps {
  snip: Snip
  onEdit: (snip: Snip) => void
  expanded: boolean
  selected?: boolean
  isSelectionMode?: boolean
  onToggleSelect?: (id: string) => void
  onBulkContextMenu?: (x: number, y: number) => void
  bulkDragIds?: string[]
}

const HOLD_DURATION = 200

// Module-level tracker so mouse position persists across card remounts
const mousePos = { x: -1, y: -1 }
document.addEventListener('mousemove', (e) => { mousePos.x = e.clientX; mousePos.y = e.clientY }, { passive: true })

export function SnipCard({ snip, onEdit, expanded, selected = false, isSelectionMode = false, onToggleSelect, onBulkContextMenu, bulkDragIds }: SnipCardProps) {
  const { state, dispatch } = useApp()
  const { copy, copied } = useCopyToClipboard(1500)
  const { setDraggingSnipId, setDraggingSnipIds, draggingSnipIds } = useDrag()
  const isInBulkDrag = draggingSnipIds.includes(snip.id)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuView, setMenuView] = useState<'main' | 'move' | 'move-section' | 'tags' | 'section'>('main')
  const [moveFolderTarget, setMoveFolderTarget] = useState<{ id: string; name: string } | null>(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [linksOpen, setLinksOpen] = useState(false)
  const [moveSearch, setMoveSearch] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const [sectionSearch, setSectionSearch] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const kebabRef = useRef<HTMLButtonElement>(null)
  const linksRef = useRef<HTMLDivElement>(null)
  const moveSearchRef = useRef<HTMLInputElement>(null)
  const tagSearchRef = useRef<HTMLInputElement>(null)
  const sectionSearchRef = useRef<HTMLInputElement>(null)
  const holdActive = useRef(false)
  const holdRafRef = useRef<number | null>(null)
  const holdStartTime = useRef(0)
  const holdSuppressClick = useRef(false)
  const links = extractLinks(snip.body)

  useEffect(() => () => { if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current) }, [])

  // On mount, detect if cursor is already over the card (handles remount after editor/trash closes).
  // Delayed past the view-enter animation (320ms) to avoid Chromium cursor flicker during GPU repaint.
  useEffect(() => {
    const id = setTimeout(() => {
      if (mousePos.x < 0 || !cardRef.current) return
      const el = document.elementFromPoint(mousePos.x, mousePos.y)
      if (cardRef.current.contains(el)) setIsHovered(true)
    }, 350)
    return () => clearTimeout(id)
  }, [])

  function handleCopy() {
    copy(snip.body)
    dispatch({ type: 'RECORD_COPY', payload: { id: snip.id } })
  }

  useEffect(() => {
    if (!isHovered) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (menuOpen || deleteConfirmOpen) return
      const key = e.key.toLowerCase()
      if (key === 'e') { e.preventDefault(); onEdit(snip) }
      else if (key === 'c') { e.preventDefault(); handleCopy() }
      else if (key === 's') { e.preventDefault(); dispatch({ type: 'TOGGLE_PIN_SNIP', payload: { id: snip.id } }) }
      else if (key === 't') {
        e.preventDefault()
        const ref = kebabRef.current ?? cardRef.current
        if (ref) {
          const rect = ref.getBoundingClientRect()
          openMenu(rect.right - 176, rect.bottom + 4, 'tags')
        }
      }
      else if (key === 'd') {
        e.preventDefault()
        if (state.deleteConfirmEnabled) setDeleteConfirmOpen(true)
        else dispatch({ type: 'DELETE_SNIP', payload: { id: snip.id } })
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isHovered, menuOpen, deleteConfirmOpen, snip, state.deleteConfirmEnabled, onEdit, copy, dispatch])

  useEffect(() => {
    if (!menuOpen) return
    function onOutside(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node)) return
      if (kebabRef.current?.contains(e.target as Node)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [menuOpen])

  function openMenu(x: number, y: number, initialView: 'main' | 'move' | 'tags' = 'main') {
    const clampedX = Math.min(x, window.innerWidth - 164)
    const clampedY = Math.min(y, window.innerHeight - 220)
    setMenuPos({ x: Math.max(4, clampedX), y: Math.max(4, clampedY) })
    document.dispatchEvent(new CustomEvent('snipper:menu-open', { detail: { snipId: snip.id } }))
    setMenuOpen(true)
    setMenuView(initialView)
  }

  useEffect(() => {
    function onOtherMenu(e: CustomEvent<{ snipId: string }>) {
      if (e.detail.snipId !== snip.id) setMenuOpen(false)
    }
    document.addEventListener('snipper:menu-open', onOtherMenu as EventListener)
    return () => document.removeEventListener('snipper:menu-open', onOtherMenu as EventListener)
  }, [snip.id])

  useEffect(() => {
    if (!menuOpen) { setMenuView('main'); setMoveSearch(''); setTagSearch(''); setMoveFolderTarget(null) }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); setMenuOpen(false) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  useEffect(() => {
    if (!deleteConfirmOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault()
        dispatch({ type: 'DELETE_SNIP', payload: { id: snip.id } })
        setDeleteConfirmOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    // Restore hover when modal closes so keyboard shortcuts still work
    return () => {
      document.removeEventListener('keydown', onKey)
      setIsHovered(true)
    }
  }, [deleteConfirmOpen, snip.id, dispatch])

  useEffect(() => {
    if (!linksOpen) return
    function onOutside(e: MouseEvent) {
      if (linksRef.current && !linksRef.current.contains(e.target as Node)) setLinksOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [linksOpen])

  useEffect(() => {
    if (menuView === 'move') setTimeout(() => moveSearchRef.current?.focus(), 0)
    else setMoveSearch('')
    if (menuView === 'tags') setTimeout(() => tagSearchRef.current?.focus(), 0)
    else setTagSearch('')
    if (menuView === 'section') setTimeout(() => sectionSearchRef.current?.focus(), 0)
    else setSectionSearch('')
  }, [menuView])

  function startHold(e: React.MouseEvent) {
    if (e.button !== 0) return
    if (kebabRef.current?.contains(e.target as Node)) return
    if (linksRef.current?.contains(e.target as Node)) return

    if (isSelectionMode) return


    holdActive.current = true
    holdStartTime.current = performance.now()

    function tick() {
      if (!holdActive.current) return
      const progress = Math.min((performance.now() - holdStartTime.current) / HOLD_DURATION, 1)
      setHoldProgress(progress)
      if (progress < 1) {
        holdRafRef.current = requestAnimationFrame(tick)
      } else {
        holdActive.current = false
        holdSuppressClick.current = true
        setHoldProgress(0)
        if (state.holdAction === 'copy') handleCopy()
        else onEdit(snip)
      }
    }
    holdRafRef.current = requestAnimationFrame(tick)

    function onGlobalUp() {
      cancelHold()
      window.removeEventListener('mouseup', onGlobalUp)
    }
    window.addEventListener('mouseup', onGlobalUp)
  }

  function cancelHold() {
    if (!holdActive.current) return
    holdActive.current = false
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current)
    setHoldProgress(0)
  }

  function handleCardClick(e: React.MouseEvent) {
    if (holdSuppressClick.current) { holdSuppressClick.current = false; return }
    if (kebabRef.current?.contains(e.target as Node)) return
    if (linksRef.current?.contains(e.target as Node)) return
    if (isSelectionMode) { onToggleSelect?.(snip.id); return }
    if (state.holdAction === 'copy') onEdit(snip)
    else handleCopy()
  }

  function handleDragStart(e: React.DragEvent) {
    cancelHold()
    e.dataTransfer.setData('text/plain', snip.id)
    e.dataTransfer.effectAllowed = 'move'

    const isBulk = isSelectionMode && selected && bulkDragIds && bulkDragIds.length > 1

    if (isBulk) {
      setDraggingSnipIds(bulkDragIds!)
      setDraggingSnipId(null)
      e.dataTransfer.setData('application/json', JSON.stringify(bulkDragIds))

      const ghost = document.createElement('div')
      ghost.style.cssText = [
        'position:fixed', 'top:-9999px', 'left:0',
        'display:flex', 'align-items:center', 'gap:6px',
        'padding:5px 12px',
        'background:rgb(var(--panel))',
        'border:1px solid rgb(var(--accent) / 0.5)',
        'border-radius:999px',
        'font:600 11px/1.4 Inter,system-ui,sans-serif',
        'color:rgb(var(--fg))',
        'white-space:nowrap',
        'box-shadow:3px 3px 0 rgb(var(--border)),4px 4px 0 rgb(var(--accent)/0.25)',
        'pointer-events:none',
      ].join(';')
      const badge = document.createElement('span')
      badge.style.cssText = 'background:rgb(var(--accent));color:white;border-radius:999px;padding:1px 7px;font-size:10px;font-weight:700;'
      badge.textContent = String(bulkDragIds!.length)
      const label = document.createElement('span')
      label.textContent = 'snips'
      ghost.appendChild(badge)
      ghost.appendChild(label)
      document.body.appendChild(ghost)
      e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, 18)
      setTimeout(() => ghost.remove(), 0)
    } else {
      setDraggingSnipId(snip.id)
      setDraggingSnipIds([])

      const ghost = document.createElement('div')
      ghost.style.cssText = [
        'position:fixed', 'top:-9999px', 'left:0',
        'display:flex', 'align-items:center', 'gap:6px',
        'padding:5px 10px',
        'background:rgb(var(--panel))',
        'border:1px solid rgb(var(--accent) / 0.5)',
        'border-radius:999px',
        'font:600 11px/1.4 Inter,system-ui,sans-serif',
        'color:rgb(var(--fg))',
        'white-space:nowrap', 'max-width:200px',
        'overflow:hidden', 'text-overflow:ellipsis',
        'box-shadow:0 4px 12px rgba(0,0,0,0.25)',
        'pointer-events:none',
      ].join(';')
      ghost.textContent = snip.name
      document.body.appendChild(ghost)
      e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, 16)
      setTimeout(() => ghost.remove(), 0)
    }

    requestAnimationFrame(() => setIsDragging(true))
  }

  function handleDragEnd() {
    setIsDragging(false)
    setDraggingSnipId(null)
    setDraggingSnipIds([])
  }

  return (
    <>
    <div
      ref={cardRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={startHold}
      onClick={handleCardClick}
      onContextMenu={(e) => {
        e.preventDefault()
        if (isSelectionMode && onBulkContextMenu) {
          if (!selected && onToggleSelect) onToggleSelect(snip.id)
          onBulkContextMenu(e.clientX, e.clientY)
        } else {
          openMenu(e.clientX, e.clientY)
        }
      }}
      className={`snip-card relative group select-none rounded-xl border transition-all duration-500 ease-in-out
        ${linksOpen ? 'z-20' : ''}
        ${isDragging || isInBulkDrag ? 'opacity-40 scale-95 cursor-grabbing' : 'cursor-pointer'}
        ${copied
          ? 'border-green-500/50 bg-green-500/5 ring-1 ring-green-500/20'
          : selected
            ? 'border-accent bg-accent/[0.06]'
            : holdProgress > 0
              ? 'border-accent/40 bg-panel'
              : 'border-border bg-panel hover:border-fg/25 hover:shadow-md'
        }
      `}
      style={holdProgress > 0 && !copied ? { boxShadow: `0 0 0 1.5px rgb(var(--accent) / ${holdProgress * 0.5})` } : undefined}
    >
      {/* Hold-to-edit radial fill */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 bg-accent/10"
          style={{ clipPath: `circle(${holdProgress * 100}% at 50% 50%)` }}
        />
      </div>


      {/* Copied overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center rounded-xl z-10 pointer-events-none transition-all duration-500 ease-in-out ${
          copied ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-500/12 px-3 py-1.5 rounded-full border border-green-500/25 shadow-sm">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </span>
      </div>

      <div className="p-3 flex flex-col h-full">
        {/* Content — blurs progressively during hold, fully on copy */}
        <div
          className="flex flex-col flex-1"
          style={{
            filter: copied ? 'blur(4px)' : holdProgress > 0 ? `blur(${holdProgress * 3}px)` : undefined,
            opacity: copied ? 0.2 : holdProgress > 0 ? 1 - holdProgress * 0.65 : undefined,
            transition: holdProgress === 0 ? 'filter 500ms ease-in-out, opacity 500ms ease-in-out' : 'none',
          }}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <h3 className="text-sm font-semibold leading-snug text-fg min-w-0">
              {snip.name}
            </h3>
            {snip.pinned && (
              <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
          </div>

          {/* Body */}
          <p className={`text-xs font-mono leading-relaxed break-words whitespace-pre-wrap text-muted ${expanded ? '' : 'line-clamp-3'}`}>
            {snip.body}
          </p>

          {/* Bottom section — pinned to bottom via mt-auto */}
          <div className="mt-auto">
            {/* Tag pills — anchored above links/kebab */}
            {snip.tagIds && snip.tagIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 mb-1">
                {snip.tagIds.slice(0, 4).map((tid) => {
                  const tag = state.tags.find((t) => t.id === tid)
                  if (!tag) return null
                  return (
                    <span
                      key={tid}
                      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium pointer-events-none"
                      style={{ backgroundColor: tag.color + '22', color: tag.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </span>
                  )
                })}
                {snip.tagIds.length > 4 && (
                  <span className="text-[10px] text-muted self-center pointer-events-none">+{snip.tagIds.length - 4}</span>
                )}
              </div>
            )}
            {links.length > 0 ? (
              /* Links row: Visit/Links button on left, kebab on right */
              <div
                className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {links.length === 1 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const url = links[0]
                      if ((window as any).api?.openUrl) (window as any).api.openUrl(url)
                      else window.open(url, '_blank', 'noopener,noreferrer')
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-accent border border-accent/40 hover:border-accent hover:bg-accent/8 px-2.5 py-1 rounded-lg transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Visit
                  </button>
                ) : (
                  <div ref={linksRef} className="relative inline-block">
                    <button
                      onClick={() => setLinksOpen((v) => !v)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-accent border border-accent/40 hover:border-accent hover:bg-accent/8 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 11-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 115.656 5.656l-1.5 1.5" />
                      </svg>
                      Links ({links.length})
                    </button>
                    {linksOpen && (
                      <div className="absolute left-0 top-full mt-1 w-64 max-h-44 overflow-y-auto bg-panel border border-border rounded-xl shadow-xl z-50 p-1.5">
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
                            <p className="text-[11px] font-semibold text-fg truncate group-hover:text-accent transition-colors">{getLinkTitle(url, snip.linkTitles)}</p>
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
                )}
                {/* Kebab inline with link button */}
                <button
                  ref={kebabRef}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (menuOpen) { setMenuOpen(false); return }
                    const rect = e.currentTarget.getBoundingClientRect()
                    openMenu(rect.right - 164, rect.bottom + 4)
                  }}
                  className={`p-1 rounded text-muted hover:text-fg-2 hover:bg-fg/8 transition-all flex-shrink-0 ${menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                    <circle cx="8" cy="2.5" r="1.3" />
                    <circle cx="8" cy="8"   r="1.3" />
                    <circle cx="8" cy="13.5" r="1.3" />
                  </svg>
                </button>
              </div>
            ) : (
              /* No links — kebab alone at bottom right */
              <div
                className={`flex justify-end mt-2 -mb-0.5 transition-opacity ${menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  ref={kebabRef}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (menuOpen) { setMenuOpen(false); return }
                    const rect = e.currentTarget.getBoundingClientRect()
                    openMenu(rect.right - 164, rect.bottom + 4)
                  }}
                  className="p-1 rounded text-muted hover:text-fg-2 hover:bg-fg/8 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                    <circle cx="8" cy="2.5" r="1.3" />
                    <circle cx="8" cy="8"   r="1.3" />
                    <circle cx="8" cy="13.5" r="1.3" />
                  </svg>
                </button>
              </div>
            )}
          </div>{/* end mt-auto */}
        </div>
      </div>
    </div>

    {menuOpen && (() => {
      const mq = moveSearch.trim().toLowerCase()
      const all = flattenFolders(state.folders)
      const filtered = mq ? all.filter(({ folder }) => folder.name.toLowerCase().includes(mq)) : all
      return (
        <div
          ref={menuRef}
          style={{ position: 'fixed', left: menuPos.x, top: menuPos.y, zIndex: 9999 }}
          className={`bg-panel border border-border rounded-xl shadow-xl py-1.5 animate-pop overflow-hidden ${menuView === 'move' || menuView === 'move-section' || menuView === 'tags' ? 'w-44' : 'w-40'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {menuView === 'main' ? (
            <>
              <button
                onClick={() => { dispatch({ type: 'TOGGLE_PIN_SNIP', payload: { id: snip.id } }); setMenuOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors flex items-center gap-2"
              >
                <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {snip.pinned ? 'Unstar' : 'Star'}
              </button>
              <button
                onClick={() => { onEdit(snip); setMenuOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors flex items-center gap-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => { dispatch({ type: 'DUPLICATE_SNIP', payload: { id: snip.id } }); setMenuOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors flex items-center gap-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Duplicate
              </button>
              <button
                onClick={() => setMenuView('move')}
                className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors flex items-center gap-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                Move
              </button>
              {state.sections.some((s) => s.folderId === snip.folderId) && (
                <button
                  onClick={() => setMenuView('section')}
                  className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors flex items-center gap-2"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Section
                </button>
              )}
              <button
                onClick={() => setMenuView('tags')}
                className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors flex items-center gap-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Tags
              </button>
              <div className="border-t border-border mx-2 my-1" />
              <button
                onClick={() => {
                  setMenuOpen(false)
                  if (state.deleteConfirmEnabled) setDeleteConfirmOpen(true)
                  else dispatch({ type: 'DELETE_SNIP', payload: { id: snip.id } })
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/8 transition-colors flex items-center gap-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
                </svg>
                Delete
              </button>
            </>
          ) : menuView === 'tags' ? (
            <>
              <button
                onClick={() => setMenuView('main')}
                className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Tags</span>
              </button>
              {state.tags.length > 0 && (
                <div className="px-2 pb-1.5">
                  <div className="relative">
                    <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      ref={tagSearchRef}
                      type="text"
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') setMenuView('main') }}
                      placeholder="Search tags…"
                      className="w-full bg-surface border border-border rounded-md pl-6 pr-2 py-1 text-[11px] text-fg placeholder-muted focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
              )}
              <div className="border-t border-border mx-2 mb-1" />
              {state.tags.length === 0 ? (
                <p className="px-3 py-2 text-[10px] text-muted">No tags yet. Create tags from the sidebar.</p>
              ) : (() => {
                const tq = tagSearch.trim().toLowerCase()
                const filteredTags = tq ? state.tags.filter((t) => t.name.toLowerCase().includes(tq)) : state.tags
                return filteredTags.length === 0 ? (
                  <p className="px-3 py-2 text-[10px] text-muted">No tags found</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {filteredTags.map((tag) => {
                      const hasTag = snip.tagIds?.includes(tag.id) ?? false
                      return (
                        <button
                          key={tag.id}
                          onClick={() => {
                            const next = hasTag
                              ? (snip.tagIds ?? []).filter((id) => id !== tag.id)
                              : [...(snip.tagIds ?? []), tag.id]
                            dispatch({ type: 'SET_SNIP_TAGS', payload: { snipId: snip.id, tagIds: next } })
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-fg/5 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                          <span className="flex-1 truncate text-fg-2">{tag.name}</span>
                          {hasTag && (
                            <svg className="w-3 h-3 flex-shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })()}
            </>
          ) : menuView === 'section' ? (
            /* ── Section submenu ── */
            <>
              <button
                onClick={() => setMenuView('main')}
                className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Move to section</span>
              </button>
              <div className="px-2 pb-1.5">
                <div className="relative">
                  <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={sectionSearchRef}
                    type="text"
                    value={sectionSearch}
                    onChange={(e) => setSectionSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setMenuView('main') }}
                    placeholder="Search sections…"
                    className="w-full bg-surface border border-border rounded-md pl-6 pr-2 py-1 text-[11px] text-fg placeholder-muted focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
              <div className="border-t border-border mx-2 mb-1" />
              {(() => {
                const sq = sectionSearch.trim().toLowerCase()
                const folderSections = state.sections
                  .filter((s) => s.folderId === snip.folderId)
                  .sort((a, b) => a.order - b.order)
                const folder = state.folders.find((f) => f.id === snip.folderId)
                const defaultName = folder?.defaultSectionName ?? 'General'
                const allOptions: Array<{ id: string | null; name: string }> = [
                  { id: null, name: defaultName },
                  ...folderSections.map((s) => ({ id: s.id, name: s.name })),
                ]
                const filtered = sq ? allOptions.filter((o) => o.name.toLowerCase().includes(sq)) : allOptions
                return filtered.length === 0 ? (
                  <p className="px-3 py-2 text-[10px] text-muted">No sections found</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto">
                    {filtered.map((opt) => {
                      const isCurrent = (snip.sectionId ?? null) === opt.id
                      return (
                        <button
                          key={opt.id ?? '__general__'}
                          onClick={() => {
                            if (!isCurrent) {
                              dispatch({ type: 'SET_SNIP_SECTION', payload: { snipId: snip.id, sectionId: opt.id } })
                            }
                            setMenuOpen(false)
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                            isCurrent ? 'text-muted cursor-default' : 'text-fg-2 hover:text-fg hover:bg-fg/5'
                          }`}
                        >
                          <svg className="w-3 h-3 flex-shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                          </svg>
                          <span className="flex-1 truncate">{opt.name}</span>
                          {isCurrent && (
                            <svg className="w-3 h-3 flex-shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })()}
            </>
          ) : menuView === 'move-section' && moveFolderTarget ? (
            /* ── Section picker after folder selection ── */
            <>
              <button
                onClick={() => { setMenuView('move'); setMoveFolderTarget(null) }}
                className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium truncate">{moveFolderTarget.name}</span>
              </button>
              <div className="border-t border-border mx-2 mb-1" />
              {(() => {
                const targetSections = state.sections
                  .filter((s) => s.folderId === moveFolderTarget.id)
                  .sort((a, b) => a.order - b.order)
                const folder = state.folders.find((f) => f.id === moveFolderTarget.id)
                const defaultName = folder?.defaultSectionName ?? 'General'
                const options: Array<{ id: string | null; name: string }> = [
                  { id: null, name: defaultName },
                  ...targetSections.map((s) => ({ id: s.id, name: s.name })),
                ]
                return (
                  <div className="max-h-40 overflow-y-auto">
                    {options.map((opt) => (
                      <button
                        key={opt.id ?? '__general__'}
                        onClick={() => {
                          dispatch({ type: 'MOVE_SNIP', payload: { id: snip.id, folderId: moveFolderTarget.id } })
                          dispatch({ type: 'SET_SNIP_SECTION', payload: { snipId: snip.id, sectionId: opt.id } })
                          setMenuOpen(false)
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-3 h-3 flex-shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                        <span className="flex-1 truncate">{opt.name}</span>
                      </button>
                    ))}
                  </div>
                )
              })()}
            </>
          ) : (
            <>
              <button
                onClick={() => setMenuView('main')}
                className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Move to folder</span>
              </button>
              <div className="px-2 pb-1.5">
                <div className="relative">
                  <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={moveSearchRef}
                    type="text"
                    value={moveSearch}
                    onChange={(e) => setMoveSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setMenuView('main')
                      if (e.key === 'Enter' && filtered.length === 1 && filtered[0].folder.id !== snip.folderId) {
                        const target = filtered[0].folder
                        const targetSections = state.sections.filter((s) => s.folderId === target.id)
                        if (targetSections.length > 0) {
                          setMoveFolderTarget({ id: target.id, name: target.name })
                          setMenuView('move-section')
                        } else {
                          dispatch({ type: 'MOVE_SNIP', payload: { id: snip.id, folderId: target.id } })
                          dispatch({ type: 'SET_SNIP_SECTION', payload: { snipId: snip.id, sectionId: null } })
                          setMenuOpen(false)
                        }
                      }
                    }}
                    placeholder="Search folders…"
                    className="w-full bg-surface border border-border rounded-md pl-6 pr-2 py-1 text-[11px] text-fg placeholder-muted focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
              <div className="border-t border-border mx-2 mb-1" />
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-[10px] text-muted">No folders found</p>
              ) : (
                <div className="max-h-40 overflow-y-auto">
                  {filtered.map(({ folder, depth }) => {
                    const isCurrent = folder.id === snip.folderId
                    return (
                      <button
                        key={folder.id}
                        onClick={() => {
                          if (isCurrent) return
                          const targetSections = state.sections.filter((s) => s.folderId === folder.id)
                          if (targetSections.length > 0) {
                            setMoveFolderTarget({ id: folder.id, name: folder.name })
                            setMenuView('move-section')
                          } else {
                            dispatch({ type: 'MOVE_SNIP', payload: { id: snip.id, folderId: folder.id } })
                            dispatch({ type: 'SET_SNIP_SECTION', payload: { snipId: snip.id, sectionId: null } })
                            setMenuOpen(false)
                          }
                        }}
                        style={{ paddingLeft: `${12 + depth * 10}px` }}
                        className={`w-full text-left pr-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
                          isCurrent ? 'text-muted cursor-default' : 'text-fg-2 hover:text-fg hover:bg-fg/5'
                        }`}
                      >
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        </svg>
                        <span className="flex-1 truncate">{folder.name}</span>
                        {isCurrent ? (
                          <svg className="w-3 h-3 flex-shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : state.sections.some((s) => s.folderId === folder.id) ? (
                          <svg className="w-3 h-3 flex-shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )
    })()}

    <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Move to Trash?">
      <p className="text-xs text-muted mb-5">
        <span className="font-semibold text-fg">{snip.name}</span> will be moved to Trash. You can restore it later.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
        <button
          onClick={() => {
            dispatch({ type: 'DELETE_SNIP', payload: { id: snip.id } })
            setDeleteConfirmOpen(false)
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
        >
          Move to Trash
        </button>
      </div>
    </Modal>
    </>
  )
}
