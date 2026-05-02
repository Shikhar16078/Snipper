import type { Snip } from '../../types'
import { useApp } from '../../store/AppContext'
import { Modal } from './Modal'
import { SnipForm } from './SnipForm'

interface EditSnipModalProps {
  snip: Snip | null
  onClose: () => void
}

export function EditSnipModal({ snip, onClose }: EditSnipModalProps) {
  const { state, dispatch } = useApp()

  function handleSubmit(values: { name: string; body: string; folderId: string }) {
    if (!snip) return
    dispatch({ type: 'EDIT_SNIP', payload: { id: snip.id, ...values } })
    onClose()
  }

  return (
    <Modal open={snip !== null} onClose={onClose} title="Edit Snip">
      {snip && (
        <SnipForm
          initialValues={{ name: snip.name, body: snip.body, folderId: snip.folderId }}
          folders={state.folders}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitLabel="Save Changes"
        />
      )}
    </Modal>
  )
}
