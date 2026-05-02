export interface Divider {
  id: string
  afterFolderId: string | null  // null = before all root folders
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
  createdAt: number
}

export interface Snip {
  id: string
  folderId: string
  name: string
  body: string
  createdAt: number
  updatedAt: number
}

export type ViewMode = 'grid' | 'list'
export type Theme =
  | 'stone'
  | 'light' | 'light-pink' | 'light-sage' | 'light-dusk' | 'light-arctic'
  | 'dark' | 'dark-maroon' | 'dark-midnight' | 'dark-ember' | 'dark-nebula'

export interface AppState {
  folders: Folder[]
  snips: Snip[]
  dividers: Divider[]
  selectedFolderId: string | null
  viewMode: ViewMode
  theme: Theme
  allSnipsLabel: string
  tipsEnabled: boolean
  isEditMode: boolean
}
