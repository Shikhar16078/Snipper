import type { AppState } from '../types'

export const initialState: AppState = {
  folders: [],
  snips: [],
  dividers: [],
  trash: [],
  tags: [],
  selectedFolderId: null,
  selectedTagId: null,
  viewMode: 'grid',
  theme: 'stone',
  allSnipsLabel: 'All Snips',
  tipsEnabled: true,
  isEditMode: false,
  deleteConfirmEnabled: true,
  holdAction: 'edit',
  trashAutoPurge: null,
  autoUpdateEnabled: true,
  snipSort: 'updated',
}
