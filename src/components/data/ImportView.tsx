import { useState, useRef, useCallback } from 'react'
import { useApp } from '../../store/AppContext'
import { Settings } from '../ui/Settings'
import { generateId } from '../../utils/id'
import type { Folder, Section, Snip, Tag } from '../../types'

interface ImportViewProps {
  collapsed: boolean
  onToggleSidebar: () => void
  onClose: () => void
  onOpenExport: () => void
  onOpenHelp: () => void
}

interface ImportFile {
  _snipperExport: true
  version: string
  exportedAt: number
  folders: Folder[]
  snips: Snip[]
  sections?: Section[]
  tags?: Tag[]
}

interface ImportPreview {
  newFolders: Folder[]
  newSnips: Snip[]
  newSections: Section[]
  newTags: Tag[]
  skippedSnips: Snip[]
}

function getFolderPath(id: string, folders: Folder[]): string[] {
  const folder = folders.find((f) => f.id === id)
  if (!folder) return []
  if (folder.parentId === null) return [folder.name]
  return [...getFolderPath(folder.parentId, folders), folder.name]
}

function validateAndParse(raw: string): ImportFile {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('This file is not valid JSON. Please use a .json file exported from Snipper.')
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('This file is not compatible with Snipper. Only files exported via Settings → Export Snips can be imported.')
  }
  const d = data as Record<string, unknown>
  if (d._snipperExport !== true) {
    throw new Error("This file wasn't exported from Snipper. Go to Settings → Export Snips to create a compatible export file.")
  }
  if (!Array.isArray(d.folders) || !Array.isArray(d.snips)) {
    throw new Error('The file is missing required data. It may be corrupted or from an incompatible version of Snipper.')
  }
  for (const f of d.folders as unknown[]) {
    if (!f || typeof (f as Record<string, unknown>).id !== 'string' || typeof (f as Record<string, unknown>).name !== 'string') {
      throw new Error('The file contains invalid folder data and may be corrupted. Try re-exporting from Snipper.')
    }
  }
  for (const s of d.snips as unknown[]) {
    const snip = s as Record<string, unknown>
    if (!s || typeof snip.id !== 'string' || typeof snip.name !== 'string' || typeof snip.body !== 'string') {
      throw new Error('The file contains invalid snip data and may be corrupted. Try re-exporting from Snipper.')
    }
  }
  return data as ImportFile
}

// Full-metadata key: two snips are duplicates only when ALL meaningful fields match.
function snipKey(name: string, body: string, pinned: boolean | undefined, sectionId: string | null | undefined, tagIds: string[] | undefined): string {
  return [
    name,
    body,
    pinned ? '1' : '0',
    sectionId ?? '',
    [...(tagIds ?? [])].sort().join('\x01'),
  ].join('\0')
}

function computePreview(
  file: ImportFile,
  existingFolders: Folder[],
  existingSnips: Snip[],
  existingSections: Section[],
  existingTags: Tag[],
): ImportPreview {
  const existingPathToId = new Map<string, string>()
  existingFolders.forEach((f) => {
    const path = getFolderPath(f.id, existingFolders).join('\0')
    existingPathToId.set(path, f.id)
  })

  // Topological sort: root before children
  const depthMap = new Map<string, number>()
  const sorted: Folder[] = []
  let remaining = [...file.folders]

  while (remaining.length > 0) {
    const prev = remaining
    remaining = []
    for (const f of prev) {
      if (f.parentId === null || depthMap.has(f.parentId)) {
        depthMap.set(f.id, f.parentId === null ? 0 : (depthMap.get(f.parentId) ?? 0) + 1)
        sorted.push(f)
      } else {
        remaining.push(f)
      }
    }
    if (remaining.length === prev.length) break // cycle guard
  }

  const oldIdToNewId = new Map<string, string>()
  const importIdToPath = new Map<string, string[]>()
  const newFolders: Folder[] = []

  for (const f of sorted) {
    const parentPath = f.parentId ? (importIdToPath.get(f.parentId) ?? []) : []
    const myPath = [...parentPath, f.name]
    importIdToPath.set(f.id, myPath)
    const pathKey = myPath.join('\0')

    if (existingPathToId.has(pathKey)) {
      oldIdToNewId.set(f.id, existingPathToId.get(pathKey)!)
    } else {
      const newId = generateId()
      oldIdToNewId.set(f.id, newId)
      const newParentId = f.parentId ? (oldIdToNewId.get(f.parentId) ?? null) : null
      newFolders.push({
        id: newId,
        name: f.name,
        parentId: newParentId,
        createdAt: f.createdAt ?? Date.now(),
        defaultSectionName: f.defaultSectionName,
        defaultSectionOrder: f.defaultSectionOrder,
      })
    }
  }

  // Remap sections: if a same-named section already exists in the target folder, reuse its ID.
  // This handles both new folders (create) and existing folders (dedup by name).
  const oldSectionIdToNewId = new Map<string, string>()
  const newSections: Section[] = []

  for (const sec of (file.sections ?? [])) {
    const newFolderId = oldIdToNewId.get(sec.folderId)
    if (!newFolderId) continue
    const match = existingSections.find((s) => s.folderId === newFolderId && s.name === sec.name)
    if (match) {
      oldSectionIdToNewId.set(sec.id, match.id)
    } else {
      const newSectionId = generateId()
      oldSectionIdToNewId.set(sec.id, newSectionId)
      newSections.push({ ...sec, id: newSectionId, folderId: newFolderId })
    }
  }

  // Remap tags: match by name+color to dedup against existing tags
  const oldTagIdToNewId = new Map<string, string>()
  const newTags: Tag[] = []

  for (const tag of (file.tags ?? [])) {
    const match = existingTags.find((t) => t.name === tag.name && t.color === tag.color)
    if (match) {
      oldTagIdToNewId.set(tag.id, match.id)
    } else {
      const newTagId = generateId()
      oldTagIdToNewId.set(tag.id, newTagId)
      newTags.push({ ...tag, id: newTagId })
    }
  }

  // Build keys from existing snips — sectionId and tagIds are already in destination space.
  const existingKeys = new Set(
    existingSnips.map((s) => snipKey(s.name, s.body, s.pinned, s.sectionId, s.tagIds))
  )
  const newSnips: Snip[] = []
  const skippedSnips: Snip[] = []

  for (const s of file.snips) {
    // Remap IDs before dedup so comparison is in destination space.
    const remappedSectionId = s.sectionId ? (oldSectionIdToNewId.get(s.sectionId) ?? null) : null
    const remappedTagIds = (s.tagIds ?? []).map((id) => oldTagIdToNewId.get(id)).filter(Boolean) as string[]
    const key = snipKey(s.name, s.body, s.pinned, remappedSectionId, remappedTagIds)
    if (existingKeys.has(key)) {
      skippedSnips.push(s)
      continue
    }
    newSnips.push({
      ...s,
      id: generateId(),
      folderId: s.folderId ? (oldIdToNewId.get(s.folderId) ?? '') : '',
      sectionId: remappedSectionId,
      tagIds: remappedTagIds.length > 0 ? remappedTagIds : undefined,
    })
  }

  // Prune new folders that have no snips referencing them (directly or via ancestors).
  // referencedFolderIds covers both new and existing folders — sections for existing
  // folders are valid as long as snips land there.
  const referencedFolderIds = new Set<string>()
  const allFolderMap = new Map<string, Folder>([
    ...existingFolders.map((f) => [f.id, f] as [string, Folder]),
    ...newFolders.map((f) => [f.id, f] as [string, Folder]),
  ])

  function markAncestors(id: string) {
    if (!id || referencedFolderIds.has(id)) return
    referencedFolderIds.add(id)
    const f = allFolderMap.get(id)
    if (f?.parentId) markAncestors(f.parentId)
  }

  newSnips.forEach((s) => { if (s.folderId) markAncestors(s.folderId) })
  const prunedFolders = newFolders.filter((f) => referencedFolderIds.has(f.id))
  // Keep sections for any referenced folder (new or existing)
  const prunedSections = newSections.filter((s) => referencedFolderIds.has(s.folderId))

  return { newFolders: prunedFolders, newSnips, newSections: prunedSections, newTags, skippedSnips }
}

export function ImportView({ collapsed, onClose, onOpenHelp }: ImportViewProps) {
  const { state, dispatch } = useApp()
  const isMac = (window as any).api?.platform === 'darwin'
  const [phase, setPhase] = useState<'drop' | 'preview'>('drop')
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseFile = useCallback(
    (file: File) => {
      setError('')
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = validateAndParse(e.target?.result as string)
          const result = computePreview(data, state.folders, state.snips, state.sections, state.tags)
          setPreview(result)
          setFileName(file.name)
          setPhase('preview')
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to parse file.')
        }
      }
      reader.readAsText(file)
    },
    [state.folders, state.snips, state.sections, state.tags],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (!file) return
      if (!file.name.endsWith('.json')) {
        setError("Only .json files exported from Snipper can be imported. Drop a file from Settings → Export Snips.")
        return
      }
      parseFile(file)
    },
    [parseFile],
  )

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    parseFile(file)
    e.target.value = ''
  }

  function handleImport() {
    if (!preview) return
    dispatch({ type: 'IMPORT_DATA', payload: { folders: preview.newFolders, snips: preview.newSnips, sections: preview.newSections, tags: preview.newTags } })
    onClose()
  }

  function resetToDropPhase() {
    setPhase('drop')
    setPreview(null)
    setError('')
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
          onClick={phase === 'preview' ? resetToDropPhase : onClose}
          className="p-1 -ml-0.5 rounded-md text-muted hover:text-fg hover:bg-fg/8 transition-colors app-no-drag"
          title="Back"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-1.5 bg-panel border border-border shadow-sm rounded-lg px-2.5 h-[26px] mr-1">
          <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <h2 className="text-xs font-bold text-fg tracking-wide whitespace-nowrap">Import Snips</h2>
        </div>

        <div className="flex-1" />

        <Settings onOpenHelp={onOpenHelp} />
      </div>

      {/* Drop phase */}
      {phase === 'drop' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full max-w-md rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center py-16 px-8 text-center select-none ${
              isDragOver
                ? 'border-accent bg-accent/8 scale-[1.02]'
                : 'border-border hover:border-fg/30 hover:bg-fg/3'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 transition-colors ${
                isDragOver ? 'bg-accent/10 border-accent/30' : 'bg-panel border-border'
              }`}
            >
              <svg
                className={`w-7 h-7 transition-colors ${isDragOver ? 'text-accent' : 'text-muted'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-fg mb-1">Drop your export file here</p>
            <p className="text-xs text-muted">or click to browse</p>
            <p className="text-[10px] text-muted/60 mt-2">.json files exported from Snipper</p>
          </div>

          {error && (
            <div className="mt-4 w-full max-w-md px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 flex items-start gap-2">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-red-400 flex-1">{error}</p>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {/* Preview phase */}
      {phase === 'preview' && preview && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Summary bar */}
          <div className="px-5 py-3 border-b border-border/50 bg-panel/30 flex-shrink-0">
            <p className="text-[10px] text-muted mb-0.5 truncate">{fileName}</p>
            <p className="text-sm font-semibold text-fg">
              {preview.newSnips.length} snip{preview.newSnips.length !== 1 ? 's' : ''} to import
              {preview.newFolders.length > 0 &&
                ` · ${preview.newFolders.length} new folder${preview.newFolders.length !== 1 ? 's' : ''}`}
              {preview.newTags.length > 0 &&
                ` · ${preview.newTags.length} new tag${preview.newTags.length !== 1 ? 's' : ''}`}
              {preview.skippedSnips.length > 0 &&
                ` · ${preview.skippedSnips.length} duplicate${preview.skippedSnips.length !== 1 ? 's' : ''} skipped`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {preview.newFolders.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted/60 mb-2">
                  New Folders ({preview.newFolders.length})
                </p>
                <div className="space-y-1">
                  {preview.newFolders.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-panel border border-border">
                      <svg className="w-3.5 h-3.5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                      </svg>
                      <span className="text-xs text-fg">{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.newSnips.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted/60 mb-2">
                  Snips to Import ({preview.newSnips.length})
                </p>
                <div className="space-y-1">
                  {preview.newSnips.map((s) => (
                    <div key={s.id} className="px-3 py-2 rounded-lg bg-panel border border-border">
                      <p className="text-xs font-medium text-fg mb-0.5 truncate">{s.name}</p>
                      <p className="text-[11px] text-muted font-mono truncate">
                        {s.body.slice(0, 80)}{s.body.length > 80 ? '…' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.skippedSnips.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted/60 mb-2">
                  Already Exists — Skipped ({preview.skippedSnips.length})
                </p>
                <div className="space-y-1">
                  {preview.skippedSnips.map((s, i) => (
                    <div key={i} className="px-3 py-2 rounded-lg bg-panel/50 border border-border/50">
                      <p className="text-xs text-muted line-through truncate">{s.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.newSnips.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center select-none">
                <div className="w-12 h-12 rounded-2xl bg-panel border border-border flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-fg mb-1">Nothing new to import</p>
                <p className="text-xs text-muted">All snips in this file already exist.</p>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-border px-4 py-3 flex items-center justify-end gap-2">
            <button
              onClick={resetToDropPhase}
              className="px-3 py-1.5 text-xs font-medium text-fg-2 hover:text-fg rounded-lg border border-border hover:border-fg/30 hover:bg-fg/8 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={preview.newSnips.length === 0}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {preview.newSnips.length > 0
                ? `Import ${preview.newSnips.length} snip${preview.newSnips.length !== 1 ? 's' : ''}`
                : 'Nothing to import'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
