import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  loadData: () => ipcRenderer.invoke('store:load'),
  saveData: (data: unknown) => ipcRenderer.invoke('store:save', data),
  openUrl: (url: string) => ipcRenderer.invoke('shell:openUrl', url),
  titlebarDoubleClick: () => ipcRenderer.invoke('titlebar:doubleclick'),
  dragStart: (mouseX: number, mouseY: number) => ipcRenderer.send('window:drag-start', { mouseX, mouseY }),
  dragMove: (mouseX: number, mouseY: number) => ipcRenderer.send('window:drag-move', { mouseX, mouseY }),
  dragEnd: () => ipcRenderer.send('window:drag-end'),
})
