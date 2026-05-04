import { useState } from 'react'
import type { Folder } from '../../types'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Button } from '../ui/Button'
import { FolderSelect } from '../ui/FolderSelect'

interface SnipFormValues { name: string; body: string; folderId: string }

interface SnipFormProps {
  initialValues: SnipFormValues
  folders: Folder[]
  allSnipsLabel?: string
  onSubmit: (values: SnipFormValues) => void
  onCancel: () => void
  submitLabel?: string
}

export function SnipForm({ initialValues, folders, allSnipsLabel, onSubmit, onCancel, submitLabel = 'Save' }: SnipFormProps) {
  const [name, setName] = useState(initialValues.name)
  const [body, setBody] = useState(initialValues.body)
  const [folderId, setFolderId] = useState(initialValues.folderId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !body.trim()) return
    onSubmit({ name: name.trim(), body, folderId })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-[11px] font-semibold tracking-wide uppercase text-muted mb-1.5">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Home Address" autoFocus required />
      </div>

      <div>
        <label className="block text-[11px] font-semibold tracking-wide uppercase text-muted mb-1.5">Content</label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Paste or type the text to copy instantly…"
          rows={6}
          required
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold tracking-wide uppercase text-muted mb-1.5">Folder</label>
        <FolderSelect folders={folders} value={folderId} onChange={setFolderId} allSnipsLabel={allSnipsLabel} />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={!name.trim() || !body.trim()}>{submitLabel}</Button>
      </div>
    </form>
  )
}
