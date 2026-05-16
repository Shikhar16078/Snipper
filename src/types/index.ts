export interface Divider {
  id: string
  afterFolderId: string | null  // null = before all root folders
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
  createdAt: number
  defaultSectionName?: string   // name of the unsectioned bucket when sections exist
  defaultSectionOrder?: number  // position of General among sections (-1 = first, or its index in orderedIds)
}

export interface Section {
  id: string
  name: string
  folderId: string
  order: number
  createdAt: number
}

export interface Tag {
  id: string
  name: string
  color: string
}

export const TAG_COLORS = [
  { id: 'red',    hex: '#ef4444' },
  { id: 'orange', hex: '#f97316' },
  { id: 'amber',  hex: '#f59e0b' },
  { id: 'green',  hex: '#22c55e' },
  { id: 'teal',   hex: '#14b8a6' },
  { id: 'blue',   hex: '#3b82f6' },
  { id: 'violet', hex: '#8b5cf6' },
  { id: 'pink',   hex: '#ec4899' },
  { id: 'slate',  hex: '#64748b' },
] as const

export interface Snip {
  id: string
  folderId: string
  sectionId?: string | null
  name: string
  body: string
  linkTitles?: Record<string, string>
  tagIds?: string[]
  createdAt: number
  updatedAt: number
  pinned?: boolean
  copyCount?: number
  lastCopiedAt?: number
}

export type ViewMode = 'grid' | 'list'
export type HoldAction = 'edit' | 'copy'
export type SnipSort = 'updated' | 'az' | 'za' | 'newest' | 'oldest' | 'most-used'
export type ToolbarPosition = 'left' | 'top' | 'right' | 'bottom'
export type TrashAutoPurge = number | null  // null = off, number = ms until permanent deletion
export type Theme =
  | 'stone'
  | 'light' | 'light-pink' | 'light-sage' | 'light-dusk' | 'light-arctic'
  | 'dark' | 'dark-maroon' | 'dark-midnight' | 'dark-ember' | 'dark-nebula'

export interface TrashedSnip {
  id: string
  type: 'snip'
  deletedAt: number
  snip: Snip
}

export interface TrashedFolder {
  id: string
  type: 'folder'
  deletedAt: number
  folders: Folder[]
  snips: Snip[]
  dividers: Divider[]
}

export interface TrashedSection {
  id: string
  type: 'section'
  deletedAt: number
  section: Section
  snipIds: string[]
}

export type TrashedItem = TrashedSnip | TrashedFolder | TrashedSection

export interface AppState {
  folders: Folder[]
  snips: Snip[]
  dividers: Divider[]
  sections: Section[]
  trash: TrashedItem[]
  tags: Tag[]
  selectedFolderId: string | null
  selectedTagId: string | null
  viewMode: ViewMode
  theme: Theme
  allSnipsLabel: string
  tipsEnabled: boolean
  isEditMode: boolean
  deleteConfirmEnabled: boolean
  holdAction: HoldAction
  trashAutoPurge: TrashAutoPurge
  autoUpdateEnabled: boolean
  snipSort: SnipSort
  toolbarPosition: ToolbarPosition
}
