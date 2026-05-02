import { useState, useRef, useEffect } from 'react'
import type { Snip } from '../../types'
import { useApp } from '../../store/AppContext'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { useDrag } from '../../context/DragContext'
import { flattenFolders } from '../../utils/folders'

interface SnipCardProps {
  snip: Snip
  onEdit: (snip: Snip) => void
  expanded: boolean
}

export function SnipCard({ snip, onEdit, expanded }: SnipCardProps) {
  const { state, dispatch } = useApp()
  const { copy, copied } = useCopyToClipboard(1500)
  const { setDraggingSnipId } = useDrag()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuView, setMenuView] = useState<'main' | 'move'>('main')
  const [moveSearch, setMoveSearch] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const moveSearchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) { setMenuView('main'); setMoveSearch('') }
  }, [menuOpen])

  useEffect(() => {
    if (menuView === 'move') setTimeout(() => moveSearchRef.current?.focus(), 0)
    else setMoveSearch('')
  }, [menuView])

  function handleCardClick(e: React.MouseEvent) {
    if (menuRef.current?.contains(e.target as Node)) return
    copy(snip.body)
  }

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('text/plain', snip.id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingSnipId(snip.id)

    // Tiny pill ghost so the cursor stays visible over drop targets
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

    requestAnimationFrame(() => setIsDragging(true))
  }

  function handleDragEnd() {
    setIsDragging(false)
    setDraggingSnipId(null)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
      onContextMenu={(e) => { e.preventDefault(); setMenuOpen(true); setMenuView('main') }}
      className={`relative group select-none rounded-xl border transition-all duration-500 ease-in-out
        ${isDragging ? 'opacity-40 scale-95 cursor-grabbing' : 'cursor-pointer'}
        ${copied
          ? 'border-green-500/50 bg-green-500/5 ring-1 ring-green-500/20'
          : 'border-border bg-panel hover:border-fg/25 hover:shadow-md'
        }
      `}
    >
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

      <div className="p-4">
        {/* Content — blurs out when copied so the overlay reads clearly */}
        <div className={`transition-[filter,opacity] duration-500 ease-in-out ${copied ? 'blur-[4px] opacity-20' : 'blur-0 opacity-100'}`}>
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <h3 className="text-sm font-semibold leading-snug text-fg">
              {snip.name}
            </h3>

            {/* Kebab — hover-only */}
            <div
              ref={menuRef}
              className={`relative flex-shrink-0 transition-opacity -mt-0.5 ${menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="p-1 rounded text-muted hover:text-fg-2 hover:bg-fg/8 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                  <circle cx="8" cy="2.5" r="1.3" />
                  <circle cx="8" cy="8"   r="1.3" />
                  <circle cx="8" cy="13.5" r="1.3" />
                </svg>
              </button>

              {menuOpen && (
                <div className={`absolute right-0 top-full mt-1 bg-panel border border-border rounded-xl shadow-xl z-20 py-1.5 animate-pop overflow-hidden ${menuView === 'move' ? 'w-44' : 'w-36'}`}>
                  {menuView === 'main' ? (
                    <>
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
                        onClick={() => setMenuView('move')}
                        className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        </svg>
                        Move
                      </button>
                      <div className="border-t border-border mx-2 my-1" />
                      <button
                        onClick={() => { dispatch({ type: 'DELETE_SNIP', payload: { id: snip.id } }); setMenuOpen(false) }}
                        className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/8 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
                        </svg>
                        Delete
                      </button>
                    </>
                  ) : (() => {
                      const mq = moveSearch.trim().toLowerCase()
                      const all = flattenFolders(state.folders)
                      const filtered = mq ? all.filter(({ folder }) => folder.name.toLowerCase().includes(mq)) : all
                      return (
                        <>
                          {/* Back button */}
                          <button
                            onClick={() => setMenuView('main')}
                            className="w-full text-left px-3 py-1.5 text-xs text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors flex items-center gap-1.5"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="font-medium">Move to folder</span>
                          </button>

                          {/* Search */}
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
                                    dispatch({ type: 'MOVE_SNIP', payload: { id: snip.id, folderId: filtered[0].folder.id } })
                                    setMenuOpen(false)
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
                                      if (!isCurrent) {
                                        dispatch({ type: 'MOVE_SNIP', payload: { id: snip.id, folderId: folder.id } })
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
                                    {isCurrent && (
                                      <svg className="w-3 h-3 flex-shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </>
                      )
                    })()}
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <p className={`text-xs font-mono leading-relaxed break-words whitespace-pre-wrap text-muted ${expanded ? '' : 'line-clamp-3'}`}>
            {snip.body}
          </p>
        </div>
      </div>
    </div>
  )
}
