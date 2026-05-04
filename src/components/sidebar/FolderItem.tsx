import { useState, useRef, useEffect } from 'react'
import type { Folder } from '../../types'
import { useApp } from '../../store/AppContext'
import { useDrag } from '../../context/DragContext'
import { getAllDescendantIds } from '../../utils/folders'
import { Modal } from '../modals/Modal'
import { DropZone, SeparatorRow } from './Separator'

interface FolderItemProps {
  folder: Folder
  isSelected: boolean
  depth: number
  onNavigate?: () => void
}

export function FolderItem({ folder, isSelected, depth, onNavigate }: FolderItemProps) {
  const { state, dispatch } = useApp()
  const { draggingSnipId, draggingFolderId, setDraggingFolderId } = useDrag()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(folder.name)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isAddingChild, setIsAddingChild] = useState(false)
  const [childName, setChildName] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const renameRef = useRef<HTMLInputElement>(null)
  const childRef = useRef<HTMLInputElement>(null)

  const children = state.folders.filter((f) => f.parentId === folder.id)
  const hasChildren = children.length > 0 || isAddingChild
  const snipCount = state.snips.filter((s) => s.folderId === folder.id).length

  useEffect(() => {
    if (isRenaming) { setRenameValue(folder.name); renameRef.current?.focus(); renameRef.current?.select() }
  }, [isRenaming, folder.name])

  useEffect(() => {
    if (isAddingChild) childRef.current?.focus()
  }, [isAddingChild])

  function commitRename() {
    const name = renameValue.trim()
    if (name && name !== folder.name) dispatch({ type: 'RENAME_FOLDER', payload: { id: folder.id, name } })
    setIsRenaming(false)
  }

  function commitAddChild() {
    const name = childName.trim()
    if (name) { dispatch({ type: 'ADD_FOLDER', payload: { name, parentId: folder.id } }); setIsExpanded(true) }
    setIsAddingChild(false)
    setChildName('')
  }

  function handleDragStart(e: React.DragEvent) {
    if (!state.isEditMode) return
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    setDraggingFolderId(folder.id)
  }

  function handleDragEnd() {
    setDraggingFolderId(null)
  }

  function handleDragOver(e: React.DragEvent) {
    if (!draggingSnipId && !draggingFolderId) return
    if (draggingFolderId === folder.id) return // Can't drop on itself
    
    // Check if we are trying to drop on a descendant
    if (draggingFolderId) {
      const descendants = getAllDescendantIds(draggingFolderId, state.folders)
      if (descendants.includes(folder.id)) return
    }

    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    if (draggingSnipId) {
      const snipId = e.dataTransfer.getData('text/plain')
      if (snipId) dispatch({ type: 'MOVE_SNIP', payload: { id: snipId, folderId: folder.id } })
    } else if (draggingFolderId) {
      if (draggingFolderId !== folder.id) {
        const lastChild = children.length > 0 ? children[children.length - 1] : null
        dispatch({
          type: 'REORDER_FOLDER',
          payload: { sourceId: draggingFolderId, afterId: lastChild ? lastChild.id : null, parentId: folder.id }
        })
      }
      setDraggingFolderId(null)
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (state.deleteConfirmEnabled) {
      setShowDeleteModal(true)
    } else {
      dispatch({ type: 'DELETE_FOLDER', payload: { id: folder.id } })
    }
  }

  const indent = depth * 14

  return (
    <div>
      {/* Row */}
      <div
        draggable={state.isEditMode}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ paddingLeft: '8px', marginLeft: indent > 0 ? `${indent}px` : undefined }}
        className={`group flex items-center gap-1.5 pr-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
          state.isEditMode ? 'active:cursor-grabbing' : ''
        } ${
          isDragOver
            ? 'bg-accent/15 text-accent ring-1 ring-accent/50'
            : isSelected
              ? 'bg-accent/10 text-accent'
              : 'text-fg-2 hover:text-fg hover:bg-fg/6'
        }`}
        onClick={() => { if (!isRenaming) { dispatch({ type: 'SELECT_FOLDER', payload: { id: folder.id } }); onNavigate?.() } }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsExpanded((x) => !x) }}
          className={`flex-shrink-0 w-4 h-4 flex items-center justify-center rounded transition-colors ${hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <svg
            className={`w-3 h-3 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Folder icon */}
        <svg className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-accent' : 'text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d={isExpanded && hasChildren
              ? "M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
              : "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
            }
          />
        </svg>

        {/* Name / rename input */}
        {isRenaming ? (
          <input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setIsRenaming(false) }}
            onBlur={commitRename}
            className="flex-1 bg-transparent border-b border-accent text-xs text-fg focus:outline-none min-w-0"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-xs truncate">{folder.name}</span>
        )}

        <span className="text-[10px] text-muted tabular-nums ml-auto">{snipCount || ''}</span>

        {/* Hover actions */}
        {state.isEditMode && (
          <div className="hidden group-hover:flex items-center gap-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setIsAddingChild(true); setIsExpanded(true) }}
              className="p-1 rounded text-muted hover:text-fg-2 hover:bg-fg/8 transition-colors"
              title="New subfolder"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={() => dispatch({ type: 'ADD_DIVIDER', payload: { afterFolderId: folder.id } })}
              className="p-1 rounded text-muted hover:text-fg-2 hover:bg-fg/8 transition-colors"
              title="Add separator below"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
              </svg>
            </button>
            <button
              onClick={() => setIsRenaming(true)}
              className="p-1 rounded text-muted hover:text-fg-2 hover:bg-fg/8 transition-colors"
              title="Rename"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="p-1 rounded transition-colors text-muted hover:text-red-500 hover:bg-red-500/8"
              title="Delete"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {(() => {
        const descendantIds = getAllDescendantIds(folder.id, state.folders)
        const subfolderCount = descendantIds.length
        const snipCount = state.snips.filter((s) =>
          s.folderId === folder.id || descendantIds.includes(s.folderId)
        ).length
        const hasContents = subfolderCount > 0 || snipCount > 0
        return (
          <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Move to Trash?">
            <p className="text-sm text-fg-2 mb-3">
              <span className="font-semibold text-fg">"{folder.name}"</span> will be moved to Trash.
            </p>
            {hasContents && (
              <div className="bg-fg/5 border border-border rounded-lg px-3 py-2.5 mb-4 text-xs text-fg-2 space-y-1">
                <p className="font-medium">Also includes:</p>
                {snipCount > 0 && <p>· {snipCount} snip{snipCount !== 1 ? 's' : ''}</p>}
                {subfolderCount > 0 && <p>· {subfolderCount} subfolder{subfolderCount !== 1 ? 's' : ''}</p>}
              </div>
            )}
            <p className="text-xs text-muted mb-5">You can restore it from Trash later.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border text-fg-2 hover:text-fg hover:bg-fg/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  dispatch({ type: 'DELETE_FOLDER', payload: { id: folder.id } })
                  setShowDeleteModal(false)
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
              >
                Move to Trash
              </button>
            </div>
          </Modal>
        )
      })()}

      {/* Add child input */}
      {isAddingChild && (
        <div style={{ paddingLeft: `${8 + indent + 20}px` }} className="pr-2 py-1">
          <input
            ref={childRef}
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitAddChild(); if (e.key === 'Escape') { setIsAddingChild(false); setChildName('') } }}
            onBlur={commitAddChild}
            placeholder="Subfolder name"
            className="w-full bg-surface border border-accent/40 rounded-md px-2 py-1 text-xs text-fg placeholder-muted focus:outline-none focus:border-accent"
          />
        </div>
      )}

      {/* Children */}
      {isExpanded && state.isEditMode && children.length > 0 && (
        <DropZone afterFolderId={null} parentId={folder.id} depth={depth + 1} />
      )}
      {isExpanded && children.map((child) => (
        <FolderItem
          key={child.id}
          folder={child}
          isSelected={state.selectedFolderId === child.id}
          depth={depth + 1}
          onNavigate={onNavigate}
        />
      ))}

      {/* Dividers at the end of the folder group */}
      {state.isEditMode && <DropZone afterFolderId={folder.id} parentId={folder.parentId} depth={depth} />}
      {state.dividers.filter((d) => d.afterFolderId === folder.id).map((d) => (
        <SeparatorRow key={d.id} id={d.id} depth={depth} />
      ))}
    </div>
  )
}
