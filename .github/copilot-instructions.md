# Copilot Instructions for Snipper

## Build, run, and type-check commands

Use Node.js + npm.

```bash
npm install
npm run dev              # Vite renderer only (http://localhost:5173)
npm run dev:electron     # Vite + Electron app together
npm run build:all        # Renderer build + Electron main build
npm run package:mac      # macOS package
npm run package:win      # Windows package
npx tsc --noEmit         # Renderer TypeScript check
```

There is currently no automated test runner or test script configured in `package.json`, and no `*.test.*` / `*.spec.*` files in the repo, so there is no single-test command yet.

## High-level architecture

Snipper is an Electron + React desktop app split into:

- **Electron main process** (`electron/main.ts`): creates the window, handles platform-specific window behavior, and persists state to `app.getPath('userData')/snipper-data.json`.
- **Electron preload bridge** (`electron/preload.ts`): exposes a narrow `window.api` surface (`loadData`, `saveData`, `openUrl`, titlebar drag/double-click IPC methods).
- **React renderer** (`src/`): UI and app logic, powered by Context + reducer state.

State lifecycle across files:

1. `AppProvider` (`src/store/AppContext.tsx`) loads persisted data through `window.api.loadData()` (or `localStorage` in browser mode), merges with `initialState`, and dispatches `LOAD_STATE`.
2. UI actions dispatch reducer events in `src/store/reducer.ts`.
3. Every state change is persisted with a 300ms debounce via `window.api.saveData()` (or `localStorage` fallback).

Main panel routing in `src/App.tsx` is state-driven and mutually exclusive:

- `SnipEditorView` (create)
- `SnipEditorView` (edit)
- `TrashView`
- `HelpView`
- `SnipGrid` (default)

Folder/trash navigation is centrally gated in `App.tsx` so unsaved editor changes are handled before navigation proceeds.

## Key codebase conventions

### 1) Reducer is the source of truth for invariants

Core behavior rules are enforced in `src/store/reducer.ts`, not UI components. Keep business rules there when adding/changing features:

- Folder delete is soft-delete of full subtree (folders + snips + dividers) into `trash`.
- Snip delete is soft-delete into `trash`.
- New folder is auto-selected.
- Folder reorder blocks invalid moves (self/descendant targets).
- `linkTitles` is sanitized during add/edit (`sanitizeLinkTitles` trims and removes empty values).

### 2) Backward compatibility relies on merge-with-initial-state

Persisted state is always loaded as:

```ts
{ ...initialState, ...loadedState }
```

When adding fields to `AppState`, update `initialState` and types first; this merge pattern is what keeps old user data compatible.

### 3) Theme implementation requires mirrored class logic

Theme classes are applied in two places and must stay aligned:

- `index.html` inline anti-flash script (pre-React render)
- `src/App.tsx` theme `useEffect` (runtime updates)

If adding/changing themes, update both files and the `Theme` union in `src/types/index.ts`.

### 4) Sidebar drag-and-drop uses shared drag context channels

`src/context/DragContext.tsx` tracks independent drag IDs for snips, dividers, and folders. Keep these channels separate when extending DnD behavior to avoid cross-interference between drag types.

### 5) Storage model assumptions

- Data is intentionally local JSON (no backend/service layer).
- Electron save/load errors are currently non-throwing in main process; renderer logic assumes load/save calls resolve.
- Browser mode is a fallback path using `localStorage` (used for renderer-only dev flows).

