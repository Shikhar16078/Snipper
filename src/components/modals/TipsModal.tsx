import { useState } from 'react'
import { Modal } from './Modal'
import { TIP_CATEGORIES } from '../snips/TipsFooter'

interface TipsModalProps {
  open: boolean
  onClose: () => void
}

export function TipsModal({ open, onClose }: TipsModalProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]))

  function toggle(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Tips & Shortcuts">
      <div className="overflow-y-auto max-h-[58vh] -mx-6 px-6 mb-5 space-y-2 pr-4">
        {TIP_CATEGORIES.map((cat, i) => {
          const isOpen = expanded.has(i)
          return (
            <div key={cat.title} className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-fg/4 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-fg">{cat.title}</span>
                  <span className="text-[10px] font-semibold text-muted bg-fg/8 px-1.5 py-0.5 rounded-full tabular-nums">
                    {cat.tips.length}
                  </span>
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-muted flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div className="border-t border-border/60 px-4 py-1.5 space-y-0.5">
                  {cat.tips.map((tip, j) => (
                    <div key={j} className="flex items-start gap-2.5 py-1.5">
                      <svg className="w-3 h-3 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                      <p className="text-xs text-fg-2 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-end pt-1">
        <button
          onClick={onClose}
          className="px-4 py-1.5 bg-accent hover:bg-accent-h text-white font-semibold rounded-lg text-xs transition-colors"
        >
          Got it
        </button>
      </div>
    </Modal>
  )
}
