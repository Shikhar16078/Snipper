import { useState, useMemo } from 'react'
import { useApp } from '../../store/AppContext'
import { flattenFolders, getAllDescendantIds } from '../../utils/folders'
import { Settings } from '../ui/Settings'

interface ExportViewProps {
  collapsed: boolean
  onToggleSidebar: () => void
  onClose: () => void
  onOpenImport: () => void
  onOpenHelp: () => void
}

type CheckState = 'checked' | 'unchecked' | 'indeterminate'

function SelectionDot({ state }: { state: CheckState }) {
  return (
    <div
      className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-150 ${
        state === 'checked'
          ? 'bg-accent'
          : state === 'indeterminate'
            ? 'bg-accent/35 border border-accent/60'
            : 'bg-fg/8 border border-border'
      }`}
    >
      {state === 'checked' && (
        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {state === 'indeterminate' && (
        <div className="w-1.5 h-0.5 bg-accent rounded-full" />
      )}
    </div>
  )
}

export function ExportView({ collapsed, onClose, onOpenHelp }: ExportViewProps) {
  const { state } = useApp()
  const isMac = (window as any).api?.platform === 'darwin'

  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const rec: Record<string, boolean> = {}
    state.snips.forEach((s) => { rec[s.id] = true })
    return rec
  })
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(state.folders.map((f) => f.id)))

  const flatFolders = useMemo(() => flattenFolders(state.folders), [state.folders])

  function getSnipIdsInFolder(folderId: string): string[] {
    const ids = [folderId, ...getAllDescendantIds(folderId, state.folders)]
    return state.snips.filter((s) => ids.includes(s.folderId)).map((s) => s.id)
  }

  function getFolderCheckState(folderId: string): CheckState {
    const snipIds = getSnipIdsInFolder(folderId)
    if (snipIds.length === 0) return 'unchecked'
    const checkedCount = snipIds.filter((id) => selected[id]).length
    if (checkedCount === 0) return 'unchecked'
    if (checkedCount === snipIds.length) return 'checked'
    return 'indeterminate'
  }

  function toggleFolder(folderId: string) {
    const snipIds = getSnipIdsInFolder(folderId)
    const newVal = getFolderCheckState(folderId) !== 'checked'
    setSelected((prev) => {
      const next = { ...prev }
      snipIds.forEach((id) => { next[id] = newVal })
      return next
    })
  }

  function toggleSnip(snipId: string) {
    setSelected((prev) => ({ ...prev, [snipId]: !prev[snipId] }))
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const allSelected = selectedCount === state.snips.length && state.snips.length > 0
  const noneSelected = selectedCount === 0

  function selectAll() {
    setSelected((prev) => {
      const next = { ...prev }
      state.snips.forEach((s) => { next[s.id] = true })
      return next
    })
  }

  function selectNone() {
    setSelected((prev) => {
      const next = { ...prev }
      state.snips.forEach((s) => { next[s.id] = false })
      return next
    })
  }

  function handleExport() {
    const selectedSnips = state.snips.filter((s) => selected[s.id])
    const neededFolderIds = new Set<string>()
    const folderMap = new Map(state.folders.map((f) => [f.id, f]))

    function addAncestors(folderId: string) {
      if (!folderId || neededFolderIds.has(folderId)) return
      neededFolderIds.add(folderId)
      const folder = folderMap.get(folderId)
      if (folder?.parentId) addAncestors(folder.parentId)
    }

    selectedSnips.forEach((s) => addAncestors(s.folderId))
    const exportFolders = state.folders.filter((f) => neededFolderIds.has(f.id))

    const payload = {
      _snipperExport: true,
      version: '1',
      exportedAt: Date.now(),
      folders: exportFolders,
      snips: selectedSnips,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `snipper-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const unfiledSnips = state.snips.filter((s) => !state.folders.some((f) => f.id === s.folderId))
  const unfiledSelected = unfiledSnips.filter((s) => selected[s.id]).length
  const unfiledCheckState: CheckState =
    unfiledSelected === 0 ? 'unchecked'
    : unfiledSelected === unfiledSnips.length ? 'checked'
    : 'indeterminate'

  function toggleUnfiled() {
    const newVal = unfiledCheckState !== 'checked'
    setSelected((prev) => {
      const next = { ...prev }
      unfiledSnips.forEach((s) => { next[s.id] = newVal })
      return next
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface">
      {/* Navbar */}
      <div
        className={`flex items-center gap-2 pr-4 border-b border-border flex-shrink-0 transition-[padding] duration-200 ${
          isMac
            ? `drag-region select-none h-[40px] ${collapsed ? 'pl-[80px]' : 'pl-4'}`
            : 'py-2.5 pl-4'
        }`}
      >
        <button
          onClick={onClose}
          className="p-1 -ml-0.5 rounded-md text-muted hover:text-fg hover:bg-fg/8 transition-colors app-no-drag"
          title="Back"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-1.5 bg-panel border border-border shadow-sm rounded-lg px-2.5 h-[26px] mr-1">
          <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <h2 className="text-xs font-bold text-fg tracking-wide whitespace-nowrap">Export Snips</h2>
        </div>

        <div className="flex-1" />

        <button
          onClick={handleExport}
          disabled={selectedCount === 0}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors app-no-drag flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Export
          {selectedCount > 0 && (
            <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums">
              {selectedCount}
            </span>
          )}
        </button>

        <Settings onOpenHelp={onOpenHelp} />
      </div>

      {/* Empty state */}
      {state.snips.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-8 select-none">
          <div className="w-12 h-12 rounded-2xl bg-panel border border-border flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-fg mb-1">No snips to export</p>
          <p className="text-xs text-muted">Create some snips first, then export them here.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sticky selection bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-panel/40 backdrop-blur-sm flex-shrink-0 sticky top-0 z-10">
            <span className="text-xs text-fg-2">
              <span className="font-semibold text-fg tabular-nums">{selectedCount}</span>
              <span className="text-muted"> of {state.snips.length} snip{state.snips.length !== 1 ? 's' : ''} selected</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={selectAll}
                disabled={allSelected}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-accent hover:bg-accent/8"
              >
                All
              </button>
              <div className="w-px h-3 bg-border" />
              <button
                onClick={selectNone}
                disabled={noneSelected}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-fg-2 hover:text-fg hover:bg-fg/8"
              >
                None
              </button>
            </div>
          </div>

          {/* Folder cards */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {flatFolders.map(({ folder, depth }) => {
              const folderSnips = state.snips.filter((s) => s.folderId === folder.id)
              const checkState = getFolderCheckState(folder.id)
              const isExpanded = expanded.has(folder.id)
              const selectedInFolder = folderSnips.filter((s) => selected[s.id]).length

              return (
                <div
                  key={folder.id}
                  className={`rounded-xl border overflow-hidden transition-all duration-150 ${
                    checkState === 'checked'
                      ? 'border-accent/40 bg-accent/5'
                      : checkState === 'indeterminate'
                        ? 'border-accent/20 bg-accent/3'
                        : 'border-border bg-panel'
                  }`}
                  style={{ marginLeft: `${depth * 20}px` }}
                >
                  {/* Folder header */}
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleFolder(folder.id)}
                      className="flex items-center gap-3 flex-1 min-w-0 px-4 py-3 transition-colors hover:bg-fg/4 text-left"
                    >
                      <SelectionDot state={checkState} />

                      <svg
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          checkState !== 'unchecked' ? 'text-accent' : 'text-muted'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                      </svg>

                      <span
                        className={`text-sm font-semibold flex-1 min-w-0 truncate transition-colors ${
                          checkState !== 'unchecked' ? 'text-fg' : 'text-fg-2'
                        }`}
                      >
                        {folder.name}
                      </span>

                      {folderSnips.length > 0 && (
                        <span
                          className={`text-[10px] font-semibold tabular-nums flex-shrink-0 px-1.5 py-0.5 rounded-md transition-colors ${
                            checkState === 'checked'
                              ? 'bg-accent/15 text-accent'
                              : checkState === 'indeterminate'
                                ? 'bg-accent/10 text-accent/70'
                                : 'bg-fg/8 text-muted'
                          }`}
                        >
                          {selectedInFolder}/{folderSnips.length}
                        </span>
                      )}
                    </button>

                    {folderSnips.length > 0 && (
                      <button
                        onClick={() =>
                          setExpanded((prev) => {
                            const next = new Set(prev)
                            if (next.has(folder.id)) next.delete(folder.id)
                            else next.add(folder.id)
                            return next
                          })
                        }
                        className="px-3 py-3 text-muted hover:text-fg transition-colors flex-shrink-0"
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Snip rows */}
                  {isExpanded && folderSnips.length > 0 && (
                    <div className="border-t border-border/40">
                      {folderSnips.map((snip, i) => {
                        const isSelected = !!selected[snip.id]
                        return (
                          <button
                            key={snip.id}
                            onClick={() => toggleSnip(snip.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              i < folderSnips.length - 1 ? 'border-b border-border/25' : ''
                            } ${isSelected ? 'bg-accent/5 hover:bg-accent/8' : 'hover:bg-fg/4'}`}
                          >
                            {/* Left accent bar */}
                            <div
                              className={`w-0.5 h-4 rounded-full flex-shrink-0 transition-colors ${
                                isSelected ? 'bg-accent' : 'bg-transparent'
                              }`}
                            />

                            <svg
                              className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                                isSelected ? 'text-accent/60' : 'text-muted/50'
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>

                            <span
                              className={`text-xs flex-1 min-w-0 truncate transition-colors ${
                                isSelected ? 'text-fg font-medium' : 'text-fg-2'
                              }`}
                            >
                              {snip.name}
                            </span>

                            {isSelected && (
                              <svg className="w-3 h-3 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Unfiled snips */}
            {unfiledSnips.length > 0 && (
              <div
                className={`rounded-xl border overflow-hidden transition-all duration-150 ${
                  unfiledCheckState === 'checked'
                    ? 'border-accent/40 bg-accent/5'
                    : unfiledCheckState === 'indeterminate'
                      ? 'border-accent/20 bg-accent/3'
                      : 'border-border bg-panel'
                }`}
              >
                <div className="flex items-center">
                  <button
                    onClick={toggleUnfiled}
                    className="flex items-center gap-3 flex-1 min-w-0 px-4 py-3 transition-colors hover:bg-fg/4 text-left"
                  >
                    <SelectionDot state={unfiledCheckState} />
                    <svg className="w-4 h-4 flex-shrink-0 text-muted/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-semibold text-muted italic flex-1">Unfiled</span>
                    <span
                      className={`text-[10px] font-semibold tabular-nums flex-shrink-0 px-1.5 py-0.5 rounded-md ${
                        unfiledCheckState === 'checked' ? 'bg-accent/15 text-accent' : 'bg-fg/8 text-muted'
                      }`}
                    >
                      {unfiledSelected}/{unfiledSnips.length}
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      setExpanded((prev) => {
                        const next = new Set(prev)
                        if (next.has('__unfiled__')) next.delete('__unfiled__')
                        else next.add('__unfiled__')
                        return next
                      })
                    }
                    className="px-3 py-3 text-muted hover:text-fg transition-colors flex-shrink-0"
                  >
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded.has('__unfiled__') ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {expanded.has('__unfiled__') && (
                  <div className="border-t border-border/40">
                    {unfiledSnips.map((snip, i) => {
                      const isSelected = !!selected[snip.id]
                      return (
                        <button
                          key={snip.id}
                          onClick={() => toggleSnip(snip.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            i < unfiledSnips.length - 1 ? 'border-b border-border/25' : ''
                          } ${isSelected ? 'bg-accent/5 hover:bg-accent/8' : 'hover:bg-fg/4'}`}
                        >
                          <div
                            className={`w-0.5 h-4 rounded-full flex-shrink-0 transition-colors ${
                              isSelected ? 'bg-accent' : 'bg-transparent'
                            }`}
                          />
                          <svg
                            className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                              isSelected ? 'text-accent/60' : 'text-muted/50'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span
                            className={`text-xs flex-1 min-w-0 truncate transition-colors ${
                              isSelected ? 'text-fg font-medium' : 'text-fg-2'
                            }`}
                          >
                            {snip.name}
                          </span>
                          {isSelected && (
                            <svg className="w-3 h-3 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
