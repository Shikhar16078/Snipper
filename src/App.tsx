import { useState, useEffect, useRef, useCallback } from 'react'
import type { Snip } from './types'
import { AppProvider, useApp } from './store/AppContext'
import { DragProvider } from './context/DragContext'
import { Sidebar } from './components/sidebar/Sidebar'
import { SnipGrid } from './components/snips/SnipGrid'
import { SnipEditorView, type SnipEditorHandle } from './components/snips/SnipEditorView'
import { TrashView } from './components/trash/TrashView'
import { HelpView } from './components/help/HelpView'

type PendingNav = { type: 'folder'; id: string | null } | { type: 'trash' }
type UpdateCardState =
  | { phase: 'idle' | 'checking' | 'up-to-date' }
  | { phase: 'available'; version: string }
  | { phase: 'downloading'; version?: string; progress: number }
  | { phase: 'downloaded'; version: string }
  | { phase: 'error'; message: string }

const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 420
const SIDEBAR_DEFAULT = 210

function AppShell() {
  const { state, dispatch } = useApp()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Snip | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const [collapsed, setCollapsed] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [pendingNav, setPendingNav] = useState<PendingNav | null>(null)
  const [updateCard, setUpdateCard] = useState<UpdateCardState>({ phase: 'idle' })
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const editorRef = useRef<SnipEditorHandle>(null)
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

  // macOS main-panel navbar: custom drag + double-click via IPC.
  // We use 'drag-region' (not -webkit-app-region:drag) so JS receives all pointer events.
  useEffect(() => {
    if (window.api?.platform !== 'darwin') return

    let lastDown = 0
    let dragStartX = 0
    let dragStartY = 0
    let dragging = false

    function onMouseMove(e: MouseEvent) {
      if (!dragging) {
        const dx = e.screenX - dragStartX
        const dy = e.screenY - dragStartY
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragging = true
      }
      if (dragging) window.api?.dragMove?.(e.screenX, e.screenY)
    }

    function onMouseUp() {
      if (dragging) window.api?.dragEnd?.()
      dragging = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return
      let node = e.target as HTMLElement | null
      while (node) {
        if (node.classList.contains('app-no-drag')) return
        if (node.classList.contains('drag-region')) {
          const now = Date.now()
          if (now - lastDown < 500) { window.api?.titlebarDoubleClick?.(); lastDown = 0 }
          else lastDown = now
          dragStartX = e.screenX
          dragStartY = e.screenY
          dragging = false
          window.api?.dragStart?.(e.screenX, e.screenY)
          window.addEventListener('mousemove', onMouseMove)
          window.addEventListener('mouseup', onMouseUp)
          return
        }
        node = node.parentElement
      }
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  useEffect(() => {
    const updates = window.api?.updates
    if (!updates) return
    return updates.onEvent((payload) => {
      if (payload.type === 'checking') {
        setUpdateCard({ phase: 'checking' })
      } else if (payload.type === 'available') {
        setUpdateDismissed(false)
        setUpdateCard({ phase: 'available', version: payload.version })
      } else if (payload.type === 'not-available') {
        setUpdateCard({ phase: 'up-to-date' })
      } else if (payload.type === 'download-progress') {
        setUpdateDismissed(false)
        setUpdateCard((prev) => ({
          phase: 'downloading',
          version:
            prev.phase === 'available' || prev.phase === 'downloaded' || prev.phase === 'downloading'
              ? prev.version
              : undefined,
          progress: payload.percent,
        }))
      } else if (payload.type === 'downloaded') {
        setUpdateDismissed(false)
        setUpdateCard({ phase: 'downloaded', version: payload.version })
      } else if (payload.type === 'error') {
        setUpdateDismissed(false)
        setUpdateCard({ phase: 'error', message: payload.message })
      }
    })
  }, [])

  useEffect(() => {
    const updates = window.api?.updates
    if (!updates || !window.api?.isPackaged || !state.autoUpdateEnabled) return
    updates.check()
    const id = setInterval(() => {
      updates.check()
    }, 6 * 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [state.autoUpdateEnabled])

  async function startUpdateDownload() {
    if (!window.api?.updates) return
    await window.api.updates.download()
  }

  async function installDownloadedUpdate() {
    if (!window.api?.updates) return
    await window.api.updates.install()
  }

  // Global shortcut: N = new snip
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault()
        setTrashOpen(false)
        setHelpOpen(false)
        setEditTarget(null)
        setCreateOpen(true)
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

  // Close trash and help whenever the user navigates to a folder
  useEffect(() => {
    setTrashOpen(false)
    setHelpOpen(false)
  }, [state.selectedFolderId])

  const isEditorOpen = createOpen || editTarget !== null

  function requestSelectFolder(id: string | null) {
    if (isEditorOpen && editorRef.current?.isDirty) {
      setPendingNav({ type: 'folder', id })
      return
    }
    if (isEditorOpen) {
      setCreateOpen(false)
      setEditTarget(null)
    }
    dispatch({ type: 'SELECT_FOLDER', payload: { id } })
    setTrashOpen(false)
    setHelpOpen(false)
  }

  function toggleTrash() {
    if (isEditorOpen && editorRef.current?.isDirty) {
      setPendingNav({ type: 'trash' })
      return
    }
    if (isEditorOpen) {
      setCreateOpen(false)
      setEditTarget(null)
    }
    setTrashOpen((v) => !v)
  }

  function executePendingNav(save: boolean) {
    if (save) editorRef.current?.save()
    setCreateOpen(false)
    setEditTarget(null)
    if (pendingNav?.type === 'folder') {
      dispatch({ type: 'SELECT_FOLDER', payload: { id: pendingNav.id } })
      setTrashOpen(false)
    } else if (pendingNav?.type === 'trash') {
      setTrashOpen(true)
    }
    setPendingNav(null)
  }

  function openEditor(snip: Snip) {
    setCreateOpen(false)
    setTrashOpen(false)
    setHelpOpen(false)
    setEditTarget(snip)
  }

  function openCreateEditor() {
    setTrashOpen(false)
    setHelpOpen(false)
    setEditTarget(null)
    setCreateOpen(true)
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
        <div style={{ width: sidebarWidth }} className="h-full">
          <Sidebar onCollapse={toggleCollapse} trashOpen={trashOpen} onTrashClick={toggleTrash} onSelectFolder={requestSelectFolder} />
        </div>
      </div>

      {/* Resize + toggle handle */}
      <div
        className="flex-shrink-0 relative group z-10"
        style={{ width: collapsed ? 0 : 4 }}
        onMouseDown={startResize}
      >
        <div className="absolute inset-0 bg-border group-hover:bg-accent/40 transition-colors cursor-ew-resize" />
      </div>

      {/* Unsaved-changes nav guard */}
      {pendingNav && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <div className="bg-panel border border-border rounded-2xl shadow-2xl p-5 w-80 animate-pop">
            <h3 className="text-sm font-semibold text-fg mb-1">Unsaved changes</h3>
            <p className="text-xs text-muted mb-5">You have unsaved changes. Save before leaving?</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => executePendingNav(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors bg-accent/10 text-accent border-accent/25 hover:bg-accent/20 hover:border-accent/50"
              >
                Save & Leave
              </button>
              <button
                onClick={() => setPendingNav(null)}
                className="px-3 py-1.5 text-xs font-medium text-fg-2 hover:text-fg rounded-lg border border-border hover:border-fg/30 hover:bg-fg/8 transition-colors"
              >
                Keep Editing
              </button>
              <button
                onClick={() => executePendingNav(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors bg-red-500/10 text-red-500 border-red-500/25 hover:bg-red-500/20 hover:border-red-500/50"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main panel */}
      <div className="flex-1 overflow-hidden relative">
        <div
          key={createOpen ? `create-${state.selectedFolderId ?? 'all'}` : editTarget ? `edit-${editTarget.id}` : trashOpen ? 'trash' : helpOpen ? 'help' : 'grid'}
          className="h-full view-enter"
        >
          {createOpen ? (
            <SnipEditorView
              ref={editorRef}
              mode="create"
              initialFolderId={state.selectedFolderId ?? ''}
              collapsed={collapsed}
              onToggleSidebar={toggleCollapse}
              onClose={() => setCreateOpen(false)}
            />
          ) : editTarget ? (
            <SnipEditorView
              ref={editorRef}
              mode="edit"
              snip={editTarget}
              collapsed={collapsed}
              onToggleSidebar={toggleCollapse}
              onClose={() => setEditTarget(null)}
            />
          ) : trashOpen ? (
            <TrashView collapsed={collapsed} onToggleSidebar={toggleCollapse} onOpenHelp={() => setHelpOpen(true)} />
          ) : helpOpen ? (
            <HelpView collapsed={collapsed} onToggleSidebar={toggleCollapse} onOpenHelp={() => setHelpOpen(true)} onGoHome={() => setHelpOpen(false)} />
          ) : (
            <SnipGrid onAdd={openCreateEditor} onEdit={openEditor} collapsed={collapsed} onToggleSidebar={toggleCollapse} onOpenHelp={() => setHelpOpen(true)} />
          )}
        </div>

        {!updateDismissed && (updateCard.phase === 'available' || updateCard.phase === 'downloading' || updateCard.phase === 'downloaded' || updateCard.phase === 'error') && (
          <div className="absolute bottom-4 right-4 z-50 w-80 rounded-xl border border-border bg-panel shadow-2xl p-3 app-no-drag update-card-enter">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-fg">
                  {updateCard.phase === 'available' && `Update available${updateCard.version ? ` (v${updateCard.version})` : ''}`}
                  {updateCard.phase === 'downloading' && 'Downloading update'}
                  {updateCard.phase === 'downloaded' && `Ready to install${updateCard.version ? ` (v${updateCard.version})` : ''}`}
                  {updateCard.phase === 'error' && 'Update failed'}
                </p>
                <p className="text-[11px] text-muted mt-1">
                  {updateCard.phase === 'available' && 'A newer version of Snipper is available.'}
                  {updateCard.phase === 'downloading' && `${Math.max(0, Math.min(100, Math.round(updateCard.progress)))}% downloaded`}
                  {updateCard.phase === 'downloaded' && 'Restart Snipper to apply the update.'}
                  {updateCard.phase === 'error' && updateCard.message}
                </p>
              </div>
              <button
                onClick={() => setUpdateDismissed(true)}
                className="p-1 rounded-md text-muted hover:text-fg hover:bg-fg/8 transition-colors"
                title="Dismiss"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-2.5 flex items-center gap-2 justify-end">
              {updateCard.phase === 'available' && (
                <button
                  onClick={startUpdateDownload}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors bg-accent hover:bg-accent-h text-white border-accent/60"
                >
                  Download update
                </button>
              )}
              {updateCard.phase === 'downloaded' && (
                <button
                  onClick={installDownloadedUpdate}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors bg-accent hover:bg-accent-h text-white border-accent/60"
                >
                  Restart to install
                </button>
              )}
              {updateCard.phase === 'error' && (
                <button
                  onClick={() => window.api?.updates?.check()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-fg-2 hover:text-fg hover:bg-fg/8 transition-colors"
                >
                  Check again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
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
