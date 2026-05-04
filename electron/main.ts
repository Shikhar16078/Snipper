import { app, BrowserWindow, ipcMain, shell, systemPreferences } from 'electron'
import path from 'path'
import fs from 'fs'

const isDev = process.env['NODE_ENV'] === 'development'

interface AppState {
  folders: unknown[]
  snips: unknown[]
  dividers: unknown[]
  selectedFolderId: string | null
  viewMode: string
  theme: string
  allSnipsLabel: string
  tipsEnabled: boolean
}

const defaultState: AppState = {
  folders: [],
  snips: [],
  dividers: [],
  selectedFolderId: null,
  viewMode: 'grid',
  theme: 'stone',
  allSnipsLabel: 'All Snips',
  tipsEnabled: true,
}

function getDataPath(): string {
  return path.join(app.getPath('userData'), 'snipper-data.json')
}

function loadData(): AppState {
  try {
    const raw = fs.readFileSync(getDataPath(), 'utf-8')
    return { ...defaultState, ...JSON.parse(raw) }
  } catch {
    return defaultState
  }
}

function saveData(data: AppState): void {
  try {
    fs.writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // write failed — disk full or permissions issue
  }
}

ipcMain.handle('store:load', () => loadData())
ipcMain.handle('store:save', (_event, data: AppState) => saveData(data))
ipcMain.handle('shell:openUrl', (_event, url: string) => shell.openExternal(url))
ipcMain.handle('titlebar:doubleclick', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return
  const action = systemPreferences.getUserDefault('AppleActionOnDoubleClick', 'string')
  if (action === 'Minimize') {
    win.isMinimized() ? win.restore() : win.minimize()
  } else {
    // 'Maximize', 'Zoom', or unset → zoom/unzoom (macOS default)
    win.isMaximized() ? win.unmaximize() : win.maximize()
  }
})

let dragState: { mouseStartX: number; mouseStartY: number; winStartX: number; winStartY: number } | null = null

ipcMain.on('window:drag-start', (event, { mouseX, mouseY }: { mouseX: number; mouseY: number }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return
  const [winX, winY] = win.getPosition()
  dragState = { mouseStartX: mouseX, mouseStartY: mouseY, winStartX: winX, winStartY: winY }
})

ipcMain.on('window:drag-move', (event, { mouseX, mouseY }: { mouseX: number; mouseY: number }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || !dragState) return
  win.setPosition(
    dragState.winStartX + (mouseX - dragState.mouseStartX),
    dragState.winStartY + (mouseY - dragState.mouseStartY),
  )
})

ipcMain.on('window:drag-end', () => {
  dragState = null
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 700,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
