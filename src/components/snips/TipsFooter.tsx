import { useState, useEffect } from 'react'

export const TIPS = [
  'Click any card to instantly copy its content to clipboard.',
  'Press N anywhere to quickly create a new snip.',
  'Use Cmd+F or Ctrl+F to search snips by name or content.',
  'Use the ⋮ menu on a card to edit, move, or delete it.',
  'All Snips is a space of its own — snips added there don\'t need to live inside any folder.',
  'Drag a card onto a sidebar folder to move it.',
  'Toggle between grid and list view with the view buttons.',
  'Hover a folder and click + to create a nested subfolder.',
  'Rename any folder by hovering it and clicking the pencil icon.',
  'Click the expand icon in the toolbar to reveal all card content at once.',
  'Drag the sidebar divider to resize it, or click the panel icon to collapse.',
  'Press Escape to clear the search bar.',
  'Hover "All Snips" in the sidebar to rename that view label.',
]

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
          hovered ? 'bg-accent/6' : ''
        }`}
      >
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 transition-colors duration-200 ${hovered ? 'text-accent' : 'text-accent/60'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <p className={`text-[11px] transition-all duration-500 ${tipVisible ? 'opacity-100' : 'opacity-0'} ${hovered ? 'text-fg-2' : 'text-muted'}`}>
          {TIPS[tipIndex]}
        </p>
      </div>
    </div>
  )
}
