import { Modal } from './Modal'
import patchNotes from '../../data/patch-notes.json'

interface PatchNotesModalProps {
  open: boolean
  onClose: () => void
}

export const APP_VERSION = patchNotes[0].version

export function PatchNotesModal({ open, onClose }: PatchNotesModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Patch Notes">
      <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2 mb-4 space-y-6">
        {patchNotes.map((note) => (
          <div key={note.version}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-bold text-fg">v{note.version}</h3>
              <span className="text-[10px] text-muted font-medium">{note.date}</span>
            </div>
            <ul className="space-y-1.5">
              {note.changes.map((change, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-fg-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span className="leading-snug">{change}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-4 border-t border-border">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-accent hover:bg-accent-h text-white rounded-lg text-xs font-semibold transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}
