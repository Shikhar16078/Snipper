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
      'Press N anywhere to quickly create a new snip — no folder needs to be selected first.',
      'Toggle between grid and list view with the view buttons in the toolbar.',
      'Click the expand icon in the toolbar to reveal all card content at once.',
      'Open Settings from the gear icon in the toolbar to change themes, configure trash, and toggle preferences.',
      'All snips that don\'t belong to any folder appear when you click "All Snips" in the sidebar.',
      'The snip count badge next to each folder shows how many snips are directly inside it.',
      'Hover the "All Snips" label in the sidebar to rename it to anything you like.',
      'Use the star button in the toolbar to filter and see only your starred snips.',
      'The sidebar can be collapsed or resized by dragging its right edge — or clicking the panel icon.',
      'Choose from 11 themes in Settings → Themes to match your style, including dark and light variants.',
      'The toolbar pill floats at the edge of the content area — reposition it to left, top, right, or bottom in Settings.',
      'Import your existing snip library or export it for backup any time from the Settings gear menu.',
      'The "Unfiled" entry in the sidebar shows snips that were created without a folder.',
      'Sort snips by last modified, newest, oldest, alphabetical, or most-used via the sort button in the toolbar.',
    ],
  },
  {
    title: 'Working with Snips',
    description: 'Copy, edit, move, and interact with your snippets.',
    tips: [
      'Click and hold a card to open it in the editor — or swap to hold-to-copy in Settings.',
      'Hover a card and press E to edit, C to copy, or D to delete.',
      'Right-click any card or use the ⋮ button to edit, move, duplicate, or delete it.',
      'Drag a card onto a sidebar folder to move it.',
      'Drag any snip onto the Trash icon in the sidebar to delete it quickly.',
      'When a snip body contains a URL, a Visit button appears on the card to open it in your browser.',
      'Snips with multiple URLs show individual link buttons below the body — each opens its own URL.',
      'Press Cmd+S (or Ctrl+S) in the editor to save without closing — keep editing as long as you like.',
      'In the editor, the right panel lists every URL in your snip — set a custom display title for each link.',
      'The editor side panel can be resized by dragging its left edge, or hidden with the toggle button.',
      'Navigating away from the editor with unsaved changes will prompt you to save or discard.',
      'In create mode, saving the first time keeps the editor open so you can keep refining.',
      'The Save button is disabled when there are no unsaved changes — a quick way to check your status.',
      'Duplicate any snip from the ⋮ menu — great for creating variations without starting from scratch.',
      'Swap the hold action in Settings — choose whether holding a card opens the editor or copies to clipboard.',
      'The "most-used" sort ranks snips by how many times you\'ve copied them — surfaces your go-to snips.',
      'Use the folder picker in the editor\'s right panel to move a snip to a different folder while editing.',
      'Star any snip using the ⋮ menu — starred snips appear at the top of the star filter view.',
    ],
  },
  {
    title: 'Folders & Sidebar',
    description: 'Organize your snips with folders, nesting, and separators.',
    tips: [
      '"All Snips" is a global view — snips added there don\'t need to live inside any folder.',
      'The "Unfiled" view in the sidebar shows snips that don\'t belong to any folder.',
      'Hover a folder and click + to create a nested subfolder inside it.',
      'Rename any folder by hovering it and clicking the pencil icon.',
      'In Edit Mode, drag folders to reorder or nest them — drop a folder onto another to make it a child.',
      'In Edit Mode, add separators between folders to visually group your sidebar.',
      'Drag separators to reposition them anywhere in the sidebar (Edit Mode).',
      'Type a folder name in the sidebar search bar, then press Enter or click + to create it instantly.',
      'The Trash icon shows a count badge when items are waiting to be reviewed or recovered.',
      'Drag the sidebar divider to resize it, or click the panel icon to collapse it entirely.',
      'Sidebar folder search shows a flat list of all matching folders with depth indentation — click to jump.',
      'Hover "All Snips" in the sidebar to reveal a rename button — call it anything you want.',
      'Deleting a folder moves its entire subtree — all subfolders, separators, and snips — to a single Trash entry.',
      'The sidebar remembers its width between sessions so your layout stays exactly how you left it.',
    ],
  },
  {
    title: 'Sections',
    description: 'Group snips within a folder into named, collapsible sections.',
    tips: [
      'Sections let you divide a folder\'s snips into named groups — like chapters within a folder.',
      'Click "+ New Section" at the bottom of a folder view to create your first section.',
      'Open the Section Organizer with the list icon in the toolbar to rename, reorder, or delete sections.',
      'Drag a snip card onto a section header to reassign it to that section.',
      'In the editor\'s right panel, use the section picker to assign or change the section of a snip.',
      'Clicking "New Snip" from inside a section\'s empty state pre-fills that section in the editor automatically.',
      'Collapse a section by clicking its header chevron — great for keeping long folders tidy.',
      'Use the collapse/expand button in the toolbar to toggle all sections at once.',
      'The "General" area holds snips not assigned to any named section — it\'s always present.',
      'Reorder sections by dragging rows in the Section Organizer dialog.',
      'Deleting a section moves all its snips into the General area — no snips are lost.',
      'Sections only appear when a specific folder is selected — All Snips and tag views are always flat.',
      'Drag multiple selected snips onto a section header to reassign them all at once.',
    ],
  },
  {
    title: 'Tags',
    description: 'Label snips with colored tags for cross-folder organization.',
    tips: [
      'Click a tag in the sidebar to see all snips carrying that tag, across every folder.',
      'A snip can have multiple tags — use them as a second axis alongside folders.',
      'Assign tags to a snip from the Tags section in the editor\'s right panel.',
      'Tag pills appear on snip cards below the body — click any pill to jump to that tag\'s view.',
      'Drag any snip card onto a tag in the sidebar to assign that tag instantly.',
      'Drag selected snips as a group onto a tag to assign it to all of them at once.',
      'Create a new tag by clicking the + next to "Tags" in the sidebar (Edit Mode required).',
      'Rename or recolor a tag by hovering it in Edit Mode and using the pencil or color dot.',
      'Choose from 9 curated colors — use them to signal urgency, category, or project.',
      'Deleting a tag removes it cleanly from all snips that had it; the snips themselves are unaffected.',
      'The snip count badge next to each tag shows exactly how many snips carry that tag.',
      'Reorder tags in the sidebar by dragging them in Edit Mode.',
      'The star filter works inside tag views too — see only starred snips within a tag.',
      'Tags and folders work together — a snip can belong to a folder and carry multiple tags simultaneously.',
      'Searching while a tag is selected filters only the snips within that tag view.',
    ],
  },
  {
    title: 'Multi-Select',
    description: 'Select multiple snips and apply bulk actions in one step.',
    tips: [
      'Activate Selection Mode with the grid-plus icon in the toolbar.',
      'In Selection Mode, click any card to select it — click again to deselect.',
      'Selected cards show an accent-colored border and a subtle tint so you know what\'s in your batch.',
      'Use "Select All" in the action bar to grab every visible snip at once.',
      'Deselect All clears the batch without exiting Selection Mode.',
      'Bulk Move sends all selected snips to any folder — search for the target in the move dialog.',
      'Bulk Assign Tag applies a tag to all selected snips simultaneously.',
      'Bulk Delete moves all selected snips to Trash in one action.',
      'Right-click any card while in Selection Mode to open the bulk context menu for all selected snips.',
      'Drag selected cards as a group — a stacked ghost pill shows how many are in the batch.',
      'Drop the batch onto a sidebar folder, tag, or Trash — a confirmation dialog appears before anything is applied.',
      'Press Escape once to close an open bulk action dialog; press Escape again to begin exiting selection.',
      'On the "discard selection?" prompt, press Enter to confirm discard or Escape to keep selecting.',
      'Selecting a snip via right-click in Selection Mode auto-adds it to the current batch.',
    ],
  },
  {
    title: 'Search & Navigation',
    description: 'Find snips fast and navigate your workspace.',
    tips: [
      'Use Cmd+F or Ctrl+F to focus the search bar instantly from anywhere in the app.',
      'Press Escape to clear the search bar and return to the full snip list.',
      'The search bar matches both snip names and body content simultaneously.',
      'Use the folder filter (funnel icon in the toolbar) to restrict search to one or more specific folders.',
      'The filter badge on the funnel icon shows how many folders are currently active in your filter.',
      'Clicking a filter chip next to the search bar removes just that filter without reopening the panel.',
      'Type in the sidebar folder search to filter folders by name in real time.',
      'Sidebar folder search shows all matching folders in a flat list — click a result to jump to it.',
      'When a tag is selected, the search bar filters snips within that tag\'s view only.',
      'The star filter splits the grid into Starred and Not Starred sections — scroll through both.',
      'Sort by Most Used to surface the snips you copy most — great for finding your go-to snippets.',
      'Use the Previous and Next buttons at the bottom of Help Center to browse all tip categories.',
      'Search here in Help Center to find tips across all categories by keyword.',
    ],
  },
  {
    title: 'Trash & Recovery',
    description: 'Recover deleted snips and folders, or clean up for good.',
    tips: [
      'Deleted snips and folders move to Trash — nothing is permanently lost until you choose.',
      'Click Recover on any trashed item to restore it to its original folder.',
      'A confirmation banner shows where the item will be restored before you confirm.',
      'Recover All restores every item in Trash at once.',
      'Empty Trash permanently deletes all items — this cannot be undone.',
      'Set Trash to auto-empty in Settings — choose 1 hour, 7 days, or a fully custom duration.',
      'Auto-purge supports custom durations — set anything from 10 minutes to several weeks.',
      'Trashed folder cards show a preview of the snips and subfolders that were inside them.',
      'Restoring a folder recovers its entire nested structure — subfolders, sections, and snips — exactly as it was.',
      'Deleting a folder moves its whole subtree — all subfolders and snips — to a single Trash entry.',
      'Drag a snip card directly onto the Trash icon in the sidebar to delete without a confirmation dialog.',
      'Use Cmd+F or Ctrl+F inside Trash to search through deleted items by name or content.',
      'Disable the delete confirmation prompt in Settings for faster single-click deletions.',
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
