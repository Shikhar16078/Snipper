import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../store/AppContext'

export function AddFolderButton() {
  const { dispatch } = useApp()
  const [isAdding, setIsAdding] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (isAdding) inputRef.current?.focus() }, [isAdding])

  function commit() {
    const name = value.trim()
    if (name) dispatch({ type: 'ADD_FOLDER', payload: { name, parentId: null } })
    setIsAdding(false)
    setValue('')
  }

  if (isAdding) {
    return (
      <div className="px-2 py-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setIsAdding(false); setValue('') } }}
          onBlur={commit}
          placeholder="Folder name"
          className="w-full bg-surface border border-accent/50 rounded-lg px-3 py-1.5 text-xs text-fg placeholder-muted focus:outline-none focus:border-accent"
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted hover:text-fg-2 transition-colors rounded-lg hover:bg-fg/6"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      New Folder
    </button>
  )
}
