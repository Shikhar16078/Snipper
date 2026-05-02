import { createContext, useContext, useState } from 'react'

interface DragContextValue {
  draggingSnipId: string | null
  setDraggingSnipId: (id: string | null) => void
  draggingDividerId: string | null
  setDraggingDividerId: (id: string | null) => void
}

const DragContext = createContext<DragContextValue>({
  draggingSnipId: null,
  setDraggingSnipId: () => {},
  draggingDividerId: null,
  setDraggingDividerId: () => {},
})

export const useDrag = () => useContext(DragContext)

export function DragProvider({ children }: { children: React.ReactNode }) {
  const [draggingSnipId, setDraggingSnipId] = useState<string | null>(null)
  const [draggingDividerId, setDraggingDividerId] = useState<string | null>(null)

  return (
    <DragContext.Provider value={{
      draggingSnipId,
      setDraggingSnipId,
      draggingDividerId,
      setDraggingDividerId
    }}>
      {children}
    </DragContext.Provider>
  )
}
