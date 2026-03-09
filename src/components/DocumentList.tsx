import { useState, useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentList, useDocument, isAiPending } from '@/hooks/useDocuments';
import { deleteDocument, createDocument } from '@/lib/api';
import { toastManager } from './Toast';
import MarkdownRenderer from './MarkdownRenderer';
import { InfoPanelMobile } from './InfoPanel';
import ConfirmDialog from './ConfirmDialog';
import FileUpload from './FileUpload';
import { useRegenerate } from '@/hooks/useRegenerate';
import type { DocumentListItem } from '@/types';

// --- Reactive mobile detection ---
const mobileQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)') : null;
function subscribeMobile(cb: () => void) {
  mobileQuery?.addEventListener('change', cb);
  return () => mobileQuery?.removeEventListener('change', cb);
}
function getIsMobile() {
  return mobileQuery?.matches ?? false;
}

// --- Detail Panel for a single document ---
function DetailPanel({
  docId,
  onClose,
  onDelete,
  onDragOver,
  onDragLeave,
  onDrop,
  dragOver,
}: {
  docId: number;
  onClose: () => void;
  onDelete: (id: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  dragOver: boolean;
}) {
  const navigate = useNavigate();
  const { document, loading, refresh } = useDocument(docId);
  const { regenerating, handleRegenerate } = useRegenerate(document?.id, refresh);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Auto-refresh when summary is pending
  const retryRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(retryRef.current);
    if (isAiPending(document)) {
      retryRef.current = setTimeout(() => refresh(), 3000);
    }
    return () => clearTimeout(retryRef.current);
  }, [document, refresh]);

  const handleDelete = useCallback(async () => {
    if (!document) return;
    setDeleting(true);
    try {
      await deleteDocument(document.id);
      toastManager.add({ title: `"${document.title}" deleted` });
      onDelete(document.id);
    } catch {
      toastManager.add({ title: 'Delete failed' });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [document, onDelete]);

  const aiLoading = isAiPending(document);
  const panelProps = {
    topics: document?.topics ?? [],
    summary: document?.summary ?? null,
    keywords: document?.keywords ?? [],
    content: document?.content ?? '',
    onRegenerate: handleRegenerate,
    regenerating,
    loading: loading || aiLoading,
  };

  return (
    <div
      className={`bg-white rounded-xl border-2 flex flex-col h-full min-w-0 transition-colors ${
        dragOver ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200">
        <div className="min-w-0 flex-1">
          {loading && !document ? (
            <div className="h-6 bg-gray-100 rounded w-1/3 animate-pulse" />
          ) : document ? (
            <>
              <h2 className="text-lg font-bold text-gray-900 truncate">{document.title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Updated {new Date(document.updatedAt).toLocaleDateString('ko-KR')}
              </p>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-3">
          {document && (
            <>
              <button
                onClick={() => navigate(`/doc/${document.id}/edit`)}
                className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                aria-label="Edit"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11.5 2.5l4 4M4 15l-1.5.5.5-1.5L12.5 4.5l1 1L4 15z" />
                  <path d="M11 5l2 2" />
                </svg>
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                aria-label="Delete"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 5h12M7 5V3.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V5M13.5 5l-.5 9.5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 5 14.5L4.5 5" />
                </svg>
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 min-w-0">
        {loading && !document ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-5/6" />
            <div className="h-4 bg-gray-100 rounded w-4/6" />
            <div className="h-4 bg-gray-100 rounded w-full" />
          </div>
        ) : document ? (
          <>
            <div className="mb-4">
              <InfoPanelMobile {...panelProps} />
            </div>
            <MarkdownRenderer content={document.content} />
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">Document not found</div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Document"
        description={`Are you sure you want to delete "${document?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmingLabel="Deleting..."
        onConfirm={handleDelete}
        confirming={deleting}
      />
    </div>
  );
}

// --- Empty Drop Zone ---
function DropZone({
  onDragOver,
  onDragLeave,
  onDrop,
  dragOver,
}: {
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  dragOver: boolean;
}) {
  return (
    <div
      className={`rounded-xl border-2 border-dashed flex items-center justify-center h-full min-h-[200px] transition-colors ${
        dragOver
          ? 'border-blue-400 bg-blue-50 text-blue-500'
          : 'border-gray-300 text-gray-400'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="text-center">
        <svg className="mx-auto mb-2" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p className="text-sm font-medium">Drop document here</p>
      </div>
    </div>
  );
}

// --- Main DocumentList ---
export default function DocumentList() {
  const { documents, loading, refresh } = useDocumentList();
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  // Fixed 2 slots: [left, right], null means empty
  const [slots, setSlots] = useState<[number | null, number | null]>([null, null]);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Extract unique topics from documents
  const allTopics = useMemo(() => {
    const topicMap = new Map<string, { name: string; color: string }>();
    for (const doc of documents) {
      for (const t of doc.topics) {
        if (!topicMap.has(t.name)) {
          topicMap.set(t.name, { name: t.name, color: t.color });
        }
      }
    }
    return Array.from(topicMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [documents]);

  // Filter documents by topic
  const filteredDocs = useMemo(() => {
    if (!selectedTopic) return documents;
    return documents.filter((d) => d.topics.some((t) => t.name === selectedTopic));
  }, [documents, selectedTopic]);

  // Click: place in first empty slot, or toggle off
  const handleDocClick = useCallback((docId: number) => {
    setSlots((prev) => {
      // Already in a slot → remove it
      if (prev[0] === docId) return [null, prev[1]];
      if (prev[1] === docId) return [prev[0], null];
      // Mobile: only slot 0
      if (getIsMobile()) return [docId, null];
      // Place in first empty slot
      if (prev[0] === null) return [docId, prev[1]];
      if (prev[1] === null) return [prev[0], docId];
      // Both full → replace slot 0
      return [docId, prev[1]];
    });
  }, []);

  // Drag start
  const handleDragStart = useCallback((e: React.DragEvent, docId: number) => {
    e.dataTransfer.setData('text/plain', String(docId));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragOverSlot(null);
  }, []);

  // Drop into slot
  const handleSlotDrop = useCallback((e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    setDragOverSlot(null);
    setIsDragging(false);
    const docId = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isNaN(docId)) return;

    setSlots((prev) => {
      const next: [number | null, number | null] = [...prev];
      // If dragged doc is already in the OTHER slot, swap or just move
      const otherSlot = slotIndex === 0 ? 1 : 0;
      if (next[otherSlot] === docId) {
        next[otherSlot] = next[slotIndex]; // swap
      }
      next[slotIndex] = docId;
      return next;
    });
  }, []);

  const handleSlotDragOver = useCallback((e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(slotIndex);
  }, []);

  const handleSlotDragLeave = useCallback((slotIndex: number) => {
    setDragOverSlot((prev) => (prev === slotIndex ? null : prev));
  }, []);

  const handleCloseSlot = useCallback((slotIndex: number) => {
    setSlots((prev) => {
      const next: [number | null, number | null] = [...prev];
      next[slotIndex] = null;
      return next;
    });
  }, []);

  const handleDeleteFromSlot = useCallback((docId: number) => {
    setSlots((prev) => {
      const next: [number | null, number | null] = [...prev];
      if (next[0] === docId) next[0] = null;
      if (next[1] === docId) next[1] = null;
      return next;
    });
    refresh();
  }, [refresh]);

  const handleUpload = useCallback(async (title: string, content: string) => {
    try {
      const doc = await createDocument({ title, content });
      toastManager.add({ title: `"${title}" uploaded` });
      refresh();
      setSlots([doc.id, null]);
    } catch {
      toastManager.add({ title: 'Upload failed' });
    }
  }, [refresh]);

  // Clean up slots when documents change
  useEffect(() => {
    const docIds = new Set(documents.map((d) => d.id));
    setSlots((prev) => [
      prev[0] !== null && docIds.has(prev[0]) ? prev[0] : null,
      prev[1] !== null && docIds.has(prev[1]) ? prev[1] : null,
    ]);
  }, [documents]);

  const hasAnySlot = slots[0] !== null || slots[1] !== null;
  const isMobile = useSyncExternalStore(subscribeMobile, getIsMobile);

  if (loading && documents.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 bg-gray-100 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">No documents yet</p>
        <p className="text-gray-300 text-sm mt-2">Create a new one or upload a markdown file</p>
        <div className="mt-6 max-w-sm mx-auto">
          <FileUpload onUpload={handleUpload} />
        </div>
        <button
          onClick={() => navigate('/new')}
          className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Create Document
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Topic filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setSelectedTopic(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedTopic === null
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({documents.length})
        </button>
        {allTopics.map((topic) => (
          <button
            key={topic.name}
            onClick={() => setSelectedTopic(selectedTopic === topic.name ? null : topic.name)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedTopic === topic.name
                ? 'text-white'
                : 'text-gray-600 hover:opacity-80'
            }`}
            style={
              selectedTopic === topic.name
                ? { backgroundColor: topic.color }
                : { backgroundColor: `${topic.color}20`, color: topic.color }
            }
          >
            {topic.name}
          </button>
        ))}
      </div>

      {/* Document grid — draggable cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filteredDocs.map((doc) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            selected={slots[0] === doc.id || slots[1] === doc.id}
            onClick={() => handleDocClick(doc.id)}
            onDragStart={(e) => handleDragStart(e, doc.id)}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {/* Split detail view — always show 2 slots on desktop when dragging or has content */}
      {(hasAnySlot || isDragging) && (
        <div
          className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}
          style={{ minHeight: '50vh' }}
        >
          {/* Slot 0 (Left) */}
          {slots[0] !== null ? (
            <DetailPanel
              docId={slots[0]}
              onClose={() => handleCloseSlot(0)}
              onDelete={handleDeleteFromSlot}
              onDragOver={(e) => handleSlotDragOver(e, 0)}
              onDragLeave={() => handleSlotDragLeave(0)}
              onDrop={(e) => handleSlotDrop(e, 0)}
              dragOver={dragOverSlot === 0}
            />
          ) : (
            !isMobile && (
              <DropZone
                onDragOver={(e) => handleSlotDragOver(e, 0)}
                onDragLeave={() => handleSlotDragLeave(0)}
                onDrop={(e) => handleSlotDrop(e, 0)}
                dragOver={dragOverSlot === 0}
              />
            )
          )}

          {/* Slot 1 (Right) — desktop only */}
          {!isMobile && (
            slots[1] !== null ? (
              <DetailPanel
                docId={slots[1]}
                onClose={() => handleCloseSlot(1)}
                onDelete={handleDeleteFromSlot}
                onDragOver={(e) => handleSlotDragOver(e, 1)}
                onDragLeave={() => handleSlotDragLeave(1)}
                onDrop={(e) => handleSlotDrop(e, 1)}
                dragOver={dragOverSlot === 1}
              />
            ) : (
              <DropZone
                onDragOver={(e) => handleSlotDragOver(e, 1)}
                onDragLeave={() => handleSlotDragLeave(1)}
                onDrop={(e) => handleSlotDrop(e, 1)}
                dragOver={dragOverSlot === 1}
              />
            )
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasAnySlot && !isDragging && (
        <div className="text-center py-8 text-gray-400 text-sm">
          Drag a document to the panel below, or click to view. Drop onto a panel to replace it.
        </div>
      )}
    </div>
  );
}

// --- Document Card (draggable) ---
function DocumentCard({
  doc,
  selected,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  doc: DocumentListItem;
  selected: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`text-left p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none ${
        selected
          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
      <p className="text-xs text-gray-400 mt-1">
        {new Date(doc.updatedAt).toLocaleDateString('ko-KR')}
      </p>
      {doc.topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {doc.topics.slice(0, 3).map((t) => (
            <span
              key={t.name}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded-full text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.name}
            </span>
          ))}
          {doc.topics.length > 3 && (
            <span className="px-1.5 py-0.5 text-[10px] text-gray-400">
              +{doc.topics.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
