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
interface Folder   { id, name, parentId: string | null, createdAt }
interface Snip     { id, folderId, name, body, linkTitles?: Record<string, string>, createdAt, updatedAt }
interface Divider  { id, afterFolderId: string | null }  // null = before all root folders

interface TrashedSnip   { id, type: 'snip', deletedAt, snip: Snip }
interface TrashedFolder { id, type: 'folder', deletedAt, folders: Folder[], snips: Snip[], dividers: Divider[] }
type TrashedItem = TrashedSnip | TrashedFolder

interface AppState {
  folders: Folder[]
  snips: Snip[]
  dividers: Divider[]              // sidebar separators
  trash: TrashedItem[]             // soft-deleted items
  selectedFolderId: string | null  // null = "All Snips"
  viewMode: 'grid' | 'list'
  theme: Theme
  allSnipsLabel: string            // renameable "All Snips" label
  tipsEnabled: boolean
  isEditMode: boolean              // sidebar edit/organize mode
  deleteConfirmEnabled: boolean    // show confirm dialog before deleting
  holdAction: 'edit' | 'copy'     // what holding a snip card does
}
```

`linkTitles` maps detected URLs in the snip body to custom display labels. Only non-default, non-empty titles are stored. The reducer sanitizes via `sanitizeLinkTitles()` on every add/edit.

## Actions

```text
ADD_FOLDER / RENAME_FOLDER / DELETE_FOLDER / REORDER_FOLDER / SELECT_FOLDER
ADD_SNIP / EDIT_SNIP / DELETE_SNIP / MOVE_SNIP
SET_VIEW_MODE / SET_THEME / SET_ALL_SNIPS_LABEL
SET_TIPS_ENABLED / SET_DELETE_CONFIRM_ENABLED / SET_HOLD_ACTION / TOGGLE_EDIT_MODE
ADD_DIVIDER / MOVE_DIVIDER / REMOVE_DIVIDER
RESTORE_TRASH_ITEM / RESTORE_ALL_TRASH / PERMANENTLY_DELETE_TRASH_ITEM / EMPTY_TRASH
LOAD_STATE
```

**Reducer invariants:**

- `DELETE_FOLDER` soft-deletes — captures full subtree (folders + snips + dividers) into a `TrashedFolder` entry. Resets `selectedFolderId` to null if the deleted folder was selected.
- `DELETE_SNIP` soft-deletes — moves snip into a `TrashedSnip` entry in `trash`.
- `ADD_FOLDER` auto-selects the new folder.
- `TOGGLE_EDIT_MODE` flips `isEditMode` boolean.
- `REORDER_FOLDER` — `{ sourceId, afterId, parentId }`: removes source from array, updates its `parentId`, inserts after `afterId` (or at start of `parentId` group if `afterId` is null). Guards against moving a folder into its own descendants.

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

`App.tsx` renders one of four views in the main panel based on state:

1. **`SnipEditorView` (create)** — when `createOpen === true`
2. **`SnipEditorView` (edit)** — when `editTarget !== null`
3. **`TrashView`** — when `trashOpen === true`
4. **`SnipGrid`** — default

The `N` shortcut sets `createOpen = true`. Clicking Edit on a snip card sets `editTarget`. Clicking trash in the sidebar sets `trashOpen`. Navigating to any folder via sidebar always closes trash (via `useEffect` on `selectedFolderId`).

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

`src/context/DragContext.tsx` tracks three independent drag states:

- `draggingSnipId` / `setDraggingSnipId` — snip card → folder drop
- `draggingDividerId` / `setDraggingDividerId` — separator repositioning
- `draggingFolderId` / `setDraggingFolderId` — folder reordering (edit mode only)

All are null when no drag is active. Each drag type checks its own context value and does not interfere with the others.

## Trash System

Soft-delete pattern: items moved to `state.trash` on delete rather than permanently removed.

- **`TrashView`** — mirrors SnipGrid navbar (search, expand-all, grid/list, settings gear) with Recover All + Empty Trash buttons. Shows `TrashedSnipCard` and `TrashedFolderCard`.
- **Drag to trash** — dragging a snip card over the sidebar trash button dispatches `DELETE_SNIP` directly.
- Each trash card has inline **Recover** (accent) and **Delete** (red) buttons at the bottom-right, with confirm modals.
- Restore confirm shows where the item will be restored to (folder name or "All Snips").

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

`src/components/ui/Settings.tsx` — gear icon in the SnipGrid/TrashView/SnipEditorView navbar. Uses a two-view dropdown (`'main'` | `'themes'`):

**Main view:**

- Theme row (shows current theme label, chevron → opens themes submenu)
- Tips toggle
- Delete prompt toggle
- Hold action toggle (`'edit'` = hold to edit / `'copy'` = hold to copy)
- About entry (opens `AboutModal`)

**Themes view:**

- Back button
- Default / Light / Dark groups, all 11 themes, checkmark on active

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
  main.ts          # BrowserWindow, IPC (loadData, saveData, shell:openUrl)
  preload.ts       # contextBridge → window.api
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
    DragContext.tsx # draggingSnipId + draggingDividerId + draggingFolderId
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
    snips/
      SnipGrid.tsx       # Navbar, search, view toggle, card grid/list
      SnipCard.tsx       # Copy, right-click menu, drag, kebab, visit/link buttons
      SnipEditorView.tsx # Full-canvas create+edit editor with side panel and link manager
      EmptyState.tsx
      TipsFooter.tsx
    trash/
      TrashView.tsx      # Trash navbar + TrashedSnipCard + TrashedFolderCard
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
