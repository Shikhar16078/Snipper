import { useState, useRef, useEffect } from 'react'
import type { Folder } from '../../types'
import { flattenFolders } from '../../utils/folders'

interface FolderSelectProps {
  folders: Folder[]
  value: string
  onChange: (id: string) => void
  allSnipsLabel?: string
}

export function FolderSelect({ folders, value, onChange, allSnipsLabel = 'All Snips' }: FolderSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selectedFolder = folders.find((f) => f.id === value)
  const isAllSnips = value === ''
  const q = search.trim().toLowerCase()
  const flat = flattenFolders(folders)
  const filtered = q ? flat.filter(({ folder }) => folder.name.toLowerCase().includes(q)) : flat
  const showAllSnipsOption = !q || allSnipsLabel.toLowerCase().includes(q)

  useEffect(() => {
    if (!isOpen) { setSearch(''); return }
    setTimeout(() => searchRef.current?.focus(), 0)
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [isOpen])

  function select(id: string) {
    onChange(id)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`w-full flex items-center gap-2 bg-surface border rounded-lg px-3 py-2 text-sm transition-colors ${
          isOpen ? 'border-accent' : 'border-border hover:border-fg/30'
        }`}
      >
        {isAllSnips ? (
          <svg className="w-3.5 h-3.5 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
        )}
        <span className="flex-1 truncate text-left text-fg">
          {isAllSnips ? allSnipsLabel : (selectedFolder?.name ?? 'Select folder…')}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-muted flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-panel border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsOpen(false)
                  if (e.key === 'Enter' && filtered.length === 1 && !showAllSnipsOption) select(filtered[0].folder.id)
                }}
                placeholder="Search folders…"
                className="w-full bg-surface border border-border rounded-md pl-7 pr-3 py-1.5 text-xs text-fg placeholder-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-44 overflow-y-auto py-1">
            {/* All Snips option — pinned at top, shown when not filtered out */}
            {showAllSnipsOption && (
              <button
                type="button"
                onClick={() => select('')}
                className={`w-full text-left px-3 pr-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  isAllSnips ? 'text-accent bg-accent/8' : 'text-fg-2 hover:text-fg hover:bg-fg/5'
                }`}
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <span className="flex-1 truncate">{allSnipsLabel}</span>
                {isAllSnips && (
                  <svg className="w-3 h-3 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )}

            {filtered.length === 0 && !showAllSnipsOption ? (
              <p className="px-3 py-2 text-xs text-muted">No folders found</p>
            ) : (
              filtered.map(({ folder, depth }) => {
                const isCurrent = folder.id === value
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => select(folder.id)}
                    style={{ paddingLeft: `${12 + depth * 14}px` }}
                    className={`w-full text-left pr-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                      isCurrent ? 'text-accent bg-accent/8' : 'text-fg-2 hover:text-fg hover:bg-fg/5'
                    }`}
                  >
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    </svg>
                    <span className="flex-1 truncate">{folder.name}</span>
                    {isCurrent && (
                      <svg className="w-3 h-3 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
