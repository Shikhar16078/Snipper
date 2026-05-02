import { useApp } from '../../store/AppContext'
import { Modal } from './Modal'
import { SnipForm } from './SnipForm'

interface AddSnipModalProps {
  open: boolean
  onClose: () => void
}

export function AddSnipModal({ open, onClose }: AddSnipModalProps) {
  const { state, dispatch } = useApp()

  const defaultFolderId =
    state.selectedFolderId ?? state.folders[0]?.id ?? ''

  function handleSubmit(values: { name: string; body: string; folderId: string }) {
    dispatch({ type: 'ADD_SNIP', payload: values })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="New Snip">
      <SnipForm
        initialValues={{ name: '', body: '', folderId: defaultFolderId }}
        folders={state.folders}
        onSubmit={handleSubmit}
        onCancel={onClose}
        submitLabel="Add Snip"
      />
    </Modal>
  )
}
