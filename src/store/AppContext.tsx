import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import type { AppState } from '../types'
import type { Action } from './actions'
import { reducer } from './reducer'
import { initialState } from './initialState'

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextValue | null>(null)

declare global {
  type UpdaterEventPayload =
    | { type: 'checking' }
    | { type: 'available'; version: string }
    | { type: 'not-available' }
    | { type: 'download-progress'; percent: number }
    | { type: 'downloaded'; version: string }
    | { type: 'error'; message: string }
    | { type: 'installer-progress'; percent: number }

  interface Window {
    api?: {
      platform: string
      isPackaged?: boolean
      loadData: () => Promise<AppState>
      saveData: (data: AppState) => Promise<void>
      openUrl?: (url: string) => Promise<void>
      titlebarDoubleClick?: () => Promise<void>
      dragStart?: (mouseX: number, mouseY: number) => void
      dragMove?: (mouseX: number, mouseY: number) => void
      dragEnd?: () => void
      updates?: {
        check: () => Promise<{ ok: boolean }>
        download: () => Promise<{ ok: boolean }>
        install: () => Promise<{ ok: boolean }>
        chooseSavePath: (version: string) => Promise<{ canceled: boolean; filePath?: string }>
        downloadInstaller: (version: string, filePath: string) => Promise<{ ok: boolean; message?: string }>
        onEvent: (callback: (payload: UpdaterEventPayload) => void) => () => void
      }
    }
  }
}

const LS_KEY = 'snipper_state'

function loadFromLocalStorage(): AppState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return initialState
    return { ...initialState, ...JSON.parse(raw) }
  } catch {
    return initialState
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const initialized = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load data on mount — electron-store via IPC, or localStorage in browser
  useEffect(() => {
    async function load() {
      let loaded: AppState
      if (window.api) {
        loaded = { ...initialState, ...(await window.api.loadData()) }
      } else {
        loaded = loadFromLocalStorage()
      }
      // Sanitize: if trashAutoPurge is a legacy string value, reset to null
      if (typeof loaded.trashAutoPurge === 'string') loaded = { ...loaded, trashAutoPurge: null }
      dispatch({ type: 'LOAD_STATE', payload: loaded })
      if (loaded.trashAutoPurge !== null) dispatch({ type: 'PURGE_EXPIRED_TRASH' })
      initialized.current = true
    }
    load()
  }, [])

  // Periodic purge — runs every 60s while auto-purge is active
  useEffect(() => {
    if (state.trashAutoPurge === null) return
    const id = setInterval(() => dispatch({ type: 'PURGE_EXPIRED_TRASH' }), 60_000)
    return () => clearInterval(id)
  }, [state.trashAutoPurge])

  // Debounced save on state change (skip until initialized)
  const save = useCallback(
    (s: AppState) => {
      if (!initialized.current) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        if (window.api) {
          window.api.saveData(s)
        } else {
          localStorage.setItem(LS_KEY, JSON.stringify(s))
        }
      }, 300)
    },
    [],
  )

  useEffect(() => {
    save(state)
  }, [state, save])

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
