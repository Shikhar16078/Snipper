import { useState, useRef } from 'react'
import { useApp } from '../../store/AppContext'
import { useDrag } from '../../context/DragContext'
import { FolderItem } from './FolderItem'
import { flattenFolders } from '../../utils/folders'
import { DropZone, SeparatorRow } from './Separator'

interface SidebarProps {
  onCollapse: () => void
  trashOpen: boolean
  onTrashClick: () => void
}

export function Sidebar({ onCollapse, trashOpen, onTrashClick }: SidebarProps) {
  const { state, dispatch } = useApp()
  const { draggingSnipId } = useDrag()
  const [trashDragOver, setTrashDragOver] = useState(false)
  const [renamingAll, setRenamingAll] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [folderSearch, setFolderSearch] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const rootFolders = state.folders.filter((f) => f.parentId === null)
  const isAllSelected = state.selectedFolderId === null

  function startRenameAll(e: React.MouseEvent) {
    e.stopPropagation()
    setRenameValue(state.allSnipsLabel || 'All Snips')
    setRenamingAll(true)
    setTimeout(() => { renameInputRef.current?.select() }, 0)
  }

  function commitRenameAll() {
    const trimmed = renameValue.trim()
    if (trimmed) dispatch({ type: 'SET_ALL_SNIPS_LABEL', payload: { label: trimmed } })
    setRenamingAll(false)
  }

  const isMac = window.api?.platform === 'darwin'

  const q = folderSearch.trim().toLowerCase()
  const flatFolders = flattenFolders(state.folders)
  const searchResults = q
    ? flatFolders.filter(({ folder }) => folder.name.toLowerCase().includes(q))
    : []

  return (
    <aside className="w-full h-full bg-sidebar border-r border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className={`flex items-center justify-between pr-3 flex-shrink-0 ${
          isMac ? 'pl-[72px] h-[40px] app-drag select-none' : 'px-3 py-2.5'
        }`}
      >
        <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted hover:text-fg transition-colors select-none pl-1">
          Snipper
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_EDIT_MODE' })}
            className={`p-1.5 rounded-md transition-colors app-no-drag ${
              state.isEditMode
                ? 'bg-accent text-white hover:bg-accent/90'
                : 'text-muted hover:text-fg hover:bg-fg/8'
            }`}
            title={state.isEditMode ? 'Finish organizing' : 'Organize folders'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
          <button
            onClick={onCollapse}
            className="p-1.5 rounded-md text-accent bg-accent/10 hover:bg-accent/15 transition-colors app-no-drag"
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {/* All Snips row */}
        <div
          className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
            isAllSelected && !trashOpen ? 'bg-accent/10 text-accent' : 'text-fg-2 hover:text-fg hover:bg-fg/6'
          } ${renamingAll ? '' : 'cursor-pointer'}`}
          onClick={() => {
            if (!renamingAll) {
              dispatch({ type: 'SELECT_FOLDER', payload: { id: null } })
              if (trashOpen) onTrashClick()
            }
          }}
        >
          <svg className={`w-3.5 h-3.5 flex-shrink-0 ${isAllSelected && !trashOpen ? 'text-accent' : 'text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>

          {renamingAll ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRenameAll}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRenameAll()
                if (e.key === 'Escape') setRenamingAll(false)
              }}
              className="flex-1 text-xs font-medium bg-transparent outline-none border-b border-accent text-fg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <span className="flex-1 text-xs font-medium">{state.allSnipsLabel || 'All Snips'}</span>
              {state.snips.length > 0 && !isAllSelected && (
                <span className="text-[10px] text-muted tabular-nums">{state.snips.length}</span>
              )}
              {state.isEditMode && (
                <button
                  onClick={startRenameAll}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted hover:text-fg-2 transition-all"
                  title="Rename"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z" />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>

        <div className="pt-2 pb-1 px-1">
          <div className="border-t border-border" />
        </div>

        {/* Search / add folder */}
        <div className="px-1 pb-1">
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setFolderSearch(''); searchRef.current?.blur() } }}
              placeholder="Type to search or add folder…"
              className="w-full bg-surface border border-border rounded-md px-2 py-1 text-[11px] text-fg placeholder-muted focus:outline-none focus:border-accent transition-colors"
              style={{ paddingRight: folderSearch ? '1.5rem' : undefined }}
            />
            {folderSearch && (
              <button
                onClick={() => {
                  dispatch({ type: 'ADD_FOLDER', payload: { name: folderSearch.trim(), parentId: null } })
                  setFolderSearch('')
                }}
                title="Add as new folder"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="pt-1 pb-1 px-1">
          <div className="border-t border-border" />
        </div>

        {/* Folder list — flat search results or normal tree with separators */}
        {q ? (
          searchResults.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-muted">No folders found</p>
          ) : (
            searchResults.map(({ folder, depth }) => {
              const isSelected = state.selectedFolderId === folder.id
              const snipCount = state.snips.filter((s) => s.folderId === folder.id).length
              return (
                <div
                  key={folder.id}
                  style={{ paddingLeft: `${8 + depth * 14}px` }}
                  className={`flex items-center gap-1.5 pr-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-accent/10 text-accent' : 'text-fg-2 hover:text-fg hover:bg-fg/6'
                  }`}
                  onClick={() => {
                    dispatch({ type: 'SELECT_FOLDER', payload: { id: folder.id } })
                    setFolderSearch('')
                    if (trashOpen) onTrashClick()
                  }}
                >
                  <svg className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-accent' : 'text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                  <span className="flex-1 text-xs truncate">{folder.name}</span>
                  <span className="text-[10px] text-muted tabular-nums">{snipCount || ''}</span>
                </div>
              )
            })
          )
        ) : (
          <>
            {/* Drop zone + dividers before all folders */}
            {state.isEditMode && <DropZone afterFolderId={null} parentId={null} depth={0} />}
            {state.dividers.filter((d) => d.afterFolderId === null).map((d) => (
              <SeparatorRow key={d.id} id={d.id} depth={0} />
            ))}

            {/* Root folders */}
            {rootFolders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                isSelected={state.selectedFolderId === folder.id && !trashOpen}
                depth={0}
                onNavigate={() => { if (trashOpen) onTrashClick() }}
              />
            ))}
          </>
        )}
      </nav>

      {/* Trash button footer */}
      <div className="flex-shrink-0 px-2 pb-3">
        <button
          onClick={onTrashClick}
          title="Trash"
          onDragOver={(e) => {
            if (!draggingSnipId) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            setTrashDragOver(true)
          }}
          onDragLeave={() => setTrashDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setTrashDragOver(false)
            if (draggingSnipId) dispatch({ type: 'DELETE_SNIP', payload: { id: draggingSnipId } })
          }}
          className={`relative flex items-center justify-center w-12 h-12 rounded-xl border transition-colors ${
            trashDragOver
              ? 'bg-red-500/15 border-red-500/40 text-red-500 ring-1 ring-red-500/40'
              : trashOpen
                ? 'bg-accent/20 border-accent/40 text-accent ring-1 ring-accent/20'
                : 'bg-accent/10 border-fg/20 text-fg hover:bg-accent/15 hover:border-fg/40'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
          </svg>
          {state.trash.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
              {state.trash.length > 9 ? '9+' : state.trash.length}
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
