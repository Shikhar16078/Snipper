import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  isPackaged: !process.defaultApp,
  loadData: () => ipcRenderer.invoke('store:load'),
  saveData: (data: unknown) => ipcRenderer.invoke('store:save', data),
  openUrl: (url: string) => ipcRenderer.invoke('shell:openUrl', url),
  titlebarDoubleClick: () => ipcRenderer.invoke('titlebar:doubleclick'),
  dragStart: (mouseX: number, mouseY: number) => ipcRenderer.send('window:drag-start', { mouseX, mouseY }),
  dragMove: (mouseX: number, mouseY: number) => ipcRenderer.send('window:drag-move', { mouseX, mouseY }),
  dragEnd: () => ipcRenderer.send('window:drag-end'),
  updates: {
    check: () => ipcRenderer.invoke('updates:check'),
    download: () => ipcRenderer.invoke('updates:download'),
    install: () => ipcRenderer.invoke('updates:install'),
    onEvent: (callback: (payload: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload)
      ipcRenderer.on('updates:event', listener)
      return () => ipcRenderer.removeListener('updates:event', listener)
    },
  },
})
