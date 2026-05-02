# ✂️ Snipper

A minimal, beautiful, and efficient code snippet manager for developers. Built with Electron, React, and TypeScript.

![License](https://img.shields.io/github/license/Shikhar16078/Snipper)
![Version](https://img.shields.io/github/v/release/Shikhar16078/Snipper)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)

## ✨ Features

- **Intuitive Organization**: Nested folder structures with draggable separators for custom layouts.
- **Smart Search**: Quickly find snippets across all folders.
- **Visual Management**: Toggle between Grid and List views to suit your workflow.
- **Theming**: Multiple built-in themes (Stone, Dusk, Nebula, and more) with support for Light and Dark modes.
- **Secure Storage**: Your snippets are stored locally on your machine, never leaving your device.
- **Clean UI**: A focused, distraction-free environment for managing your code library.
- **Organization Mode**: Dedicated mode for reorganizing folders and separators without accidental edits.

## 🚀 Getting Started

### Installation

Download the latest version for your platform from the [Releases](https://github.com/Shikhar16078/Snipper/releases) page.

- **macOS**: Download the `.dmg` file. If you see a "damaged" warning on unsigned builds, run the following in Terminal:
  ```bash
  sudo xattr -cr /Applications/Snipper.app
  ```
- **Windows**: Download and run the `.exe` installer.

### Development

If you want to build from source or contribute:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Shikhar16078/Snipper.git
   cd Snipper
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run in development mode**:
   ```bash
   npm run dev:electron
   ```

4. **Build for production**:
   ```bash
   # Build everything
   npm run build:all

   # Package for your current OS
   npm run package:mac  # or npm run package:win
   ```

## 🛠️ Tech Stack

- **Framework**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Bundler**: [Vite](https://vitejs.dev/)
- **Build Tool**: [electron-builder](https://www.electron.build/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ for developers who love clean code.
