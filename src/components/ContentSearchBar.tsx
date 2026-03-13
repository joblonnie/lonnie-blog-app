import { useRef, useEffect, type KeyboardEvent } from 'react';

interface ContentSearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  matchCount: number;
  currentIndex: number;
  goNext: () => void;
  goPrev: () => void;
  onClose: () => void;
}

export default function ContentSearchBar({
  query,
  setQuery,
  matchCount,
  currentIndex,
  goNext,
  goPrev,
  onClose,
}: ContentSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) goPrev();
      else goNext();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed top-14 right-2 left-2 sm:left-auto sm:right-4 sm:w-80 z-40 bg-white border border-gray-200 rounded-lg shadow-lg flex items-center gap-1.5 px-3 py-2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search in document..."
        className="flex-1 min-w-0 text-sm bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
      />

      <span className="text-xs text-gray-400 shrink-0 tabular-nums">
        {query ? (matchCount > 0 ? `${currentIndex + 1} / ${matchCount}` : 'No matches') : ''}
      </span>

      <button
        onClick={goPrev}
        disabled={matchCount === 0}
        className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition-colors"
        aria-label="Previous match"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      <button
        onClick={goNext}
        disabled={matchCount === 0}
        className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition-colors"
        aria-label="Next match"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"
        aria-label="Close search"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
