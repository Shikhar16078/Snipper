import { useState, useEffect, useRef, useCallback } from 'react'
import type { Snip } from './types'
import { AppProvider, useApp } from './store/AppContext'
import { DragProvider } from './context/DragContext'
import { Sidebar } from './components/sidebar/Sidebar'
import { SnipGrid } from './components/snips/SnipGrid'
import { TrashView } from './components/trash/TrashView'
import { AddSnipModal } from './components/modals/AddSnipModal'
import { EditSnipModal } from './components/modals/EditSnipModal'

const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 420
const SIDEBAR_DEFAULT = 210

function AppShell() {
  const { state } = useApp()
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Snip | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const [collapsed, setCollapsed] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)
  const widthBeforeCollapse = useRef(SIDEBAR_DEFAULT)
  const isResizing = useRef(false)

  // Apply theme classes to <html>
  useEffect(() => {
    const html = document.documentElement
    const darkThemes = ['stone', 'dark', 'dark-maroon', 'dark-midnight', 'dark-ember', 'dark-nebula']
    html.classList.toggle('dark',          darkThemes.includes(state.theme))
    html.classList.toggle('stone',         state.theme === 'stone')
    html.classList.toggle('light-pink',    state.theme === 'light-pink')
    html.classList.toggle('light-sage',    state.theme === 'light-sage')
    html.classList.toggle('light-dusk',    state.theme === 'light-dusk')
    html.classList.toggle('light-arctic',  state.theme === 'light-arctic')
    html.classList.toggle('dark-maroon',   state.theme === 'dark-maroon')
    html.classList.toggle('dark-midnight', state.theme === 'dark-midnight')
    html.classList.toggle('dark-ember',    state.theme === 'dark-ember')
    html.classList.toggle('dark-nebula',   state.theme === 'dark-nebula')
    localStorage.setItem('snipper_theme', state.theme)
  }, [state.theme])

  // Global shortcut: N = new snip
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault()
        setAddOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const startResize = useCallback((e: React.MouseEvent) => {
    if (collapsed) return
    e.preventDefault()
    isResizing.current = true
    const startX = e.clientX
    const startW = sidebarWidth

    function onMove(ev: MouseEvent) {
      if (!isResizing.current) return
      setSidebarWidth(Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startW + ev.clientX - startX)))
    }
    function onUp() {
      isResizing.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [collapsed, sidebarWidth])

  function toggleCollapse() {
    if (collapsed) {
      setCollapsed(false)
      setSidebarWidth(widthBeforeCollapse.current)
    } else {
      widthBeforeCollapse.current = sidebarWidth
      setCollapsed(true)
    }
  }

  // Close trash whenever the user navigates to a folder
  useEffect(() => {
    setTrashOpen(false)
  }, [state.selectedFolderId])

  function toggleTrash() {
    setTrashOpen((v) => !v)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{
          width: collapsed ? 0 : sidebarWidth,
          transition: isResizing.current ? 'none' : 'width 0.2s ease',
        }}
      >
        <Sidebar onCollapse={toggleCollapse} trashOpen={trashOpen} onTrashClick={toggleTrash} />
      </div>

      {/* Resize + toggle handle */}
      <div
        className="flex-shrink-0 relative group z-10"
        style={{ width: collapsed ? 0 : 4 }}
        onMouseDown={startResize}
      >
        <div className="absolute inset-0 bg-border group-hover:bg-accent/40 transition-colors cursor-ew-resize" />
      </div>

      {/* Main panel */}
      <div className="flex-1 overflow-hidden relative">
        {trashOpen ? (
          <TrashView collapsed={collapsed} onToggleSidebar={toggleCollapse} />
        ) : (
          <SnipGrid onAdd={() => setAddOpen(true)} onEdit={setEditTarget} collapsed={collapsed} onToggleSidebar={toggleCollapse} />
        )}
      </div>

      <AddSnipModal open={addOpen} onClose={() => setAddOpen(false)} />
      <EditSnipModal snip={editTarget} onClose={() => setEditTarget(null)} />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <DragProvider>
        <AppShell />
      </DragProvider>
    </AppProvider>
  )
}
