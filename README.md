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

Move snippets between folders by dragging them. Reorder your sidebar with custom separators — drag them between folders to create visual groups.

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

### 🗃️ Grid & List Views

Toggle between a grid layout for a quick visual overview or a compact list view when you have a lot of snippets.

### 🔒 Fully Local & Private

Everything is stored as a plain JSON file on your own machine. Nothing is sent to any server. You can back it up, move it, or inspect it any time.

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `N` | New snippet |
| `Cmd/Ctrl + F` | Focus search |
| `Escape` | Clear search |

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
4. **Organize** — Enable **Organize mode** (the sliders icon in the sidebar header) to rename folders, add separators, or delete items.

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
npm run package:mac     # Package for macOS → dist/mac-arm64/Snipper.app
npm run package:win     # Package for Windows → dist/
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
