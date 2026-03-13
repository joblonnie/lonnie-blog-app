import { useState, useRef, useCallback, useEffect, type RefObject } from 'react';

interface UseContentSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  matchCount: number;
  currentIndex: number;
  goNext: () => void;
  goPrev: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function useContentSearch(content?: string): UseContentSearchReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQueryRaw] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearHighlights = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const marks = el.querySelectorAll('mark.search-highlight');
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
    });
    el.normalize();
  }, []);

  const applyHighlights = useCallback((q: string) => {
    const el = containerRef.current;
    if (!el || !q) {
      setMatchCount(0);
      setCurrentIndex(0);
      return;
    }

    clearHighlights();

    const lowerQ = q.toLowerCase();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    let total = 0;
    for (const textNode of textNodes) {
      const text = textNode.textContent ?? '';
      const lowerText = text.toLowerCase();
      if (!lowerText.includes(lowerQ)) continue;

      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      let idx = lowerText.indexOf(lowerQ, lastIdx);

      while (idx !== -1) {
        if (idx > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
        }
        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.dataset.matchIndex = String(total);
        mark.textContent = text.slice(idx, idx + q.length);
        frag.appendChild(mark);
        total++;
        lastIdx = idx + q.length;
        idx = lowerText.indexOf(lowerQ, lastIdx);
      }

      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }

      textNode.parentNode?.replaceChild(frag, textNode);
    }

    setMatchCount(total);
    setCurrentIndex(total > 0 ? 0 : 0);
  }, [clearHighlights]);

  const scrollToMatch = useCallback((index: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.querySelectorAll('mark.search-highlight-active').forEach((m) => {
      m.classList.remove('search-highlight-active');
    });
    const target = el.querySelector(`mark[data-match-index="${index}"]`);
    if (target) {
      target.classList.add('search-highlight-active');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Scroll to current match when index changes
  useEffect(() => {
    if (matchCount > 0) {
      scrollToMatch(currentIndex);
    }
  }, [currentIndex, matchCount, scrollToMatch]);

  const setQuery = useCallback((q: string) => {
    setQueryRaw(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      applyHighlights(q);
    }, 150);
  }, [applyHighlights]);

  const goNext = useCallback(() => {
    if (matchCount === 0) return;
    setCurrentIndex((prev) => (prev + 1) % matchCount);
  }, [matchCount]);

  const goPrev = useCallback(() => {
    if (matchCount === 0) return;
    setCurrentIndex((prev) => (prev - 1 + matchCount) % matchCount);
  }, [matchCount]);

  const open = useCallback(() => setIsOpen(true), []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQueryRaw('');
    setMatchCount(0);
    setCurrentIndex(0);
    clearHighlights();
  }, [clearHighlights]);

  // Re-apply highlights when content changes
  useEffect(() => {
    if (isOpen && query) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        applyHighlights(query);
      }, 150);
    }
  }, [content, isOpen, query, applyHighlights]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return {
    query,
    setQuery,
    matchCount,
    currentIndex,
    goNext,
    goPrev,
    isOpen,
    open,
    close,
    containerRef,
  };
}
