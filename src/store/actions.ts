import type { AppState, ViewMode, Theme, HoldAction, TrashAutoPurge, SnipSort, ToolbarPosition, Folder, Snip, Section } from '../types'

export type Action =
  | { type: 'ADD_FOLDER'; payload: { name: string; parentId?: string | null } }
  | { type: 'RENAME_FOLDER'; payload: { id: string; name: string } }
  | { type: 'DELETE_FOLDER'; payload: { id: string } }
  | { type: 'REORDER_FOLDER'; payload: { sourceId: string; afterId: string | null; parentId: string | null } }
  | { type: 'SELECT_FOLDER'; payload: { id: string | null } }
  | { type: 'ADD_SNIP'; payload: { id?: string; folderId: string; sectionId?: string | null; name: string; body: string; linkTitles?: Record<string, string>; tagIds?: string[] } }
  | { type: 'EDIT_SNIP'; payload: { id: string; name: string; body: string; folderId: string; sectionId?: string | null; linkTitles?: Record<string, string>; tagIds?: string[] } }
  | { type: 'DELETE_SNIP'; payload: { id: string } }
  | { type: 'MOVE_SNIP'; payload: { id: string; folderId: string } }
  | { type: 'SET_VIEW_MODE'; payload: { mode: ViewMode } }
  | { type: 'SET_THEME'; payload: { theme: Theme } }
  | { type: 'SET_ALL_SNIPS_LABEL'; payload: { label: string } }
  | { type: 'SET_TIPS_ENABLED'; payload: boolean }
  | { type: 'SET_DELETE_CONFIRM_ENABLED'; payload: boolean }
  | { type: 'SET_HOLD_ACTION'; payload: HoldAction }
  | { type: 'SET_TRASH_AUTO_PURGE'; payload: TrashAutoPurge }
  | { type: 'SET_AUTO_UPDATE_ENABLED'; payload: boolean }
  | { type: 'SET_SNIP_SORT'; payload: SnipSort }
  | { type: 'SET_TOOLBAR_POSITION'; payload: ToolbarPosition }
  | { type: 'IMPORT_DATA'; payload: { folders: Folder[]; snips: Snip[] } }
  | { type: 'TOGGLE_PIN_SNIP'; payload: { id: string } }
  | { type: 'DUPLICATE_SNIP'; payload: { id: string } }
  | { type: 'RECORD_COPY'; payload: { id: string } }
  | { type: 'PURGE_EXPIRED_TRASH' }
  | { type: 'TOGGLE_EDIT_MODE' }
  | { type: 'ADD_DIVIDER'; payload: { afterFolderId: string | null } }
  | { type: 'MOVE_DIVIDER'; payload: { id: string; afterFolderId: string | null } }
  | { type: 'REMOVE_DIVIDER'; payload: { id: string } }
  | { type: 'RESTORE_TRASH_ITEM'; payload: { id: string } }
  | { type: 'RESTORE_ALL_TRASH' }
  | { type: 'PERMANENTLY_DELETE_TRASH_ITEM'; payload: { id: string } }
  | { type: 'EMPTY_TRASH' }
  | { type: 'ADD_TAG';       payload: { id?: string; name: string; color: string } }
  | { type: 'EDIT_TAG';      payload: { id: string; name: string; color: string } }
  | { type: 'DELETE_TAG';    payload: { id: string } }
  | { type: 'SELECT_TAG';    payload: { id: string | null } }
  | { type: 'SET_SNIP_TAGS'; payload: { snipId: string; tagIds: string[] } }
  | { type: 'REORDER_TAG';   payload: { sourceId: string; afterId: string | null } }
  | { type: 'ADD_SECTION'; payload: { id?: string; folderId: string; name: string } }
  | { type: 'RENAME_SECTION'; payload: { sectionId: string; name: string } }
  | { type: 'DELETE_SECTION'; payload: { sectionId: string } }
  | { type: 'REORDER_SECTION'; payload: { sourceId: string; afterId: string | null; folderId: string } }
  | { type: 'SET_SNIP_SECTION'; payload: { snipId: string; sectionId: string | null } }
  | { type: 'RENAME_DEFAULT_SECTION'; payload: { folderId: string; name: string } }
  | { type: 'IMPORT_SECTIONS'; payload: { sections: Section[] } }
  | { type: 'REORDER_SECTIONS_IN_FOLDER'; payload: { folderId: string; orderedIds: string[] } }
  | { type: 'LOAD_STATE'; payload: AppState }
