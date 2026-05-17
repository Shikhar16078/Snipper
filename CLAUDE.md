# CLAUDE.md

## Commands

```bash
npm run dev              # Browser dev server at http://localhost:5173
npm run dev:electron     # Electron + Vite together (needs port 5173 free)
npm run build:all        # Build renderer (Vite) + Electron main (tsc)
npm run package:mac      # Produces app bundle in dist/mac-arm64/Snipper.app
npm run package:win      # Produces .exe installer
```

TypeScript check (renderer only): `npx tsc --noEmit`

## Git Rules

- **Never push to remote** unless explicitly told to. Commit locally as needed, but `git push` only on direct instruction.
- **Never commit** without explicit user approval.
- **"Commit" always means local commit only** — never push unless the user says "push".

## Architecture

**Two-process Electron app:**

- `electron/main.ts` — main process; BrowserWindow, IPC handlers, JSON file I/O via Node `fs`. Window uses `titleBarStyle: 'hiddenInset'` for Mac traffic lights. Also handles `shell:openUrl` IPC for opening URLs in the default browser.
- `electron/preload.ts` — contextBridge; exposes `window.api.platform`, `window.api.loadData()`, `window.api.saveData()`, `window.api.openUrl()` to the renderer.
- `src/` — React renderer; built by Vite → `dist/`.

**Storage:** plain JSON at `app.getPath('userData')/snipper-data.json`. Browser dev build falls back to `localStorage`.

**State:** React Context + `useReducer`. State shape in `src/types/index.ts`. Saves debounced 300ms on every state change via `AppContext.tsx`.

New fields added after initial build are safe because of the merge pattern:

```ts
loaded = { ...initialState, ...(await window.api.loadData()) }
```

## Data Model

```ts
interface Folder {
  id, name, parentId: string | null, createdAt
  defaultSectionName?: string   // custom label for the implicit General section
  defaultSectionOrder?: number  // position of General among named sections (-1 = first)
}

interface Section { id, name, folderId: string, order: number, createdAt }

interface Snip {
  id, folderId, name, body, createdAt, updatedAt
  sectionId?: string | null              // null / absent = General section
  linkTitles?: Record<string, string>
  tagIds?: string[]
  pinned?: boolean                       // starred snip
  copyCount?: number                     // times copied (drives most-used sort)
  lastCopiedAt?: number
}

interface Divider  { id, afterFolderId: string | null }  // null = before all root folders
interface Tag      { id, name, color: string }           // color is hex from the fixed palette

interface TrashedSnip   { id, type: 'snip', deletedAt, snip: Snip }
interface TrashedFolder { id, type: 'folder', deletedAt, folders: Folder[], snips: Snip[], dividers: Divider[] }
interface TrashedSection { id, type: 'section', deletedAt, section: Section, snipIds: string[] }
type TrashedItem = TrashedSnip | TrashedFolder | TrashedSection

type SnipSort = 'updated' | 'az' | 'za' | 'newest' | 'oldest' | 'most-used'
type ToolbarPosition = 'left' | 'top' | 'right' | 'bottom'

interface AppState {
  folders: Folder[]
  snips: Snip[]
  sections: Section[]              // named groups within folders
  dividers: Divider[]              // sidebar separators
  tags: Tag[]                      // colored cross-folder labels
  trash: TrashedItem[]             // soft-deleted items
  selectedFolderId: string | null  // null = "All Snips"
  selectedTagId: string | null     // when set, grid shows snips matching this tag
  viewMode: 'grid' | 'list'
  snipSort: SnipSort               // active sort order for the snip grid
  theme: Theme
  allSnipsLabel: string            // renameable "All Snips" label
  tipsEnabled: boolean
  isEditMode: boolean              // sidebar edit/organize mode
  deleteConfirmEnabled: boolean    // show confirm dialog before deleting
  holdAction: 'edit' | 'copy'     // what holding a snip card does
  trashAutoPurge: number | null    // null = off, number = ms TTL for trash items
  autoUpdateEnabled: boolean       // run background update check on launch
  toolbarPosition: ToolbarPosition // floating toolbar placement
}
```

`linkTitles` maps detected URLs in the snip body to custom display labels. Only non-default, non-empty titles are stored. The reducer sanitizes via `sanitizeLinkTitles()` on every add/edit.

`tagIds` on a snip holds the IDs of assigned tags. Optional — absence means no tags.

`sectionId` on a snip points to a `Section` in the same folder. `null` or absent = General (the implicit unsectioned bucket). `TrashedFolder` does **not** capture sections — restoring a folder restores subfolders and snips but snips land in General.

**Tag color palette** (`TAG_COLORS` exported from `src/types/index.ts`): 9 fixed hex values — red `#ef4444`, orange `#f97316`, amber `#f59e0b`, green `#22c55e`, teal `#14b8a6`, blue `#3b82f6`, violet `#8b5cf6`, pink `#ec4899`, slate `#64748b`.

## Actions

```text
ADD_FOLDER / RENAME_FOLDER / DELETE_FOLDER / REORDER_FOLDER / SELECT_FOLDER
ADD_SNIP / EDIT_SNIP / DELETE_SNIP / MOVE_SNIP / DUPLICATE_SNIP
TOGGLE_PIN_SNIP / RECORD_COPY
ADD_TAG / EDIT_TAG / DELETE_TAG / REORDER_TAG / SELECT_TAG / SET_SNIP_TAGS
ADD_SECTION / RENAME_SECTION / DELETE_SECTION / REORDER_SECTION
RENAME_DEFAULT_SECTION / SET_SNIP_SECTION / REORDER_SECTIONS_IN_FOLDER / IMPORT_SECTIONS
SET_VIEW_MODE / SET_THEME / SET_ALL_SNIPS_LABEL / SET_SNIP_SORT / SET_TOOLBAR_POSITION
SET_TIPS_ENABLED / SET_DELETE_CONFIRM_ENABLED / SET_HOLD_ACTION / TOGGLE_EDIT_MODE
SET_TRASH_AUTO_PURGE / SET_AUTO_UPDATE_ENABLED / PURGE_EXPIRED_TRASH
ADD_DIVIDER / MOVE_DIVIDER / REMOVE_DIVIDER
RESTORE_TRASH_ITEM / RESTORE_ALL_TRASH / PERMANENTLY_DELETE_TRASH_ITEM / EMPTY_TRASH
IMPORT_DATA / LOAD_STATE
```

**Reducer invariants:**

- `DELETE_FOLDER` soft-deletes — captures full subtree (folders + snips + dividers) into a `TrashedFolder` entry. Resets `selectedFolderId` to null if the deleted folder was selected. **Sections are not captured** — snips restored from a trashed folder land in General.
- `DELETE_SNIP` soft-deletes — moves snip into a `TrashedSnip` entry in `trash`.
- `DELETE_SECTION` soft-deletes — captures the section + its snip IDs into a `TrashedSection` entry; clears `sectionId` on affected snips (they fall into General).
- `ADD_FOLDER` auto-selects the new folder.
- `TOGGLE_EDIT_MODE` flips `isEditMode` boolean.
- `MOVE_SNIP` — `{ id, folderId }`: updates `folderId` and clears `sectionId` to `null` (sections are folder-scoped; a moved snip lands in General of the destination folder).
- `REORDER_FOLDER` — `{ sourceId, afterId, parentId }`: removes source from array, updates its `parentId`, inserts after `afterId` (or at start of `parentId` group if `afterId` is null). Guards against moving a folder into its own descendants.
- `SELECT_TAG` sets `selectedTagId` and clears `selectedFolderId`. `SELECT_FOLDER` clears `selectedTagId`.
- `DELETE_TAG` removes the tag from `state.tags`, scrubs its ID from every snip's `tagIds`, and resets `selectedTagId` if it was the deleted tag.
- `SET_SNIP_TAGS` — `{ snipId, tagIds }`: replaces the full `tagIds` array on a single snip.
- `REORDER_TAG` — `{ sourceId, afterId }`: moves a tag after the specified tag ID (or to the front if `afterId` is null).
- `IMPORT_DATA` — `{ folders, snips, sections, tags }`: appends all four arrays to existing state; never replaces. Called after `computePreview` has already deduped and remapped IDs.

## Theming

11 themes total. `src/index.css` has fully independent palette blocks per theme, each with prefixed vars that bridge to semantic tokens.

**Theme → CSS class mapping:**

| Theme | Classes on `<html>` |
| --- | --- |
| Stone (default) | `dark stone` |
| Ivory | *(none)* |
| Blush | `light-pink` |
| Sage | `light-sage` |
| Dusk | `light-dusk` |
| Arctic | `light-arctic` |
| Obsidian | `dark` |
| Merlot | `dark dark-maroon` |
| Midnight | `dark dark-midnight` |
| Ember | `dark dark-ember` |
| Nebula | `dark dark-nebula` |

Stone uses `html.dark.stone` (specificity 0,2,1) to override `html.dark` (0,1,1).

Tailwind semantic tokens: `bg-surface`, `bg-panel`, `bg-sidebar`, `text-fg`, `text-fg-2`, `text-muted`, `border-border`, `text-accent`, `bg-accent`.

`App.tsx` toggles all classes on `<html>` when `state.theme` changes, and writes to `localStorage` for the anti-flash script.

An inline `<script>` in `index.html` pre-applies theme classes before React renders to prevent flash.

## Mac Native Titlebar

Sidebar header and all main-panel navbars are `h-[40px]` on Mac. Sidebar header uses `pl-[72px]` to clear traffic lights. Draggable regions: `.app-drag` / `.app-no-drag` utility classes in `src/index.css`. `window.api.platform` drives the `isMac` check.

## Main Panel Views

`App.tsx` renders one of seven views in the main panel based on state:

1. **`SnipEditorView` (create)** — when `createOpen === true`
2. **`SnipEditorView` (edit)** — when `editTarget !== null`
3. **`TrashView`** — when `trashOpen === true`
4. **`HelpView`** — when `helpOpen === true`
5. **`ExportView`** — when `exportOpen === true`
6. **`ImportView`** — when `importOpen === true`
7. **`SnipGrid`** — default

The `N` shortcut sets `createOpen = true`. Clicking Edit on a snip card sets `editTarget`. Clicking trash in the sidebar sets `trashOpen`. The Help Center is opened from Settings gear → Help Center. Navigating to any folder via sidebar always closes trash (via `useEffect` on `selectedFolderId`).

**Navigation guard:** All folder and trash clicks go through gating functions in App.tsx (`requestSelectFolder`, `toggleTrash`). If the editor is open with unsaved changes (`editorRef.current?.isDirty`), a `pendingNav` state is set and a dialog appears (Save & Leave / Keep Editing / Discard) instead of navigating. If the editor is open but clean, navigation closes the editor and proceeds immediately. `editorRef` is a `useRef<SnipEditorHandle>` attached to whichever `SnipEditorView` is active.

## Snip Editor View (`SnipEditorView`)

`src/components/snips/SnipEditorView.tsx` — full-canvas editor replacing the old modal-based add/edit flow.

**Modes:** `'create'` (new snip) or `'edit'` (existing snip). Controlled by `mode` + `snip` props.

**Layout:** Two-column grid — left is the writing area (large title + body textarea), right is a resizable side panel (folder picker, metadata, save/cancel, link manager).

**Side panel:** Resizable (`RIGHT_PANEL_MIN=260`, `RIGHT_PANEL_MAX=520`, default 320). Collapses automatically when viewport < 960px. Toggle button in navbar.

**Link detection:** `extractLinks(body)` (from `src/utils/links.ts`) scans body for URLs in real time. Each detected link can have a custom title set in the side panel. Titles are stored in `snip.linkTitles`.

**Save behaviour:** The Save button saves in place — it does **not** close the editor. In create mode, the first save transitions the editor to edit mode for the newly created snip in-place (via `internalEditSnip` state; no remount). Subsequent saves dispatch `EDIT_SNIP`. Cancel / back arrow / Escape close the editor (with dirty check).

**Dirty tracking:** `isDirty` compares `currentCanonical` against a `savedCanonical` state (initialized from the snip prop, updated on each save). This avoids stale comparisons since the snip prop never updates after save. Save button is disabled when `!isDirty || !canSave`.

**`SnipEditorHandle`:** The component is a `forwardRef` that exposes `{ isDirty: boolean, save: () => void }` via `useImperativeHandle`. App.tsx uses this ref for the navigation guard.

**Discard dialog:** Shown as an in-editor overlay when closing with unsaved changes. Buttons: "Keep editing" / "Discard".

**Shortcuts:** `Cmd/Ctrl+S` saves (in place), `Escape` closes (with dirty check).

## Edit Mode (`isEditMode`)

Toggled via the sliders icon button in the sidebar header. When `true`:

- Folder hover actions are visible (rename, add subfolder, add separator, delete)
- Folder rows become **draggable** for reordering (see Folder Drag below)
- `SeparatorRow` becomes draggable and shows the × remove button
- `DropZone` components render between folders to accept separator drops
- The "All Snips" rename button becomes visible

When `false` (default), the sidebar is read-only — no edit controls shown.

## Folder Drag-and-Drop Reordering

When `isEditMode` is active, folder rows are draggable. Dragging a folder over a sibling shows a drop indicator line (accent color) above or below the target row based on mouse Y position (top half → before, bottom half → after).

- `DragContext.draggingFolderId` tracks the active folder drag.
- On drop, dispatches `REORDER_FOLDER { sourceId, afterId, parentId }`.
- Guards: can't drop a folder onto itself or its own descendants.
- Ghost image: folder icon + name pill, positioned off-screen so the cursor stays visible.
- The dragged folder fades to `opacity-40` while dragging.

Same logic handles cross-parent moves: dropping a folder before/after a folder with a different parent updates `parentId` to match the target.

## Sidebar Separators

`src/components/sidebar/Separator.tsx` exports two components:

**`DropZone`** — always in the DOM (so drag events work before re-render); hidden with `h-0 overflow-hidden` when `!draggingDividerId`. Reads `draggingDividerId` from `DragContext`. On drop, dispatches `MOVE_DIVIDER`.

**`SeparatorRow`** — renders the horizontal line. Uses `py-1` padding for equal spacing above and below. Draggable only when `isEditMode`. Shows × button on hover in edit mode. On `onDragStart`, sets `draggingDividerId` in `DragContext`.

**Placement in tree:**

- `Sidebar.tsx` renders `DropZone(null)` + dividers with `afterFolderId=null` before root folders.
- `FolderItem.tsx` renders `DropZone(folder.id)` + dividers with `afterFolderId=folder.id` after each folder's children.

## DragContext

`src/context/DragContext.tsx` tracks five independent drag states:

- `draggingSnipId` / `setDraggingSnipId` — single snip card being dragged
- `draggingSnipIds` / `setDraggingSnipIds` — all snip IDs in an active bulk drag (selection mode)
- `draggingDividerId` / `setDraggingDividerId` — separator repositioning
- `draggingFolderId` / `setDraggingFolderId` — folder reordering (edit mode only)
- `draggingTagId` / `setDraggingTagId` — tag reordering in sidebar (edit mode only)

All are null/empty when no drag is active. Each drag type checks its own context value and does not interfere with the others.

**Important:** Drop handlers must read snip IDs from `e.dataTransfer.getData('text/plain')` (single) or `'application/json'` (bulk), not from DragContext — React state may not have updated by the time `dragover` fires, causing stale reads. Use `e.dataTransfer.types.includes('text/plain')` in `dragover` handlers to synchronously detect a snip drag.

**`effectAllowed` / `dropEffect` contract:** SnipCard sets `effectAllowed = 'move'` in `dragstart`. All drop targets (`FolderItem`, tag rows, trash) must set `dropEffect = 'move'` (not `'copy'`) in their `dragover` handlers — a mismatch silently prevents the `drop` event from firing.

## Tags

Tags are cross-folder colored labels. `state.tags` is an ordered array; `state.selectedTagId` drives filtering in `SnipGrid`.

**Sidebar:** Tags section renders between "Unfiled" row and folder tree. Always visible when `state.tags.length > 0` or `isEditMode`. Each tag row:

- Colored dot (6px, `tag.color`) + name + snip count badge
- Click → `SELECT_TAG` (clears `selectedFolderId`)
- Selected highlight uses the tag's own color (`backgroundColor: tag.color + '18'`, left border in `tag.color`)
- Snip drag-over highlight: `backgroundColor: tag.color + '22'` + `boxShadow` ring
- Edit mode: pencil (inline rename) + color dot (9-swatch popover) + trash icon
- Reorder by drag in edit mode; `REORDER_TAG { sourceId, afterId }` on drop

**Grid:** When `selectedTagId` is set, `viewSnips` filters `state.snips` to those with `tagIds?.includes(selectedTagId)`. Title badge shows a colored dot + tag name.

**SnipCard:** Tag pills render below the body when `snip.tagIds?.length > 0`. Pills: small dot + name, colored by tag. Clicking a pill dispatches `SELECT_TAG`. Capped at 4 pills with a `+N` overflow badge.

**SnipEditorView:** Tags section in the right panel (between Folder and Links). Shows assigned tags as removable pills. "+ Add tag" button opens an inline popover with search and a create-new-tag row. `tagIds` is included in dirty tracking and save payload.

**Drag snip → tag row:** `onDragOver` checks `e.dataTransfer.types.includes('text/plain')`, sets `dropEffect = 'move'`. `onDrop` reads bulk IDs from `'application/json'` (fires `snipper:bulk-drop-pending` custom event) or single ID from `'text/plain'` (dispatches `SET_SNIP_TAGS` directly with `new Set` deduplication).

## Sections

Sections are named groups within a single folder. `state.sections` is a flat array; each section has `folderId` and `order`. The implicit **General** group has no Section record — it is computed as snips where `sectionId` is null or points to a deleted section.

**Rendering order in `SnipGrid`:** Both General and named sections get an `_order` field. General → `_order = folder.defaultSectionOrder ?? -1`; Named → `_order = section.order`. All slots are sorted by `_order`, giving full positional control including General anywhere in the list.

**Section organizer** — toolbar list icon, slide-in panel. Shows all sections in order with drag handles. Rename inline; delete with inline confirm (snips fall back to General). Reorder by drag: `REORDER_SECTIONS_IN_FOLDER { folderId, orderedIds }`.

**Snip-to-section assignment:** `SET_SNIP_SECTION { snipId, sectionId }`. Set `sectionId: null` to move to General. Drag a snip onto a section header (single or bulk via `snipper:bulk-drop-pending`).

**Section collapsing:** `sectionCollapsed` local state in SnipGrid (`Record<string, boolean>`). `__general__` key for General. Toolbar button toggles all at once.

**`validSectionIds`:** Computed as `new Set(folderSections.map(s => s.id))` inside the sections render block. Snips matching General = `!s.sectionId || !validSectionIds.has(s.sectionId)`.

**Organizer counts** use `displaySnips` (same source as section headers) so both always match.

## Multi-Select

Selection mode lets users pick multiple snip cards and apply bulk Move / Tag / Delete in one step.

**Activation:** Grid-plus icon button in SnipGrid toolbar toggles `isSelectionMode`.

**Selection UX:**

- Click (mouseup) on a card toggles it in/out of `selectedSnipIds`. No action taken on mousedown.
- Selected card: `border-accent bg-accent/[0.06]` — accent border + subtle tint. No checkbox dot.
- Action bar replaces footer when `isSelectionMode`: shows count, Select All, Deselect All, Move, Tag, Delete, Cancel buttons.

**Escape flow (two-level):**

1. If a bulk modal is open → close it (stay in selection mode)
2. If `discardConfirmOpen` → close confirm (stay in selection mode)
3. Otherwise → `requestExitSelectionMode()`: if cards selected → show "Discard selection?" confirm; if none selected → exit immediately
4. On the discard confirm: Enter = `exitSelectionMode()`, Escape = keep selecting

**Bulk context menu:** Right-click any card in selection mode → auto-selects that card if not already selected → shows fixed-position popup with Move / Tag / Delete for all selected.

**Bulk drag:**

- `draggable` is always `true` on SnipCard (not gated by `isSelectionMode`).
- If `isSelectionMode && selected && bulkDragIds.length > 1`: sets `draggingSnipIds` in DragContext, writes all IDs to `'application/json'` dataTransfer, shows stacked ghost pill with count badge.
- All selected cards dim (`opacity-40`) during drag via `isInBulkDrag = draggingSnipIds.includes(snip.id)`.
- Drop handlers fire `snipper:bulk-drop-pending` custom event with `{ type, snipIds, ... }`.
- `SnipGrid` listens for `snipper:bulk-drop-pending` → sets `pendingBulkDrop` state → renders confirmation modal before dispatching any actions.

**`PendingBulkDrop` type** (defined in SnipGrid):

```ts
type PendingBulkDrop =
  | { type: 'move';   snipIds: string[]; folderId: string; folderName: string }
  | { type: 'tag';    snipIds: string[]; tagId: string; tagName: string; tagColor: string }
  | { type: 'delete'; snipIds: string[] }
```

## Trash System

Soft-delete pattern: items moved to `state.trash` on delete rather than permanently removed.

- **`TrashView`** — mirrors SnipGrid navbar (search, expand-all, grid/list, settings gear) with Recover All + Empty Trash buttons. Shows `TrashedSnipCard` and `TrashedFolderCard`.
- **Drag to trash** — dragging a snip card over the sidebar trash button dispatches `DELETE_SNIP` directly.
- Each trash card has inline **Recover** (accent) and **Delete** (red) buttons at the bottom-right, with confirm modals.
- Restore confirm shows where the item will be restored to (folder name or "All Snips").

## Export & Import

Both views are accessed from Settings gear → Export Snips / Import Snips.

**`ExportView`** (`src/components/data/ExportView.tsx`) — All snips start selected. Folder cards are collapsible; clicking a folder header toggles all its snips. Snips inside folders with sections are rendered grouped by section, mirroring SnipGrid's `_order`-based slot sort. `handleExport` builds the payload: ancestor folders of selected snips, sections only for sections that have ≥1 selected snip, tags referenced by selected snips. Downloads a `.json` file.

**`ImportView`** (`src/components/data/ImportView.tsx`) — Drag-and-drop or click-to-browse for a `.json` file. `validateAndParse` does strict validation with user-friendly errors; rejects non-Snipper JSON via `_snipperExport !== true` guard. `computePreview` is a pure function producing `{ newFolders, newSnips, newSections, newTags, skippedSnips }`: folders matched by full path, sections by `name + folderId`, tags by `name + color`, snips deduped by `snipKey(name, body, pinned, remappedSectionId, sortedRemappedTagIds)` — all in destination ID space. New folders with no snips are pruned; sections for unreferenced folders are dropped. Preview phase shows what will be added and what will be skipped. `handleImport` dispatches `IMPORT_DATA` (append-only) and closes.

## Snip Card Interactions

Click and hold behaviour is controlled by `state.holdAction`:

| `holdAction` | Click | Hold (200ms) |
| --- | --- | --- |
| `'edit'` (default) | Copy to clipboard | Open editor |
| `'copy'` | Open editor | Copy to clipboard |

- **Right-click** — opens the same Edit / Move / Delete context menu as the ⋮ kebab button
- **Drag** — moves snip to a folder (custom pill ghost image)
- **⋮ button** — visible on hover; Edit opens `SnipEditorView`, Move opens searchable folder submenu
- **Visit button** — shown when entire body is a single valid http/https URL; opens in default browser

**Hold animation:** A radial fill (`clipPath: circle(...)`) and progressive blur/fade animate over 200ms via `requestAnimationFrame`. `holdProgress` is reset to 0 when the hold fires (so the fill clears before the copy/edit overlay appears). Copy animation: "Copied!" overlay (`opacity` + `scale`) and content blur (`filter` + `opacity`) both transition 500ms. Content transition is active only when `holdProgress === 0` so the RAF-driven hold animation stays frame-accurate.

## Link Actions on Snip Cards

When a snip body contains one or more URLs, each URL is rendered as an action button below the body (after the horizontal divider). Button label uses the custom title from `snip.linkTitles[url]` if set, otherwise falls back to `getDefaultLinkTitle(url)` (hostname + path, truncated at 48 chars).

## Settings Gear

`src/components/ui/Settings.tsx` — gear icon in the SnipGrid/TrashView/SnipEditorView/HelpView navbar. Uses a three-view dropdown (`'main'` | `'themes'` | `'purge'`):

**Main view:**

- Theme row (shows current theme label, chevron → opens themes submenu)
- Auto-empty trash row (shows current duration, chevron → opens purge submenu)
- Tips toggle
- Delete prompt toggle
- Hold action toggle (`'edit'` = hold to edit / `'copy'` = hold to copy)
- Auto update checks toggle (`autoUpdateEnabled`)
- Check for updates row (left: "Check for updates" button; right: `v{version} ↓` download button when update available)
- Copy trust command button (macOS only) — copies `sudo xattr -cr /Applications/Snipper.app`
- Progress bar when installer is downloading; "Saved!" message when done
- Help Center entry (hidden when already in HelpView)
- About entry (opens `AboutModal`)

**Themes view:** Back button + Default / Light / Dark groups, all 11 themes, checkmark on active.

**Purge view:** Back button + Never / 1 hour / 7 days presets + custom duration input (number + unit select). Max 60 min or 24 hr enforced with flash warning.

**Update flow (macOS):** Check triggers `updates:check` IPC → `available` event sets `availableVersion` → user clicks download → `updates:choose-save-path` opens native save dialog → `updates:download-installer` streams file with `installer-progress` events → progress bar → "Saved!" message. No Squirrel/auto-install involved.

## About Modal

`src/components/modals/AboutModal.tsx` — shows app icon, version (from `APP_VERSION` in `PatchNotesModal`), description, and author. Links to `PatchNotesModal`.

`src/components/modals/PatchNotesModal.tsx` — reads `src/data/patch-notes.json`. Shows the latest version's changes. `APP_VERSION` is exported from this file (= `patchNotes[0].version`).

`src/data/patch-notes.json` — array of `{ version, date, changes[] }`. Index 0 is always the latest.

## Tips Footer

`src/components/snips/TipsFooter.tsx` — accepts `visible: boolean` prop. Always mounted; uses `max-h` + `opacity` transition (300ms) for smooth show/hide. Tips cycle every 7s with a 500ms fade.

## Sidebar Folder Search

Single text input in sidebar nav. Typing filters all folders (including nested) in real time using `flattenFolders()`. In search mode: shows flat list with depth indentation, clicking a result selects it and clears search. The `+` button inside the field (appears when text is present) creates a new root folder.

**Folder selection prop chain:** All folder and "All Snips" clicks go through `onSelectFolder: (id: string | null) => void` passed from App.tsx → Sidebar → FolderItem (via `onSelect` prop, threaded recursively to children). This lets App.tsx gate navigation when the editor is dirty. When `onSelect` is provided, FolderItem skips calling `onNavigate` (App.tsx handles side effects such as closing trash).

## Key Utilities

- `src/utils/folders.ts` — `flattenFolders(folders, parentId, depth)` returns `{folder, depth}[]` in tree order; `getAllDescendantIds(folderId, folders)` returns all descendant IDs recursively.
- `src/utils/links.ts` — `extractLinks(text)` returns deduplicated normalized URLs; `getDefaultLinkTitle(url)` returns hostname+path; `getLinkTitle(url, titles?)` returns custom title or default; `normalizeLinkKey(value)` normalizes raw URL strings.
- `src/utils/id.ts` — `generateId()` via `crypto.randomUUID()`
- `src/hooks/useCopyToClipboard.ts` — `copy(text)` + `copied` boolean, auto-resets after given ms

## FolderItem — Selected Background Width

Root folders (`depth=0`) use `paddingLeft: 8px` with no `marginLeft` → background spans full sidebar width.

Child folders (`depth>0`) use `paddingLeft: 8px` + `marginLeft: ${depth * 14}px` → background starts at the indentation level, not the left edge.

## File Structure

```text
electron/
  main.ts          # BrowserWindow, IPC (loadData, saveData, shell:openUrl, updates:*, titlebar:doubleclick, window:drag-*)
  preload.ts       # contextBridge → window.api (platform, loadData, saveData, openUrl, titlebarDoubleClick, drag*, updates{})
src/
  App.tsx          # Root: sidebar + main panel routing (editor/trash/grid)
  types/index.ts   # All interfaces and types
  data/
    patch-notes.json   # Version history [{version, date, changes[]}]
  store/
    AppContext.tsx  # Provider, load/save, useApp() hook
    actions.ts     # Action union type
    reducer.ts     # Pure reducer
    initialState.ts
  context/
    DragContext.tsx # draggingSnipId + draggingSnipIds + draggingDividerId + draggingFolderId + draggingTagId
  hooks/
    useCopyToClipboard.ts
  utils/
    folders.ts     # flattenFolders, getAllDescendantIds
    links.ts       # extractLinks, getDefaultLinkTitle, getLinkTitle, normalizeLinkKey
    id.ts / clipboard.ts
  components/
    sidebar/
      Sidebar.tsx        # Nav, search/add field, edit mode toggle, trash button, separator rendering
      FolderItem.tsx     # Folder row, rename, delete modal, child add, drag reorder, snip drop target
      Separator.tsx      # DropZone + SeparatorRow
      AddFolderButton.tsx  # (legacy, unused)
    data/
      ExportView.tsx     # Export: folder tree with section grouping, selective snip picker
      ImportView.tsx     # Import: drag-and-drop, validate, preview, append-only commit
    snips/
      SnipGrid.tsx       # Navbar, search, sort, sections, view toggle, card grid/list
      SnipCard.tsx       # Copy, right-click menu, drag, kebab, visit/link buttons
      SnipEditorView.tsx # Full-canvas create+edit editor with side panel and link manager
      EmptyState.tsx
      TipsFooter.tsx     # Cycling tips footer + TIP_CATEGORIES (used by HelpView)
    trash/
      TrashView.tsx      # Trash navbar + TrashedSnipCard + TrashedFolderCard
    help/
      HelpView.tsx       # Help Center: category sidebar, searchable tips, prev/next nav
    modals/
      Modal.tsx          # Backdrop, Escape, focus trap
      AboutModal.tsx     # App info + version + link to patch notes
      PatchNotesModal.tsx # Reads patch-notes.json, exports APP_VERSION
      SnipForm.tsx       # (legacy modal form, kept for reference)
      AddSnipModal.tsx / EditSnipModal.tsx  # (legacy, superseded by SnipEditorView)
    ui/
      Settings.tsx       # Gear dropdown: theme submenu + toggles + About
      ThemePicker.tsx    # Standalone (unused, kept for reference)
      FolderSelect.tsx   # Searchable folder dropdown
      Button.tsx / Input.tsx / Textarea.tsx
```
