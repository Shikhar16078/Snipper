interface EmptyStateProps {
  onAdd: () => void
  isSearching: boolean
  isStarFiltering?: boolean
}

export function EmptyState({ onAdd, isSearching, isStarFiltering }: EmptyStateProps) {
  if (isStarFiltering) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 select-none">
        <div className="w-12 h-12 rounded-2xl bg-panel border border-border flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-amber-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-fg mb-1">No starred snips</p>
        <p className="text-xs text-muted">Star a snip to pin it here</p>
      </div>
    )
  }

  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 select-none">
        <div className="w-12 h-12 rounded-2xl bg-panel border border-border flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-fg mb-1">No results</p>
        <p className="text-xs text-muted">Try a different search term</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 select-none">
      <div className="w-12 h-12 rounded-2xl bg-panel border border-border flex items-center justify-center mb-4">
        <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="text-sm font-medium text-fg mb-1">No snips yet</p>
      <p className="text-xs text-muted mb-5">Click any card to copy · Add your first snip below</p>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 bg-accent hover:bg-accent-h text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Snip
      </button>
    </div>
  )
}
