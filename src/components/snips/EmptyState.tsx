interface EmptyStateProps {
  onAdd: () => void
  isSearching: boolean
  isFiltering?: boolean
  onClearFilters?: () => void
}

export function EmptyState({ onAdd, isSearching, isFiltering, onClearFilters }: EmptyStateProps) {
  if (isFiltering) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 select-none">
        <div className="w-12 h-12 rounded-2xl bg-panel border border-border flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-fg mb-1">No snips match these filters</p>
        <p className="text-xs text-muted mb-4">Try adjusting your filters or search scope</p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-accent hover:text-accent/80 transition-colors"
          >
            Clear filters
          </button>
        )}
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
