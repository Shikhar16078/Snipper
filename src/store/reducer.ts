import type { AppState, Folder, Tag, TrashedFolder, TrashedSnip } from '../types'
import type { Action } from './actions'
import { generateId } from '../utils/id'


function sanitizeLinkTitles(linkTitles?: Record<string, string>): Record<string, string> | undefined {
  if (!linkTitles) return undefined
  const entries = Object.entries(linkTitles)
    .map(([url, title]) => [url, title.trim()] as const)
    .filter(([, title]) => title.length > 0)
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function getAllDescendantIds(folderId: string, folders: Folder[]): string[] {
  const children = folders.filter((f) => f.parentId === folderId)
  return children.flatMap((c) => [c.id, ...getAllDescendantIds(c.id, folders)])
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload

    case 'ADD_FOLDER': {
      const id = generateId()
      const parentId = action.payload.parentId ?? null
      return {
        ...state,
        folders: [
          ...state.folders,
          { id, name: action.payload.name, parentId, createdAt: Date.now() },
        ],
        selectedFolderId: id,
      }
    }

    case 'RENAME_FOLDER':
      return {
        ...state,
        folders: state.folders.map((f) =>
          f.id === action.payload.id ? { ...f, name: action.payload.name } : f,
        ),
      }

    case 'DELETE_FOLDER': {
      const toDelete = [action.payload.id, ...getAllDescendantIds(action.payload.id, state.folders)]
      const trashedEntry: TrashedFolder = {
        id: action.payload.id,
        type: 'folder',
        deletedAt: Date.now(),
        folders: state.folders.filter((f) => toDelete.includes(f.id)),
        snips: state.snips.filter((s) => toDelete.includes(s.folderId)),
        dividers: state.dividers.filter((d) => d.afterFolderId !== null && toDelete.includes(d.afterFolderId)),
      }
      return {
        ...state,
        folders: state.folders.filter((f) => !toDelete.includes(f.id)),
        snips: state.snips.filter((s) => !toDelete.includes(s.folderId)),
        dividers: state.dividers.filter((d) => d.afterFolderId === null || !toDelete.includes(d.afterFolderId)),
        trash: [trashedEntry, ...state.trash],
        selectedFolderId: toDelete.includes(state.selectedFolderId ?? '')
          ? null
          : state.selectedFolderId,
      }
    }

    case 'REORDER_FOLDER': {
      const { sourceId, afterId, parentId } = action.payload
      if (sourceId === afterId) return state

      const sourceIndex = state.folders.findIndex(f => f.id === sourceId)
      if (sourceIndex === -1) return state

      const descendants = getAllDescendantIds(sourceId, state.folders)
      if (parentId === sourceId || (parentId && descendants.includes(parentId))) return state

      const folderToMove = { ...state.folders[sourceIndex], parentId }
      const newFolders = [...state.folders]
      newFolders.splice(sourceIndex, 1)

      let insertIndex = 0
      if (afterId !== null) {
        const afterIndex = newFolders.findIndex(f => f.id === afterId)
        if (afterIndex !== -1) {
          insertIndex = afterIndex + 1
        }
      } else {
        if (parentId === null) {
          const firstRootIndex = newFolders.findIndex(f => f.parentId === null)
          insertIndex = firstRootIndex !== -1 ? firstRootIndex : 0
        } else {
          const firstChildIndex = newFolders.findIndex(f => f.parentId === parentId)
          if (firstChildIndex !== -1) {
            insertIndex = firstChildIndex
          } else {
            const pIndex = newFolders.findIndex(f => f.id === parentId)
            insertIndex = pIndex !== -1 ? pIndex + 1 : newFolders.length
          }
        }
      }

      newFolders.splice(insertIndex, 0, folderToMove)

      return {
        ...state,
        folders: newFolders,
      }
    }

    case 'SELECT_FOLDER':
      return { ...state, selectedFolderId: action.payload.id, selectedTagId: null }

    case 'ADD_TAG': {
      const tag: Tag = { id: action.payload.id ?? generateId(), name: action.payload.name, color: action.payload.color }
      return { ...state, tags: [...state.tags, tag] }
    }

    case 'EDIT_TAG':
      return {
        ...state,
        tags: state.tags.map((t) => t.id === action.payload.id ? { ...t, name: action.payload.name, color: action.payload.color } : t),
      }

    case 'DELETE_TAG': {
      const id = action.payload.id
      return {
        ...state,
        tags: state.tags.filter((t) => t.id !== id),
        snips: state.snips.map((s) => ({ ...s, tagIds: s.tagIds?.filter((tid) => tid !== id) })),
        selectedTagId: state.selectedTagId === id ? null : state.selectedTagId,
      }
    }

    case 'SELECT_TAG':
      return { ...state, selectedTagId: action.payload.id, selectedFolderId: null }

    case 'SET_SNIP_TAGS':
      return {
        ...state,
        snips: state.snips.map((s) => s.id === action.payload.snipId ? { ...s, tagIds: action.payload.tagIds } : s),
      }

    case 'REORDER_TAG': {
      const { sourceId, afterId } = action.payload
      if (sourceId === afterId) return state
      const tags = [...state.tags]
      const sourceIdx = tags.findIndex(t => t.id === sourceId)
      if (sourceIdx === -1) return state
      const [moved] = tags.splice(sourceIdx, 1)
      if (afterId === null) {
        tags.unshift(moved)
      } else {
        const afterIdx = tags.findIndex(t => t.id === afterId)
        tags.splice(afterIdx + 1, 0, moved)
      }
      return { ...state, tags }
    }

    case 'ADD_SNIP':
      return {
        ...state,
        snips: [
          ...state.snips,
          {
            id: action.payload.id ?? generateId(),
            folderId: action.payload.folderId,
            name: action.payload.name,
            body: action.payload.body,
            linkTitles: sanitizeLinkTitles(action.payload.linkTitles),
            tagIds: action.payload.tagIds,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      }

    case 'EDIT_SNIP':
      return {
        ...state,
        snips: state.snips.map((s) =>
          s.id === action.payload.id
            ? {
                ...s,
                name: action.payload.name,
                body: action.payload.body,
                folderId: action.payload.folderId,
                linkTitles: sanitizeLinkTitles(action.payload.linkTitles),
                ...(action.payload.tagIds !== undefined ? { tagIds: action.payload.tagIds } : {}),
                updatedAt: Date.now(),
              }
            : s,
        ),
      }

    case 'DELETE_SNIP': {
      const snip = state.snips.find((s) => s.id === action.payload.id)
      if (!snip) return state
      const trashedEntry: TrashedSnip = { id: snip.id, type: 'snip', deletedAt: Date.now(), snip }
      return {
        ...state,
        snips: state.snips.filter((s) => s.id !== action.payload.id),
        trash: [trashedEntry, ...state.trash],
      }
    }

    case 'MOVE_SNIP':
      return {
        ...state,
        snips: state.snips.map((s) =>
          s.id === action.payload.id
            ? { ...s, folderId: action.payload.folderId, updatedAt: Date.now() }
            : s,
        ),
      }

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload.mode }

    case 'SET_THEME':
      return { ...state, theme: action.payload.theme }

    case 'SET_ALL_SNIPS_LABEL':
      return { ...state, allSnipsLabel: action.payload.label.trim() || state.allSnipsLabel }

    case 'SET_TIPS_ENABLED':
      return { ...state, tipsEnabled: action.payload }

    case 'SET_DELETE_CONFIRM_ENABLED':
      return { ...state, deleteConfirmEnabled: action.payload }

    case 'SET_HOLD_ACTION':
      return { ...state, holdAction: action.payload }

    case 'SET_TRASH_AUTO_PURGE':
      return { ...state, trashAutoPurge: action.payload }

    case 'SET_AUTO_UPDATE_ENABLED':
      return { ...state, autoUpdateEnabled: action.payload }

    case 'SET_SNIP_SORT':
      return { ...state, snipSort: action.payload }

    case 'TOGGLE_PIN_SNIP':
      return {
        ...state,
        snips: state.snips.map((s) =>
          s.id === action.payload.id ? { ...s, pinned: !s.pinned } : s,
        ),
      }

    case 'DUPLICATE_SNIP': {
      const src = state.snips.find((s) => s.id === action.payload.id)
      if (!src) return state
      const now = Date.now()
      return {
        ...state,
        snips: [
          ...state.snips,
          {
            ...src,
            id: generateId(),
            name: `${src.name} (copy)`,
            pinned: false,
            copyCount: undefined,
            lastCopiedAt: undefined,
            createdAt: now,
            updatedAt: now,
          },
        ],
      }
    }

    case 'RECORD_COPY':
      return {
        ...state,
        snips: state.snips.map((s) =>
          s.id === action.payload.id
            ? { ...s, copyCount: (s.copyCount ?? 0) + 1, lastCopiedAt: Date.now() }
            : s,
        ),
      }

    case 'PURGE_EXPIRED_TRASH': {
      if (state.trashAutoPurge === null) return state
      const cutoff = Date.now() - state.trashAutoPurge
      return { ...state, trash: state.trash.filter((t) => t.deletedAt > cutoff) }
    }

    case 'IMPORT_DATA':
      return {
        ...state,
        folders: [...state.folders, ...action.payload.folders],
        snips:   [...state.snips,   ...action.payload.snips],
      }

    case 'TOGGLE_EDIT_MODE':
      return { ...state, isEditMode: !state.isEditMode }

    case 'ADD_DIVIDER':
      return { ...state, dividers: [...state.dividers, { id: generateId(), afterFolderId: action.payload.afterFolderId }] }

    case 'MOVE_DIVIDER':
      return { ...state, dividers: state.dividers.map((d) => d.id === action.payload.id ? { ...d, afterFolderId: action.payload.afterFolderId } : d) }

    case 'REMOVE_DIVIDER':
      return { ...state, dividers: state.dividers.filter((d) => d.id !== action.payload.id) }

    case 'RESTORE_TRASH_ITEM': {
      const item = state.trash.find((t) => t.id === action.payload.id)
      if (!item) return state
      const remaining = state.trash.filter((t) => t.id !== action.payload.id)
      if (item.type === 'snip') {
        return { ...state, snips: [...state.snips, item.snip], trash: remaining }
      }
      return {
        ...state,
        folders: [...state.folders, ...item.folders],
        snips: [...state.snips, ...item.snips],
        dividers: [...state.dividers, ...item.dividers],
        trash: remaining,
      }
    }

    case 'RESTORE_ALL_TRASH': {
      let folders = [...state.folders]
      let snips = [...state.snips]
      let dividers = [...state.dividers]
      for (const item of state.trash) {
        if (item.type === 'snip') {
          snips = [...snips, item.snip]
        } else {
          folders = [...folders, ...item.folders]
          snips = [...snips, ...item.snips]
          dividers = [...dividers, ...item.dividers]
        }
      }
      return { ...state, folders, snips, dividers, trash: [] }
    }

    case 'PERMANENTLY_DELETE_TRASH_ITEM':
      return { ...state, trash: state.trash.filter((t) => t.id !== action.payload.id) }

    case 'EMPTY_TRASH':
      return { ...state, trash: [] }

    default:
      return state
  }
}
