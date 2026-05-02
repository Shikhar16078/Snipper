import { useState } from 'react'
import { useApp } from '../../store/AppContext'
import { useDrag } from '../../context/DragContext'

interface DropZoneProps {
  afterFolderId: string | null
  depth: number
}

export function DropZone({ afterFolderId, depth }: DropZoneProps) {
  const { dispatch } = useApp()
  const { draggingDividerId, setDraggingDividerId } = useDrag()
  const [over, setOver] = useState(false)
  const active = !!draggingDividerId

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setOver(false)
    if (draggingDividerId) {
      dispatch({ type: 'MOVE_DIVIDER', payload: { id: draggingDividerId, afterFolderId } })
      setDraggingDividerId(null)
    }
  }

  const indent = depth * 14

  return (
    <div
      className={`transition-all duration-100 pr-1 ${active ? (over ? 'py-0.5' : 'py-1.5') : 'h-0 overflow-hidden'}`}
      onDragOver={(e) => { if (!active) return; e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      style={{ paddingLeft: `${4 + indent}px` }}
    >
      <div className="flex items-center gap-1.5">
        <div className="w-4 flex-shrink-0" />
        <div className={`flex-1 pointer-events-none h-px rounded-full transition-colors ${over ? 'bg-accent' : 'bg-border/50'}`} />
      </div>
    </div>
  )
}

interface SeparatorRowProps {
  id: string
  depth: number
}

export function SeparatorRow({ id, depth }: SeparatorRowProps) {
  const { state, dispatch } = useApp()
  const { setDraggingDividerId } = useDrag()

  const indent = depth * 14

  return (
    <div
      draggable={state.isEditMode}
      onDragStart={(e) => { if (!state.isEditMode) return; e.dataTransfer.effectAllowed = 'move'; setDraggingDividerId(id) }}
      onDragEnd={() => setDraggingDividerId(null)}
      className={`group flex items-center gap-1.5 pr-1 py-0.5 ${state.isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      style={{ paddingLeft: `${4 + indent}px` }}
    >
      <div className="w-4 h-4 flex items-center justify-center">
        {state.isEditMode && (
          <button
            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_DIVIDER', payload: { id } }) }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted hover:text-red-500 transition-all"
            title="Remove separator"
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className={`flex-1 h-px transition-colors ${state.isEditMode ? 'bg-border group-hover:bg-accent/50' : 'bg-border/60'}`} />
    </div>
  )
}

