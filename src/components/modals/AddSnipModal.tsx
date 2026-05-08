import { useApp } from '../../store/AppContext'
import { Modal } from './Modal'
import { SnipForm } from './SnipForm'

interface AddSnipModalProps {
  open: boolean
  onClose: () => void
}

export function AddSnipModal({ open, onClose }: AddSnipModalProps) {
  const { state, dispatch } = useApp()

  const defaultFolderId = state.selectedFolderId ?? ''

  function handleSubmit(values: { name: string; body: string; folderId: string; linkTitles?: Record<string, string> }) {
    dispatch({ type: 'ADD_SNIP', payload: values })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="New Snip">
      <SnipForm
        initialValues={{ name: '', body: '', folderId: defaultFolderId, linkTitles: {} }}
        folders={state.folders}
        onSubmit={handleSubmit}
        onCancel={onClose}
        submitLabel="Add Snip"
      />
    </Modal>
  )
}
