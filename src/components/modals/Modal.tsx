import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
    } else if (mounted) {
      setClosing(true)
      const t = setTimeout(() => { setMounted(false); setClosing(false) }, 150)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>('input,textarea,button')?.focus()
  }, [open])

  if (!mounted) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-fg/10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className={`bg-panel border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 ${closing ? 'modal-leave' : 'animate-pop'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="text-sm font-semibold text-fg mb-5">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
