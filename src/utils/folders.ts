import type { Folder } from '../types'

export function getAllDescendantIds(folderId: string, folders: Folder[]): string[] {
  const children = folders.filter((f) => f.parentId === folderId)
  return children.flatMap((c) => [c.id, ...getAllDescendantIds(c.id, folders)])
}

export function flattenFolders(
  folders: Folder[],
  parentId: string | null = null,
  depth = 0,
): { folder: Folder; depth: number }[] {
  return folders
    .filter((f) => f.parentId === parentId)
    .flatMap((f) => [{ folder: f, depth }, ...flattenFolders(folders, f.id, depth + 1)])
}
