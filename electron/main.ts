import { app, BrowserWindow, dialog, ipcMain, shell, systemPreferences } from 'electron'
import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'
import { autoUpdater } from 'electron-updater'

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
  autoUpdateEnabled: boolean
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
  autoUpdateEnabled: true,
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

type UpdaterEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'download-progress'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }
  | { type: 'installer-progress'; percent: number }

function getInstallerFilename(version: string): string {
  if (process.platform === 'darwin') {
    return process.arch === 'arm64' ? `Snipper-${version}-arm64.dmg` : `Snipper-${version}.dmg`
  }
  return `Snipper Setup ${version}.exe`
}

function downloadWithProgress(
  url: string,
  destPath: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    function request(reqUrl: string, redirects = 0) {
      if (redirects > 5) { reject(new Error('Too many redirects')); return }
      const mod = reqUrl.startsWith('https') ? https : http
      mod.get(reqUrl, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume() // drain redirect body to free the socket
          request(res.headers.location, redirects + 1)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${res.statusCode}`))
          return
        }
        const total = parseInt(res.headers['content-length'] ?? '0', 10)
        let received = 0
        let lastPercent = -1
        const file = fs.createWriteStream(destPath)
        res.on('data', (chunk: Buffer) => {
          received += chunk.length
          file.write(chunk)
          if (total > 0) {
            const percent = Math.round((received / total) * 100)
            if (percent !== lastPercent) {
              lastPercent = percent
              onProgress(percent)
            }
          }
        })
        res.on('end', () => file.end())
        res.on('error', (err) => { fs.unlink(destPath, () => {}); reject(err) })
        file.on('finish', resolve)
        file.on('error', (err) => { fs.unlink(destPath, () => {}); reject(err) })
      }).on('error', reject)
    }
    request(url)
  })
}

function emitUpdaterEvent(payload: UpdaterEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updates:event', payload)
  }
}

function setupAutoUpdater(): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    emitUpdaterEvent({ type: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    emitUpdaterEvent({ type: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    emitUpdaterEvent({ type: 'not-available' })
  })

  autoUpdater.on('download-progress', (progress) => {
    emitUpdaterEvent({ type: 'download-progress', percent: progress.percent })
  })

  autoUpdater.on('update-downloaded', (info) => {
    emitUpdaterEvent({ type: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (error) => {
    emitUpdaterEvent({ type: 'error', message: error.message || 'Update failed.' })
  })
}

ipcMain.handle('store:load', () => loadData())
ipcMain.handle('store:save', (_event, data: AppState) => saveData(data))
ipcMain.handle('shell:openUrl', (_event, url: string) => shell.openExternal(url))
ipcMain.handle('updates:check', async () => {
  if (!app.isPackaged) {
    emitUpdaterEvent({ type: 'error', message: 'Update checks are unavailable in development builds.' })
    return { ok: false }
  }
  await autoUpdater.checkForUpdates()
  return { ok: true }
})
ipcMain.handle('updates:download', async () => {
  if (!app.isPackaged) {
    emitUpdaterEvent({ type: 'error', message: 'Update download is unavailable in development builds.' })
    return { ok: false }
  }
  await autoUpdater.downloadUpdate()
  return { ok: true }
})
ipcMain.handle('updates:install', () => {
  if (!app.isPackaged) return { ok: false }
  setImmediate(() => autoUpdater.quitAndInstall())
  return { ok: true }
})

ipcMain.handle('updates:choose-save-path', async (event, { version }: { version: string }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return { canceled: true }
  const filename = getInstallerFilename(version)
  const filters = process.platform === 'darwin'
    ? [{ name: 'macOS Disk Image', extensions: ['dmg'] }]
    : [{ name: 'Windows Installer', extensions: ['exe'] }]
  const result = await dialog.showSaveDialog(win, {
    title: 'Save Snipper Installer',
    defaultPath: path.join(app.getPath('downloads'), filename),
    filters,
  })
  return { canceled: result.canceled, filePath: result.filePath }
})

ipcMain.handle('updates:download-installer', async (event, { version, filePath }: { version: string; filePath: string }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const filename = getInstallerFilename(version)
  const url = `https://github.com/Shikhar16078/Snipper/releases/download/v${version}/${filename}`
  try {
    await downloadWithProgress(url, filePath, (percent) => {
      win?.webContents.send('updates:event', { type: 'installer-progress', percent })
    })
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Download failed'
    return { ok: false, message }
  }
})
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
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
