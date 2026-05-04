import { Modal } from './Modal'
import { TIPS } from '../snips/TipsFooter'

interface TipsModalProps {
  open: boolean
  onClose: () => void
}

export function TipsModal({ open, onClose }: TipsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Tips & Shortcuts">
      <div className="space-y-1.5 mb-5">
        {TIPS.map((tip, i) => (
          <div key={i} className="flex items-start gap-2.5 px-1 py-1.5 rounded-lg hover:bg-fg/4 transition-colors">
            <svg className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <p className="text-xs text-fg-2 leading-relaxed">{tip}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
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
