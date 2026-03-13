import { useState, useCallback, useEffect, type RefObject } from 'react';
import { fetchAnnotations, createAnnotation, deleteAnnotation } from '@/lib/api';
import type { Annotation, AnnotationType, HighlightColor } from '@/types';

interface UseAnnotationsReturn {
  annotations: Annotation[];
  getSelectionOffsets: () => { selectedText: string; startOffset: number; endOffset: number } | null;
  addAnnotation: (type: AnnotationType, color?: HighlightColor, memo?: string) => Promise<void>;
  removeAnnotation: (id: number) => Promise<void>;
  reapply: () => void;
  getAnnotationAt: (target: HTMLElement) => Annotation | null;
}

export function useAnnotations(
  docId: number | undefined,
  containerRef: RefObject<HTMLDivElement | null>,
  content?: string,
): UseAnnotationsReturn {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Fetch annotations
  useEffect(() => {
    if (!docId) return;
    fetchAnnotations(docId).then(setAnnotations).catch(() => {});
  }, [docId]);

  // Apply annotations to DOM
  const applyToDOM = useCallback(() => {
    const el = containerRef.current;
    if (!el || annotations.length === 0) return;

    // Clear existing annotation marks
    const existingMarks = el.querySelectorAll('mark[data-annotation-id]');
    existingMarks.forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
    });
    el.normalize();

    // Sort annotations by startOffset descending so we apply from end to start
    // to avoid offset shifts
    const sorted = [...annotations].sort((a, b) => b.startOffset - a.startOffset);

    for (const ann of sorted) {
      applyOneAnnotation(el, ann);
    }
  }, [annotations, containerRef]);

  // Reapply after content search closes or content changes
  useEffect(() => {
    if (!containerRef.current || !content) return;
    // Small delay to let content render
    const timer = setTimeout(() => applyToDOM(), 50);
    return () => clearTimeout(timer);
  }, [content, applyToDOM]);

  // Also reapply when annotations change
  useEffect(() => {
    if (!containerRef.current) return;
    const timer = setTimeout(() => applyToDOM(), 50);
    return () => clearTimeout(timer);
  }, [annotations, applyToDOM]);

  const getSelectionOffsets = useCallback((): { selectedText: string; startOffset: number; endOffset: number } | null => {
    const el = containerRef.current;
    if (!el) return null;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return null;

    const selectedText = sel.toString();
    if (!selectedText.trim()) return null;

    // Calculate offsets relative to container's textContent
    const startOffset = getTextOffset(el, range.startContainer, range.startOffset);
    const endOffset = getTextOffset(el, range.endContainer, range.endOffset);

    return { selectedText, startOffset, endOffset };
  }, [containerRef]);

  const addAnnotation = useCallback(async (type: AnnotationType, color?: HighlightColor, memo?: string) => {
    if (!docId) return;
    const offsets = getSelectionOffsets();
    if (!offsets) return;

    const ann = await createAnnotation({
      documentId: docId,
      type,
      color,
      selectedText: offsets.selectedText,
      startOffset: offsets.startOffset,
      endOffset: offsets.endOffset,
      memo,
    });

    setAnnotations((prev) => [...prev, ann]);
    window.getSelection()?.removeAllRanges();
  }, [docId, getSelectionOffsets]);

  const removeAnnotation = useCallback(async (id: number) => {
    await deleteAnnotation(id);
    setAnnotations((prev) => prev.filter((a) => a.id !== id));

    // Remove the mark from DOM immediately
    const el = containerRef.current;
    if (el) {
      const mark = el.querySelector(`mark[data-annotation-id="${id}"]`);
      if (mark && mark.parentNode) {
        mark.parentNode.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
        el.normalize();
      }
    }
  }, [containerRef]);

  const reapply = useCallback(() => {
    const el = containerRef.current;
    if (el) el.normalize();
    applyToDOM();
  }, [containerRef, applyToDOM]);

  const getAnnotationAt = useCallback((target: HTMLElement): Annotation | null => {
    const mark = target.closest('mark[data-annotation-id]');
    if (!mark) return null;
    const id = Number(mark.getAttribute('data-annotation-id'));
    return annotations.find((a) => a.id === id) ?? null;
  }, [annotations]);

  return { annotations, getSelectionOffsets, addAnnotation, removeAnnotation, reapply, getAnnotationAt };
}

function getTextOffset(container: HTMLElement, node: Node, offset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let total = 0;
  let current: Node | null;
  while ((current = walker.nextNode())) {
    if (current === node) {
      return total + offset;
    }
    total += (current.textContent ?? '').length;
  }
  return total + offset;
}

function applyOneAnnotation(container: HTMLElement, ann: Annotation): void {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let accumulated = 0;
  const textNodes: { node: Text; start: number; end: number }[] = [];

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const len = (node.textContent ?? '').length;
    const nodeStart = accumulated;
    const nodeEnd = accumulated + len;
    textNodes.push({ node: node as Text, start: nodeStart, end: nodeEnd });
    accumulated = nodeEnd;
  }

  // Find text nodes that overlap with the annotation range
  const overlapping = textNodes.filter(
    (tn) => tn.start < ann.endOffset && tn.end > ann.startOffset,
  );

  if (overlapping.length === 0) return;

  // Process in reverse order to avoid DOM mutation issues
  for (let i = overlapping.length - 1; i >= 0; i--) {
    const tn = overlapping[i];
    const relStart = Math.max(0, ann.startOffset - tn.start);
    const relEnd = Math.min(tn.end - tn.start, ann.endOffset - tn.start);
    const text = tn.node.textContent ?? '';

    if (relStart >= relEnd) continue;

    const before = text.slice(0, relStart);
    const middle = text.slice(relStart, relEnd);
    const after = text.slice(relEnd);

    const frag = document.createDocumentFragment();
    if (before) frag.appendChild(document.createTextNode(before));

    const mark = document.createElement('mark');
    mark.setAttribute('data-annotation-id', String(ann.id));
    mark.textContent = middle;

    if (ann.type === 'highlight') {
      mark.className = `annotation-highlight annotation-highlight-${ann.color ?? 'yellow'}`;
    } else if (ann.type === 'underline') {
      mark.className = 'annotation-underline';
    } else if (ann.type === 'memo') {
      mark.className = 'annotation-memo';
      if (ann.memo) mark.setAttribute('data-memo', ann.memo);
    }

    frag.appendChild(mark);
    if (after) frag.appendChild(document.createTextNode(after));

    tn.node.parentNode?.replaceChild(frag, tn.node);
  }
}
