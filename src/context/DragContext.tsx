import { createContext, useContext, useState } from 'react'

interface DragContextValue {
  draggingSnipId: string | null
  setDraggingSnipId: (id: string | null) => void
  draggingSnipIds: string[]
  setDraggingSnipIds: (ids: string[]) => void
  draggingDividerId: string | null
  setDraggingDividerId: (id: string | null) => void
  draggingFolderId: string | null
  setDraggingFolderId: (id: string | null) => void
  draggingTagId: string | null
  setDraggingTagId: (id: string | null) => void
}

const DragContext = createContext<DragContextValue>({
  draggingSnipId: null,
  setDraggingSnipId: () => {},
  draggingSnipIds: [],
  setDraggingSnipIds: () => {},
  draggingDividerId: null,
  setDraggingDividerId: () => {},
  draggingFolderId: null,
  setDraggingFolderId: () => {},
  draggingTagId: null,
  setDraggingTagId: () => {},
})

export const useDrag = () => useContext(DragContext)

export function DragProvider({ children }: { children: React.ReactNode }) {
  const [draggingSnipId, setDraggingSnipId] = useState<string | null>(null)
  const [draggingSnipIds, setDraggingSnipIds] = useState<string[]>([])
  const [draggingDividerId, setDraggingDividerId] = useState<string | null>(null)
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null)
  const [draggingTagId, setDraggingTagId] = useState<string | null>(null)

  return (
    <DragContext.Provider value={{
      draggingSnipId,
      setDraggingSnipId,
      draggingSnipIds,
      setDraggingSnipIds,
      draggingDividerId,
      setDraggingDividerId,
      draggingFolderId,
      setDraggingFolderId,
      draggingTagId,
      setDraggingTagId,
    }}>
      {children}
    </DragContext.Provider>
  )
}
