import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  loadData: () => ipcRenderer.invoke('store:load'),
  saveData: (data: unknown) => ipcRenderer.invoke('store:save', data),
})
