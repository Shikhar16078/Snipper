import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Snip } from '../../types'
import { useApp } from '../../store/AppContext'
import { Input } from '../ui/Input'
import { FolderSelect } from '../ui/FolderSelect'
import { Button } from '../ui/Button'
import { extractLinks, getDefaultLinkTitle } from '../../utils/links'

type EditorMode = 'create' | 'edit'

interface SnipEditorViewProps {
  mode: EditorMode
  snip?: Snip
  initialFolderId?: string
  collapsed: boolean
  onToggleSidebar: () => void
  onClose: () => void
}

interface CanonicalDraft {
  name: string
  body: string
  folderId: string
  linkTitles?: Record<string, string>
}

function canonicalizeLinkTitles(body: string, linkTitles?: Record<string, string>): Record<string, string> | undefined {
  const links = extractLinks(body)
  const entries: Array<[string, string]> = []

  for (const link of links) {
    const raw = linkTitles?.[link]
    if (!raw) continue
    const title = raw.trim()
    if (!title || title === getDefaultLinkTitle(link)) continue
    entries.push([link, title])
  }

  if (entries.length === 0) return undefined
  return Object.fromEntries(entries)
}

function linkTitleKey(titles?: Record<string, string>): string {
  if (!titles) return ''
  return JSON.stringify(Object.entries(titles).sort(([a], [b]) => a.localeCompare(b)))
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString()
}

const RIGHT_PANEL_DEFAULT = 320
const RIGHT_PANEL_MIN = 260
const RIGHT_PANEL_MAX = 520
const RIGHT_PANEL_AUTO_COLLAPSE_WIDTH = 960

function maxRightPanelWidth(viewportWidth: number): number {
  return Math.min(RIGHT_PANEL_MAX, Math.max(RIGHT_PANEL_MIN, Math.floor(viewportWidth * 0.45)))
}

function clampRightPanelWidth(width: number, viewportWidth: number): number {
  const max = maxRightPanelWidth(viewportWidth)
  return Math.min(max, Math.max(RIGHT_PANEL_MIN, width))
}

export function SnipEditorView({
  mode,
  snip,
  initialFolderId = '',
  collapsed,
  onToggleSidebar,
  onClose,
}: SnipEditorViewProps) {
  const { state, dispatch } = useApp()
  const isEditMode = mode === 'edit' && !!snip
  const currentSnip = snip

  const [name, setName] = useState(() => isEditMode && snip ? snip.name : '')
  const [body, setBody] = useState(() => isEditMode && snip ? snip.body : '')
  const [folderId, setFolderId] = useState(() => isEditMode && snip ? snip.folderId : initialFolderId)
  const [linkTitles, setLinkTitles] = useState<Record<string, string>>(() => isEditMode && snip ? (snip.linkTitles ?? {}) : {})
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [rightPanelWidth, setRightPanelWidth] = useState(() =>
    clampRightPanelWidth(RIGHT_PANEL_DEFAULT, window.innerWidth),
  )
  const [isRightResizingUI, setIsRightResizingUI] = useState(false)
  const isRightResizing = useRef(false)

  const isMac = window.api?.platform === 'darwin'
  const detectedLinks = useMemo(() => extractLinks(body), [body])

  useEffect(() => {
    setLinkTitles((prev) => {
      const next: Record<string, string> = {}
      for (const link of detectedLinks) {
        if (prev[link] !== undefined) next[link] = prev[link]
      }
      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(next)
      if (prevKeys.length === nextKeys.length && prevKeys.every((key) => prev[key] === next[key])) return prev
      return next
    })
  }, [detectedLinks])

  useEffect(() => {
    function onResize() {
      const vw = window.innerWidth
      setRightPanelWidth((prev) => clampRightPanelWidth(prev, vw))
      if (vw < RIGHT_PANEL_AUTO_COLLAPSE_WIDTH) {
        setRightPanelOpen(false)
      }
    }
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const startRightResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isRightResizing.current = true
    setIsRightResizingUI(true)
    const startX = e.clientX
    const startWidth = rightPanelWidth

    function onMove(ev: MouseEvent) {
      if (!isRightResizing.current) return
      const delta = startX - ev.clientX
      setRightPanelWidth(clampRightPanelWidth(startWidth + delta, window.innerWidth))
    }

    function onUp() {
      isRightResizing.current = false
      setIsRightResizingUI(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [rightPanelWidth])

  const originalCanonical: CanonicalDraft = useMemo(() => {
    if (isEditMode && currentSnip) {
      return {
        name: currentSnip.name.trim(),
        body: currentSnip.body,
        folderId: currentSnip.folderId,
        linkTitles: canonicalizeLinkTitles(currentSnip.body, currentSnip.linkTitles),
      }
    }
    return {
      name: '',
      body: '',
      folderId: initialFolderId,
      linkTitles: undefined,
    }
  }, [isEditMode, currentSnip, initialFolderId])

  const currentCanonical: CanonicalDraft = useMemo(() => {
    return {
      name: name.trim(),
      body,
      folderId,
      linkTitles: canonicalizeLinkTitles(body, linkTitles),
    }
  }, [name, body, folderId, linkTitles])

  const isDirty =
    originalCanonical.name !== currentCanonical.name ||
    originalCanonical.body !== currentCanonical.body ||
    originalCanonical.folderId !== currentCanonical.folderId ||
    linkTitleKey(originalCanonical.linkTitles) !== linkTitleKey(currentCanonical.linkTitles)

  const canSave = currentCanonical.name.length > 0 && currentCanonical.body.trim().length > 0

  function handleClose() {
    if (isDirty) { setShowDiscardDialog(true); return }
    onClose()
  }

  function handleSave() {
    if (!canSave) return
    if (isEditMode && currentSnip) {
      dispatch({
        type: 'EDIT_SNIP',
        payload: {
          id: currentSnip.id,
          name: currentCanonical.name,
          body: currentCanonical.body,
          folderId: currentCanonical.folderId,
          linkTitles: currentCanonical.linkTitles,
        },
      })
    } else {
      dispatch({
        type: 'ADD_SNIP',
        payload: {
          name: currentCanonical.name,
          body: currentCanonical.body,
          folderId: currentCanonical.folderId,
          linkTitles: currentCanonical.linkTitles,
        },
      })
    }
    onClose()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (canSave && isDirty) handleSave()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        if (showDiscardDialog) { setShowDiscardDialog(false); return }
        handleClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [canSave, isDirty, showDiscardDialog, dispatch, isEditMode, currentSnip, currentCanonical, onClose])

  const headerTitle = isEditMode && currentSnip ? currentSnip.name : 'New Snip'

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface">
      {showDiscardDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <div className="bg-panel border border-border rounded-2xl shadow-2xl p-5 w-72 animate-pop">
            <h3 className="text-sm font-semibold text-fg mb-1">Discard changes?</h3>
            <p className="text-xs text-muted mb-5">Your unsaved changes will be lost.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDiscardDialog(false)}
                className="px-3 py-1.5 text-xs font-medium text-fg-2 hover:text-fg rounded-lg border border-border hover:border-fg/30 hover:bg-fg/8 transition-colors"
              >
                Keep editing
              </button>
              <button
                onClick={() => { setShowDiscardDialog(false); onClose() }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors bg-red-500/10 text-red-500 border-red-500/25 hover:bg-red-500/20 hover:border-red-500/50"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className={`flex items-center gap-2 pr-4 border-b border-border flex-shrink-0 transition-[padding] duration-200 ${
          isMac ? `app-drag h-[40px] ${collapsed ? 'pl-[80px]' : 'pl-4'}` : 'py-2.5 pl-4'
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

        <div className="flex items-center gap-2 min-w-0 app-no-drag">
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-fg/8 transition-colors"
            title="Back to snips"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-fg truncate">{headerTitle}</p>
            <p className="text-[10px] text-muted">Editor</p>
          </div>
          {isDirty && (
            <span className="ml-1 text-[10px] font-semibold text-accent bg-accent/10 border border-accent/25 px-2 py-0.5 rounded-full">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setRightPanelOpen((v) => !v)}
          className={`p-1.5 rounded-md transition-colors app-no-drag ${
            rightPanelOpen
              ? 'text-accent bg-accent/10 hover:bg-accent/15'
              : 'text-muted hover:text-fg hover:bg-fg/8'
          }`}
          title={rightPanelOpen ? 'Hide side panel' : 'Show side panel'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth={1.8} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 4v16" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="min-h-0 flex-1 min-w-0 px-7 py-6">
          <div className="h-full max-w-3xl mx-auto flex flex-col">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Title"
              autoFocus
              className="w-full bg-transparent border-0 outline-none text-3xl leading-tight font-semibold text-fg placeholder:text-muted/70 px-0"
            />

            <div className="h-px bg-border/70 my-4" />

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Start writing..."
              className="snip-scroll flex-1 min-h-0 w-full resize-none bg-transparent border-0 outline-none text-[15px] leading-7 text-fg-2 placeholder:text-muted/75 px-0"
            />
          </div>
        </div>

        <div
          className="flex-shrink-0 relative group overflow-hidden"
          style={{
            width: rightPanelOpen ? 4 : 0,
            transition: isRightResizingUI ? 'none' : 'width 0.2s ease',
            cursor: rightPanelOpen ? 'col-resize' : 'default',
          }}
          onMouseDown={rightPanelOpen ? startRightResize : undefined}
          title={rightPanelOpen ? 'Resize side panel' : undefined}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-accent/60 transition-colors" />
        </div>

        <div
          className="flex-shrink-0 overflow-hidden"
          style={{
            width: rightPanelOpen ? rightPanelWidth : 0,
            transition: isRightResizingUI ? 'none' : 'width 0.2s ease',
          }}
        >
        <aside className="border-l border-border bg-panel/45 p-4 h-full flex flex-col gap-4" style={{ width: rightPanelWidth }}>
          <section className="flex-shrink-0 rounded-xl border border-border bg-panel p-3">
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold tracking-wide uppercase text-muted mb-1">Folder</label>
                <FolderSelect
                  folders={state.folders}
                  value={folderId}
                  onChange={setFolderId}
                  allSnipsLabel={state.allSnipsLabel || 'All Snips'}
                />
              </div>
              {isEditMode && currentSnip ? (
                <div className="text-[10px] text-muted">
                  <p>Created: {formatDate(currentSnip.createdAt)}</p>
                  <p>Updated: {formatDate(currentSnip.updatedAt)}</p>
                </div>
              ) : (
                <p className="text-[10px] text-muted">A new snippet will be created on save.</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button className="flex-1" onClick={handleSave} disabled={!isDirty || !canSave}>
                  {isEditMode ? 'Save' : 'Create'}
                </Button>
                <Button variant="ghost" className="flex-1" onClick={handleClose}>Cancel</Button>
              </div>
            </div>
          </section>

          <section className="min-h-0 flex flex-col rounded-xl border border-border bg-panel p-3">
            <h3 className="flex-shrink-0 text-xs font-semibold text-fg mb-2">Links ({detectedLinks.length})</h3>
            {detectedLinks.length === 0 ? (
              <p className="text-[11px] text-muted">No links detected in this snippet body.</p>
            ) : (
              <div className="snip-scroll min-h-0 overflow-y-auto space-y-2 pr-1">
                {detectedLinks.map((url) => (
                  <div key={url} className="rounded-lg border border-border bg-surface p-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-[10px] text-muted truncate flex-1" title={url}>{url}</p>
                      <button
                        onClick={() => {
                          if ((window as any).api?.openUrl) (window as any).api.openUrl(url)
                          else window.open(url, '_blank', 'noopener,noreferrer')
                        }}
                        className="text-accent hover:text-accent-h transition-colors"
                        title="Open link"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 4h6m0 0v6m0-6L10 14" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 14v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h6" />
                        </svg>
                      </button>
                    </div>
                    <Input
                      value={linkTitles[url] ?? ''}
                      onChange={(e) => setLinkTitles((prev) => ({ ...prev, [url]: e.target.value }))}
                      placeholder={getDefaultLinkTitle(url)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
        </div>
      </div>
    </div>
  )
}
