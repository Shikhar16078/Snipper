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

## Architecture

**Two-process Electron app:**

- `electron/main.ts` — main process; BrowserWindow, IPC handlers, JSON file I/O via Node `fs`. Window uses `titleBarStyle: 'hiddenInset'` for Mac traffic lights.
- `electron/preload.ts` — contextBridge; exposes `window.api.platform`, `window.api.loadData()`, `window.api.saveData()` to the renderer.
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
interface Snip     { id, folderId, name, body, createdAt, updatedAt }
interface Divider  { id, afterFolderId: string | null }  // null = before all root folders

interface AppState {
  folders: Folder[]
  snips: Snip[]
  dividers: Divider[]            // sidebar separators
  selectedFolderId: string | null  // null = "All Snips"
  viewMode: 'grid' | 'list'
  theme: Theme
  allSnipsLabel: string          // renameable "All Snips" label
  tipsEnabled: boolean
  isEditMode: boolean            // sidebar edit/organize mode
}
```

## Actions

```text
ADD_FOLDER / RENAME_FOLDER / DELETE_FOLDER / SELECT_FOLDER
ADD_SNIP / EDIT_SNIP / DELETE_SNIP / MOVE_SNIP
SET_VIEW_MODE / SET_THEME / SET_ALL_SNIPS_LABEL
SET_TIPS_ENABLED / TOGGLE_EDIT_MODE
ADD_DIVIDER / MOVE_DIVIDER / REMOVE_DIVIDER
LOAD_STATE
```

**Reducer invariants:**

- `DELETE_FOLDER` cascades — removes all descendant folders, their snips, and any dividers anchored to them. Resets `selectedFolderId` to null if deleted.
- `ADD_FOLDER` auto-selects the new folder.
- `TOGGLE_EDIT_MODE` flips `isEditMode` boolean.

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

Sidebar header and SnipGrid navbar are `h-[40px]` on Mac. Sidebar header uses `pl-[72px]` to clear traffic lights. Draggable regions: `.app-drag` / `.app-no-drag` utility classes in `src/index.css`. `window.api.platform` drives the `isMac` check.

## Edit Mode (`isEditMode`)

Toggled via the sliders icon button in the sidebar header. When `true`:

- Folder hover actions are visible (rename, add subfolder, add separator, delete)
- `SeparatorRow` becomes draggable and shows the × remove button
- `DropZone` components render between folders to accept separator drops
- The "All Snips" rename button becomes visible

When `false` (default), the sidebar is read-only — no edit controls shown.

## Sidebar Separators

`src/components/sidebar/Separator.tsx` exports two components:

**`DropZone`** — always in the DOM (so drag events work before re-render); hidden with `h-0 overflow-hidden` when `!draggingDividerId`. Reads `draggingDividerId` from `DragContext`. On drop, dispatches `MOVE_DIVIDER`.

**`SeparatorRow`** — renders the horizontal line. Draggable only when `isEditMode`. Shows × button on hover in edit mode. On `onDragStart`, sets `draggingDividerId` in `DragContext`.

**Placement in tree:**

- `Sidebar.tsx` renders `DropZone(null)` + dividers with `afterFolderId=null` before root folders.
- `FolderItem.tsx` renders `DropZone(folder.id)` + dividers with `afterFolderId=folder.id` after each folder's children.

"Add separator" button is a fixed footer at the bottom of the sidebar (outside the scroll area), hidden in search mode.

## DragContext

`src/context/DragContext.tsx` tracks two independent drag states:

- `draggingSnipId` / `setDraggingSnipId` — for snip card → folder drag-and-drop
- `draggingDividerId` / `setDraggingDividerId` — for separator repositioning

Both are null when no drag is active. `FolderItem` checks `draggingSnipId` before accepting drops. `DropZone` checks `draggingDividerId` before accepting drops. They don't interfere.

## Snip Card Interactions

- **Click** — copies body to clipboard; shows "Copied!" overlay for 1.5s with blur effect on content
- **Right-click** — opens the same Edit / Move / Delete context menu as the ⋮ kebab button
- **Drag** — moves snip to a folder (custom pill ghost image, tiny so cursor is visible over drop targets)
- **⋮ button** — visible on hover (or whenever menu is open); opens main menu or Move submenu with searchable folder picker

Copy animation: overlay (`opacity` + `scale`) and content blur (`filter` + `opacity`) both transition 500ms, driven by the `copied` boolean from `useCopyToClipboard(1500)`.

## Settings Gear

`src/components/ui/Settings.tsx` — gear icon in the SnipGrid navbar. Tinted with current theme's accent color. Opens a dropdown containing:

1. **Theme section** — Default / Light / Dark groups, all 11 themes, checkmark on active
2. **Tips toggle** — pill switch for `tipsEnabled`

`ThemePicker.tsx` still exists but is no longer used in the navbar (kept for reference).

## Tips Footer

`src/components/snips/TipsFooter.tsx` — accepts `visible: boolean` prop. Always mounted; uses `max-h` + `opacity` transition (300ms) for smooth show/hide without layout jump. Tips cycle every 7s with a 500ms opacity fade between tips.

## Sidebar Folder Search

Single text input in sidebar nav. Typing filters all folders (including nested) in real time using `flattenFolders()`. In search mode: shows flat list with depth indentation, clicking a result selects it and clears search. The `+` button inside the field (appears when text is present) creates a new root folder from the typed name.

## Key Utilities

- `src/utils/folders.ts` — `flattenFolders(folders, parentId, depth)` returns `{folder, depth}[]` in tree order; `getAllDescendantIds(folderId, folders)` returns all descendant IDs recursively.
- `src/utils/id.ts` — `generateId()` via `crypto.randomUUID()`
- `src/hooks/useCopyToClipboard.ts` — `copy(text)` + `copied` boolean, auto-resets after given ms, clears previous timeouts on rapid clicks

## Delete Folder

Clicking delete on a folder opens a confirmation modal (`Modal.tsx`) showing:

- Folder name
- Count of snips and subfolders that will be permanently deleted (if any)
- Cancel / Delete buttons

Cascade deletion happens in the reducer via `getAllDescendantIds`.

## File Structure

```text
electron/
  main.ts          # BrowserWindow, IPC, JSON file I/O
  preload.ts       # contextBridge → window.api
src/
  App.tsx          # Root: sidebar + SnipGrid + modals, theme class toggling, N shortcut
  types/index.ts   # All interfaces and types
  store/
    AppContext.tsx  # Provider, load/save, useApp() hook
    actions.ts     # Action union type
    reducer.ts     # Pure reducer
    initialState.ts
  context/
    DragContext.tsx # draggingSnipId + draggingDividerId
  hooks/
    useCopyToClipboard.ts
  utils/
    folders.ts     # flattenFolders, getAllDescendantIds
    id.ts / clipboard.ts
  components/
    sidebar/
      Sidebar.tsx        # Nav, search/add field, edit mode toggle, separator rendering
      FolderItem.tsx     # Folder row, rename, delete modal, child add, drop target
      Separator.tsx      # DropZone + SeparatorRow components
      AddFolderButton.tsx  # (legacy, unused at root level)
    snips/
      SnipGrid.tsx       # Navbar, search, view toggle, card grid/list
      SnipCard.tsx       # Copy, right-click menu, drag, kebab menu + move submenu
      EmptyState.tsx
      TipsFooter.tsx
    modals/
      Modal.tsx          # Backdrop, Escape, focus trap
      SnipForm.tsx       # Name + body + FolderSelect
      AddSnipModal.tsx / EditSnipModal.tsx
    ui/
      Settings.tsx       # Gear dropdown: theme picker + tips toggle
      ThemePicker.tsx    # Standalone (unused in navbar, kept for reference)
      FolderSelect.tsx   # Searchable folder dropdown used in SnipForm
      Button.tsx / Input.tsx / Textarea.tsx
```
