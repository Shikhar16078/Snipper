import type { AppState, Folder } from '../types'
import type { Action } from './actions'
import { generateId } from '../utils/id'

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
      return {
        ...state,
        folders: state.folders.filter((f) => !toDelete.includes(f.id)),
        snips: state.snips.filter((s) => !toDelete.includes(s.folderId)),
        dividers: state.dividers.filter((d) => d.afterFolderId === null || !toDelete.includes(d.afterFolderId)),
        selectedFolderId: toDelete.includes(state.selectedFolderId ?? '')
          ? null
          : state.selectedFolderId,
      }
    }

    case 'SELECT_FOLDER':
      return { ...state, selectedFolderId: action.payload.id }

    case 'ADD_SNIP':
      return {
        ...state,
        snips: [
          ...state.snips,
          {
            id: generateId(),
            folderId: action.payload.folderId,
            name: action.payload.name,
            body: action.payload.body,
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
                updatedAt: Date.now(),
              }
            : s,
        ),
      }

    case 'DELETE_SNIP':
      return {
        ...state,
        snips: state.snips.filter((s) => s.id !== action.payload.id),
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

    case 'TOGGLE_EDIT_MODE':
      return { ...state, isEditMode: !state.isEditMode }

    case 'ADD_DIVIDER':
      return { ...state, dividers: [...state.dividers, { id: generateId(), afterFolderId: action.payload.afterFolderId }] }

    case 'MOVE_DIVIDER':
      return { ...state, dividers: state.dividers.map((d) => d.id === action.payload.id ? { ...d, afterFolderId: action.payload.afterFolderId } : d) }

    case 'REMOVE_DIVIDER':
      return { ...state, dividers: state.dividers.filter((d) => d.id !== action.payload.id) }

    default:
      return state
  }
}
