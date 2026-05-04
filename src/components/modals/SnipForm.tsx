import { useEffect, useMemo, useState } from 'react'
import type { Folder } from '../../types'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Button } from '../ui/Button'
import { FolderSelect } from '../ui/FolderSelect'
import { extractLinks, getDefaultLinkTitle } from '../../utils/links'

interface SnipFormValues {
  name: string
  body: string
  folderId: string
  linkTitles?: Record<string, string>
}

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
  const [linkTitles, setLinkTitles] = useState<Record<string, string>>(initialValues.linkTitles ?? {})
  const detectedLinks = useMemo(() => extractLinks(body), [body])

  useEffect(() => {
    setLinkTitles((prev) => {
      const next: Record<string, string> = {}
      for (const link of detectedLinks) {
        const existing = prev[link]?.trim()
        next[link] = existing && existing.length > 0 ? existing : getDefaultLinkTitle(link)
      }

      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(next)
      if (prevKeys.length !== nextKeys.length) return next
      for (const key of nextKeys) {
        if (prev[key] !== next[key]) return next
      }
      return prev
    })
  }, [detectedLinks])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !body.trim()) return
    const normalizedTitles: Record<string, string> = {}
    for (const link of detectedLinks) {
      const title = (linkTitles[link] ?? getDefaultLinkTitle(link)).trim()
      if (title.length > 0) normalizedTitles[link] = title
    }
    onSubmit({ name: name.trim(), body, folderId, linkTitles: normalizedTitles })
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

      {detectedLinks.length > 0 && (
        <div>
          <label className="block text-[11px] font-semibold tracking-wide uppercase text-muted mb-1.5">Detected Links</label>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {detectedLinks.map((link) => (
              <div key={link} className="rounded-lg border border-border bg-surface p-2">
                <p className="text-[10px] text-muted truncate mb-1" title={link}>{link}</p>
                <Input
                  value={linkTitles[link] ?? ''}
                  onChange={(e) =>
                    setLinkTitles((prev) => ({ ...prev, [link]: e.target.value }))
                  }
                  placeholder="Link title"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={!name.trim() || !body.trim()}>{submitLabel}</Button>
      </div>
    </form>
  )
}
