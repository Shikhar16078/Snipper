import { useState } from 'react'
import { Modal } from './Modal'
import { PatchNotesModal, APP_VERSION } from './PatchNotesModal'

interface AboutModalProps {
  open: boolean
  onClose: () => void
}

export function AboutModal({ open, onClose }: AboutModalProps) {
  const [patchNotesOpen, setPatchNotesOpen] = useState(false)

  // When opening patch notes, we will just render it on top.
  // It handles its own closing.

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <div className="flex flex-col items-center text-center pb-2">
          <div className="w-16 h-16 mb-4 flex items-center justify-center">
            <img src="assets/icon.png" alt="Snipper Logo" className="w-full h-full object-contain rounded-2xl shadow-sm" />
          </div>
          <h2 className="text-lg font-bold text-fg">Snipper</h2>
          <p className="text-xs text-muted font-medium mb-4">Version {APP_VERSION}</p>
          <p className="text-sm text-fg-2 mb-2 px-4">
            A fast, beautiful, and fully native snippet manager. Keep your most-used code, links, and text fragments organized and always one click away.
          </p>
          <p className="text-xs text-muted italic mb-6">
            Developed with love by Shikhar Kumar ❤️
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { setPatchNotesOpen(true); }}
              className="px-4 py-2 bg-fg/5 hover:bg-fg/10 text-fg font-medium rounded-lg text-xs transition-colors"
            >
              Patch Notes
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-accent hover:bg-accent-h text-white font-semibold rounded-lg text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Render PatchNotesModal outside so it stays open even if About is closed */}
      <PatchNotesModal open={patchNotesOpen} onClose={() => setPatchNotesOpen(false)} />
    </>
  )
}
