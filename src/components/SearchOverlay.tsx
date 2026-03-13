import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDocuments, fetchPublicPosts } from '@/lib/api';

interface SearchResult {
  id: number;
  title: string;
  category: string | null;
  summary: string | null;
}

interface SearchOverlayProps {
  mode: 'admin' | 'public';
  onClose: () => void;
}

export default function SearchOverlay({ mode, onClose }: SearchOverlayProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Search with debounce
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setActiveIndex(0);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        if (mode === 'admin') {
          const docs = await fetchDocuments(query);
          setResults(docs.map((d) => ({ id: d.id, title: d.title, category: d.category ?? null, summary: d.summary ?? null })));
        } else {
          const posts = await fetchPublicPosts(undefined, undefined, query);
          setResults(posts.map((p) => ({ id: p.id, title: p.title, category: p.category ?? null, summary: p.summary ?? null })));
        }
        setActiveIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, mode]);

  const selectResult = useCallback((result: SearchResult) => {
    const path = mode === 'admin' ? `/admin/doc/${result.id}` : `/post/${result.id}`;
    navigate(path);
    onClose();
  }, [mode, navigate, onClose]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      selectResult(results[activeIndex]);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.children[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg mx-4">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search documents..."
              className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
            />
            <kbd className="hidden sm:inline text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">ESC</kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Searching...</div>
            )}
            {!loading && query && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No results found</div>
            )}
            {!loading && results.map((r, i) => (
              <button
                key={r.id}
                onClick={() => selectResult(r)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                  i === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 shrink-0 mt-0.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{r.title}</span>
                    {r.category && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded shrink-0">
                        {r.category}
                      </span>
                    )}
                  </div>
                  {r.summary && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{r.summary}</p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Footer hint */}
          {!loading && results.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-3">
              <span><kbd className="bg-gray-100 px-1 rounded">↑↓</kbd> Navigate</span>
              <span><kbd className="bg-gray-100 px-1 rounded">↵</kbd> Open</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
