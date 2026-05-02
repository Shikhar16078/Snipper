import type { AppState, ViewMode, Theme } from '../types'

export type Action =
  | { type: 'ADD_FOLDER'; payload: { name: string; parentId?: string | null } }
  | { type: 'RENAME_FOLDER'; payload: { id: string; name: string } }
  | { type: 'DELETE_FOLDER'; payload: { id: string } }
  | { type: 'SELECT_FOLDER'; payload: { id: string | null } }
  | { type: 'ADD_SNIP'; payload: { folderId: string; name: string; body: string } }
  | { type: 'EDIT_SNIP'; payload: { id: string; name: string; body: string; folderId: string } }
  | { type: 'DELETE_SNIP'; payload: { id: string } }
  | { type: 'MOVE_SNIP'; payload: { id: string; folderId: string } }
  | { type: 'SET_VIEW_MODE'; payload: { mode: ViewMode } }
  | { type: 'SET_THEME'; payload: { theme: Theme } }
  | { type: 'SET_ALL_SNIPS_LABEL'; payload: { label: string } }
  | { type: 'SET_TIPS_ENABLED'; payload: boolean }
  | { type: 'TOGGLE_EDIT_MODE' }
  | { type: 'ADD_DIVIDER'; payload: { afterFolderId: string | null } }
  | { type: 'MOVE_DIVIDER'; payload: { id: string; afterFolderId: string | null } }
  | { type: 'REMOVE_DIVIDER'; payload: { id: string } }
  | { type: 'LOAD_STATE'; payload: AppState }
