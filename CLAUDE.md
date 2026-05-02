# Snipper Development Guide

This guide contains the project structure, coding standards, and common commands for Snipper.

## Project Structure
- `src/components/`: UI components categorized by feature (sidebar, snips, modals, ui).
- `src/store/`: Application state management (AppContext, reducer, actions).
- `src/context/`: React contexts (DragContext).
- `src/types/`: TypeScript interfaces and types.
- `src/utils/`: Utility functions.
- `electron/`: Main and preload scripts for the Electron process.
- `assets/`: App icons and static resources.

## Development Workflow
- **Run Dev**: `npm run dev:electron` (Starts Vite and Electron with hot reload).
- **Build**: `npm run build:all` (Compiles React app and Electron scripts).
- **Package**: `npm run package:mac` or `npm run package:win`.

## Coding Standards
- **React**: Functional components with hooks.
- **Styling**: Tailwind CSS for layout, Vanilla CSS (in `index.css`) for complex theme-based components.
- **State**: Use the centralized `AppState` via `useApp()` for global data.
- **Organization Mode**: Organizational UI (rename, delete, separators) must only be visible when `isEditMode` is true.

## CI/CD and Releases
- Releases are automated via GitHub Actions when a tag starting with `v*` is pushed.
- The workflow build for macOS and Windows simultaneously.
- Configuration for releases is managed in the `build` and `publish` sections of `package.json`.
