# ✂️ Snipper

**Your personal text snippet manager.** Store any text you use repeatedly — addresses, email templates, code blocks, boilerplate, signatures, URLs — and copy it to your clipboard in a single click.

![License](https://img.shields.io/github/license/Shikhar16078/Snipper)
![Version](https://img.shields.io/github/v/release/Shikhar16078/Snipper)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)

---

## 🤔 What is Snipper?

Snipper is a lightweight desktop app that keeps your frequently used texts within instant reach. Instead of hunting through old emails, documents, or notes every time you need your home address, a canned reply, a SQL query, or an API key — you save it once in Snipper and copy it with one click.

Think of it as a clipboard manager, but organized. Everything lives in folders you define, with a clean interface that stays out of your way.

**Common use cases:**

- 🏠 Home and work addresses
- 📧 Email templates and standard replies
- 💳 Bank details, order numbers, reference codes
- 🔗 Frequently shared links
- 💻 Code snippets and terminal commands
- ✍️ Bio texts, cover letter paragraphs, legal disclaimers
- 🌐 Usernames, API keys, configuration values

---

## ✨ Features

### 📋 One-Click Copy

Click any snippet card to instantly copy its content to the clipboard. A visual confirmation tells you the copy was successful.

### 🗂️ Folder Organization

Group your snippets into folders and subfolders. Create as many levels as you need — work, personal, projects, clients — whatever structure makes sense for you.

### 🔍 Instant Search

Search across all your snippets by name or content from the top search bar (`Cmd/Ctrl+F`). Results update as you type.

### ➕ Drag & Drop

Move snippets between folders by dragging them. In Organize mode, drag folders themselves to reorder them in the sidebar. Add custom separators between folders to create visual groups — those are draggable too.

### 🎨 11 Themes

Choose from 11 built-in themes across light and dark palettes:

| Light | Dark |
| --- | --- |
| Ivory | Stone *(default)* |
| Blush | Obsidian |
| Sage | Merlot |
| Dusk | Midnight |
| Arctic | Ember |
| | Nebula |

### 📝 Full-Canvas Editor

Creating or editing a snip opens a distraction-free full-canvas editor with a large writing area and a resizable side panel. The side panel shows the folder picker, timestamps, and a live link manager — any URLs detected in the body appear there so you can assign custom display titles.

### 🔗 Smart Link Detection

Snipper automatically detects URLs in your snippet body. If the entire body is a URL, a **Visit** button appears on the card to open it in your default browser. For snippets with multiple links, each URL gets its own labelled action button — customizable via the editor's link manager.

### 🗑️ Trash & Restore

Deleted snippets and folders go to Trash instead of being permanently removed. Open Trash from the sidebar to browse recently deleted items, restore them with one click, or permanently delete what you don't need. Restoring a folder brings back its entire nested structure. Set Trash to auto-empty after a chosen duration (1 hour, 7 days, or a custom interval) in Settings.

### 🗃️ Grid & List Views

Toggle between a grid layout for a quick visual overview or a compact list view when you have a lot of snippets.

### ❓ Help Center

A built-in Help Center (accessible from the Settings gear) organises all tips and shortcuts into searchable categories: Getting Started, Working with Snips, Folders & Sidebar, Search & Navigation, and Trash & Recovery.

### 🔄 Update Checking

Check for new versions directly from the Settings gear. When an update is available, download the installer straight to your Downloads folder with a live progress bar. Auto-update checks can also run silently in the background on launch.

### 🔒 Fully Local & Private

Everything is stored as a plain JSON file on your own machine. Nothing is sent to any server. You can back it up, move it, or inspect it any time.

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `N` | New snippet |
| `Cmd/Ctrl + F` | Focus search |
| `Cmd/Ctrl + S` | Save in editor |
| `Escape` | Close editor / clear search |
| `E` (hover card) | Open snippet in editor |
| `C` (hover card) | Copy snippet to clipboard |
| `D` (hover card) | Delete snippet |

---

## 🚀 Installation

Download the latest version for your platform from the [Releases](https://github.com/Shikhar16078/Snipper/releases) page.

### macOS

Download the `.dmg` file and open it. If you see a "damaged" or "unverified developer" warning on an unsigned build, run this once in Terminal:

```bash
sudo xattr -cr /Applications/Snipper.app
```

### Windows

Download and run the `.exe` installer and follow the setup wizard.

---

## 🏁 Quick Start

1. **Create a folder** — Type a name into the search field on the left sidebar and click `+`, or press Enter.
2. **Add a snippet** — Click **New Snip** in the top right (or press `N`). Give it a name and paste in the text you want to save.
3. **Copy** — Click any card to copy its content to your clipboard instantly.
4. **Organize** — Enable **Organize mode** (the sliders icon in the sidebar header) to rename folders, drag-reorder them, add separators, or delete items.

---

## 🛠️ Building from Source

If you want to build Snipper yourself or contribute to development:

### Prerequisites

- Node.js 18 or later
- npm

### Setup

```bash
git clone https://github.com/Shikhar16078/Snipper.git
cd Snipper
npm install
```

### Development

```bash
npm run dev:electron    # Starts the app with hot reload
```

### Build

```bash
npm run build:all       # Compile renderer + Electron main process
npm run package:mac     # Package for macOS → release/mac-arm64/Snipper.app
npm run package:win     # Package for Windows → release/
```

### Tech Stack

- **Shell**: [Electron](https://www.electronjs.org/)
- **UI**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Bundler**: [Vite](https://vitejs.dev/)
- **Packaging**: [electron-builder](https://www.electron.build/)

---

## 📄 License

MIT — see the [LICENSE](LICENSE) file for details.

---

*Built for anyone who types the same things over and over.*
