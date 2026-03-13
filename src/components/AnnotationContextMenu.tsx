import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnnotationType, HighlightColor, Annotation } from '@/types';

interface Position {
  x: number;
  y: number;
}

interface AnnotationContextMenuProps {
  position: Position;
  existingAnnotation: Annotation | null;
  onHighlight: (color: HighlightColor) => void;
  onUnderline: () => void;
  onMemo: (memo: string) => void;
  onRemove: (id: number) => void;
  onClose: () => void;
}

const COLORS: { key: HighlightColor; bg: string; label: string }[] = [
  { key: 'yellow', bg: 'bg-yellow-400', label: 'Yellow' },
  { key: 'green', bg: 'bg-green-400', label: 'Green' },
  { key: 'blue', bg: 'bg-blue-400', label: 'Blue' },
  { key: 'red', bg: 'bg-red-400', label: 'Red' },
  { key: 'purple', bg: 'bg-purple-400', label: 'Purple' },
];

export default function AnnotationContextMenu({
  position,
  existingAnnotation,
  onHighlight,
  onUnderline,
  onMemo,
  onRemove,
  onClose,
}: AnnotationContextMenuProps) {
  const [memoMode, setMemoMode] = useState(false);
  const [memoText, setMemoText] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Viewport boundary correction
  const [adjustedPos, setAdjustedPos] = useState(position);
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let { x, y } = position;
    if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight - 8) y = y - rect.height;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    setAdjustedPos({ x, y });
  }, [position]);

  // Focus memo input
  useEffect(() => {
    if (memoMode && inputRef.current) inputRef.current.focus();
  }, [memoMode]);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handleMemoSave = useCallback(() => {
    if (memoText.trim()) {
      onMemo(memoText.trim());
    }
  }, [memoText, onMemo]);

  // Existing annotation → show remove menu
  if (existingAnnotation) {
    return (
      <div
        ref={menuRef}
        className="fixed z-[70] bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]"
        style={{ left: adjustedPos.x, top: adjustedPos.y }}
      >
        <button
          onClick={() => onRemove(existingAnnotation.id)}
          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          Remove annotation
        </button>
      </div>
    );
  }

  // Memo input mode
  if (memoMode) {
    return (
      <div
        ref={menuRef}
        className="fixed z-[70] bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[240px]"
        style={{ left: adjustedPos.x, top: adjustedPos.y }}
      >
        <p className="text-xs font-medium text-gray-500 mb-2">Add Memo</p>
        <input
          ref={inputRef}
          type="text"
          value={memoText}
          onChange={(e) => setMemoText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleMemoSave();
          }}
          placeholder="Enter memo..."
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={() => { setMemoMode(false); setMemoText(''); }}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleMemoSave}
            disabled={!memoText.trim()}
            className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  // New annotation menu
  return (
    <div
      ref={menuRef}
      className="fixed z-[70] bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
      {/* Highlight with color swatches */}
      <div className="px-3 py-2 hover:bg-gray-50">
        <p className="text-sm text-gray-700 mb-1.5">Highlight</p>
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c.key}
              onClick={() => onHighlight(c.key)}
              title={c.label}
              className={`w-5 h-5 rounded-full ${c.bg} hover:ring-2 hover:ring-offset-1 hover:ring-gray-400 transition-all`}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* Underline */}
      <button
        onClick={onUnderline}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Underline
      </button>

      <div className="border-t border-gray-100" />

      {/* Add Memo */}
      <button
        onClick={() => setMemoMode(true)}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Add Memo...
      </button>
    </div>
  );
}
