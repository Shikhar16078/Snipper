import { useState, useEffect } from 'react'

export interface TipCategory {
  title: string
  description: string
  tips: string[]
}

export const TIP_CATEGORIES: TipCategory[] = [
  {
    title: 'Getting Started',
    description: 'The essentials to get up and running with Snipper.',
    tips: [
      'Click any card to instantly copy its content to clipboard.',
      'Press N anywhere to quickly create a new snip.',
      'Toggle between grid and list view with the view buttons.',
      'Click the expand icon in the toolbar to reveal all card content at once.',
      'Open Settings from the gear icon in the toolbar to change themes, configure trash, and toggle preferences.',
    ],
  },
  {
    title: 'Working with Snips',
    description: 'Copy, edit, move, and interact with your snippets.',
    tips: [
      'Click and hold a card to open it in the editor — or swap to hold-to-copy in Settings.',
      'Hover a card and press E to edit, C to copy, or D to delete.',
      'Right-click any card or use the ⋮ button to edit, move, or delete it.',
      'Drag a card onto a sidebar folder to move it.',
      'Drag any snip onto the Trash icon in the sidebar to delete it quickly.',
      'When a snip body contains a URL, a Visit button appears to open it in your browser.',
      'Press Cmd+S (or Ctrl+S) in the editor to save without closing it.',
      'In the editor, the right panel lists every URL in your snip — set a custom display title for each link.',
      'The editor side panel can be resized by dragging its left edge, or hidden with the toggle button.',
      'Navigating away from the editor with unsaved changes will prompt you to save or discard.',
    ],
  },
  {
    title: 'Folders & Sidebar',
    description: 'Organize your snips with folders, nesting, and separators.',
    tips: [
      'All Snips is a space of its own — snips added there don\'t need to live inside any folder.',
      'Hover a folder and click + to create a nested subfolder.',
      'Rename any folder by hovering it and clicking the pencil icon.',
      'In Edit Mode, drag folders to reorder or nest them within other folders.',
      'In Edit Mode, add separators between folders to organize your sidebar.',
      'Drag the sidebar divider to resize it, or click the panel icon to collapse.',
      'Type a folder name in the sidebar search bar, then press Enter or click + to create it instantly.',
      'The Trash icon shows a count badge when items are waiting to be reviewed or recovered.',
    ],
  },
  {
    title: 'Search & Navigation',
    description: 'Find snips fast and navigate your workspace.',
    tips: [
      'Use Cmd+F or Ctrl+F to search snips by name or content.',
      'Press Escape to clear the search bar.',
      'Hover "All Snips" in the sidebar to rename that view label.',
      'Type in the sidebar folder search to filter folders by name in real time.',
      'Use the Previous and Next buttons at the bottom of Help Center to browse tip categories.',
    ],
  },
  {
    title: 'Trash & Recovery',
    description: 'Recover deleted snips and folders, or clean up for good.',
    tips: [
      'Deleted snips and folders move to Trash — nothing is permanently lost until you choose.',
      'Click Recover on any trashed item to restore it to its original folder.',
      'Recover All restores every item in Trash at once.',
      'Empty Trash permanently deletes all items — this cannot be undone.',
      'Set Trash to auto-empty in Settings — choose 1 day, 7 days, or a fully custom duration.',
      'Trashed folder cards show a preview of the snips that were inside them.',
      'Use Cmd+F or Ctrl+F inside Trash to search through deleted items.',
    ],
  },
]

export const TIPS = TIP_CATEGORIES.flatMap((c) => c.tips)

interface TipsFooterProps {
  visible: boolean
}

export function TipsFooter({ visible }: TipsFooterProps) {
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length))
  const [tipVisible, setTipVisible] = useState(true)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (hovered) return
    const cycle = setInterval(() => {
      setTipVisible(false)
      setTimeout(() => {
        setTipIndex((i) => (i + 1) % TIPS.length)
        setTipVisible(true)
      }, 500)
    }, 7000)
    return () => clearInterval(cycle)
  }, [hovered])

  return (
    <div
      className={`flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
        visible ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`border-t border-border px-4 py-2 flex items-center justify-center gap-2.5 rounded-b-xl transition-colors duration-200 ${
          hovered ? 'cursor-none' : ''
        }`}
      >
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 transition-all duration-300 ${
            hovered ? 'text-accent drop-shadow-[0_0_5px_rgba(var(--accent),0.8)]' : 'text-accent/60'
          }`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <p className={`text-[11px] transition-all duration-500 ${tipVisible ? 'opacity-100' : 'opacity-0'} ${
          hovered ? 'text-accent drop-shadow-[0_0_4px_rgba(var(--accent),0.5)]' : 'text-muted'
        }`}>
          {TIPS[tipIndex]}
        </p>
      </div>
    </div>
  )
}
