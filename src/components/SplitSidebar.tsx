import { useState, useMemo, useEffect } from 'react';

interface SplitSidebarItem {
  id: number;
  title: string;
  date: string;
  category?: string | null;
}

interface SplitSidebarProps {
  items: SplitSidebarItem[];
  currentId: number;
  selectedId?: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}

export default function SplitSidebar({ items, currentId, selectedId, onSelect, onClose }: SplitSidebarProps) {
  const [search, setSearch] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.title.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Select Document</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No documents found</p>
          ) : (
            filtered.map((item) => {
              const isCurrent = item.id === currentId;
              const isSelected = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  onClick={() => !isCurrent && onSelect(item.id)}
                  disabled={isCurrent}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
                    isCurrent
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      : isSelected
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50'
                  }`}
                >
                  <p className={`text-sm font-medium line-clamp-1 ${isCurrent ? 'text-gray-400' : isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                    {item.title}
                    {isCurrent && <span className="text-xs text-gray-400 ml-1">(current)</span>}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-gray-400">
                      {new Date(item.date).toLocaleDateString('ko-KR')}
                    </span>
                    {item.category && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-500">
                        {item.category}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
