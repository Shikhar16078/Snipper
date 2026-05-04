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
  interface Window {
    api?: {
      platform: string
      loadData: () => Promise<AppState>
      saveData: (data: AppState) => Promise<void>
      openUrl?: (url: string) => Promise<void>
      titlebarDoubleClick?: () => Promise<void>
      dragStart?: (mouseX: number, mouseY: number) => void
      dragMove?: (mouseX: number, mouseY: number) => void
      dragEnd?: () => void
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
      dispatch({ type: 'LOAD_STATE', payload: loaded })
      initialized.current = true
    }
    load()
  }, [])

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
