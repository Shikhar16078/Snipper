import type { AppState } from '../types'

export const initialState: AppState = {
  folders: [],
  snips: [],
  dividers: [],
  trash: [],
  selectedFolderId: null,
  viewMode: 'grid',
  theme: 'stone',
  allSnipsLabel: 'All Snips',
  tipsEnabled: true,
  isEditMode: false,
  deleteConfirmEnabled: true,
  holdAction: 'edit',
}
