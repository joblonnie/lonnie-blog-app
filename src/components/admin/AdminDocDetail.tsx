import { useState, useCallback, useEffect, useRef, useMemo, useSyncExternalStore } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDocument, useDocumentList, isAiPending } from '@/hooks/useDocuments';
import { useRegenerate } from '@/hooks/useRegenerate';
import { deleteDocument, togglePublished, fetchDocument as fetchDocumentApi } from '@/lib/api';
import { toastManager } from '@/components/Toast';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { InfoPanelMobile } from '@/components/InfoPanel';
import ConfirmDialog from '@/components/ConfirmDialog';
import SplitSidebar from '@/components/SplitSidebar';
import ContentSearchBar from '@/components/ContentSearchBar';
import { useContentSearch } from '@/hooks/useContentSearch';
import { useAnnotations } from '@/hooks/useAnnotations';
import AnnotationContextMenu from '@/components/AnnotationContextMenu';
import { subscribeMobile, getIsMobile } from '@/lib/mobile';
import type { Document, HighlightColor, Annotation } from '@/types';

export default function AdminDocDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const docId = id ? Number(id) : undefined;
  const { document: doc, loading, refresh } = useDocument(docId);
  const { documents } = useDocumentList();
  const { regenerating, handleRegenerate } = useRegenerate(doc?.id, refresh);
  const isMobile = useSyncExternalStore(subscribeMobile, getIsMobile);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const contentSearch = useContentSearch(doc?.content);
  const annotationsHook = useAnnotations(docId, contentSearch.containerRef, doc?.content);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; existing: Annotation | null } | null>(null);

  // Ctrl/Cmd+F to open content search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        contentSearch.open();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [contentSearch]);

  // Reapply annotations when content search closes
  const prevSearchOpen = useRef(contentSearch.isOpen);
  useEffect(() => {
    if (prevSearchOpen.current && !contentSearch.isOpen) {
      annotationsHook.reapply();
    }
    prevSearchOpen.current = contentSearch.isOpen;
  }, [contentSearch.isOpen, annotationsHook]);

  // Context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const container = contentSearch.containerRef.current;
    if (!container) return;

    const target = e.target as HTMLElement;
    // Check if right-clicked on an existing annotation mark
    const existingAnn = annotationsHook.getAnnotationAt(target);

    if (existingAnn) {
      e.preventDefault();
      setCtxMenu({ x: e.clientX, y: e.clientY, existing: existingAnn });
      return;
    }

    // Check if text is selected
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim()) {
      e.preventDefault();
      setCtxMenu({ x: e.clientX, y: e.clientY, existing: null });
    }
  }, [contentSearch.containerRef, annotationsHook]);

  // Split view state
  const [splitId, setSplitId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [splitDoc, setSplitDoc] = useState<Document | null>(null);

  // Auto-refresh when AI pending
  const retryRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(retryRef.current);
    if (isAiPending(doc)) {
      retryRef.current = setTimeout(() => refresh(), 3000);
    }
    return () => clearTimeout(retryRef.current);
  }, [doc, refresh]);

  // Fetch split document
  useEffect(() => {
    if (splitId == null) { setSplitDoc(null); return; }
    let cancelled = false;
    fetchDocumentApi(splitId)
      .then((d) => { if (!cancelled) setSplitDoc(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [splitId]);

  const handleTogglePublish = useCallback(async () => {
    if (!doc || toggling) return;
    setToggling(true);
    try {
      await togglePublished(doc.id);
      await refresh();
      toastManager.add({ title: doc.published ? 'Unpublished' : 'Published' });
    } catch {
      toastManager.add({ title: 'Toggle failed' });
    } finally {
      setToggling(false);
    }
  }, [doc, toggling, refresh]);

  const handleDelete = useCallback(async () => {
    if (!doc) return;
    setDeleting(true);
    try {
      await deleteDocument(doc.id);
      toastManager.add({ title: `"${doc.title}" deleted` });
      navigate('/admin');
    } catch {
      toastManager.add({ title: 'Delete failed' });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [doc, navigate]);

  const handleSplitSelect = useCallback((selectedId: number) => {
    setSplitId(selectedId);
    setSidebarOpen(false);
  }, []);

  const aiLoading = isAiPending(doc);
  const panelProps = useMemo(() => ({
    topics: doc?.topics ?? [],
    summary: doc?.summary ?? null,
    keywords: doc?.keywords ?? [],
    content: doc?.content ?? '',
    onRegenerate: handleRegenerate,
    regenerating,
    loading: loading || aiLoading,
  }), [doc?.topics, doc?.summary, doc?.keywords, doc?.content, handleRegenerate, regenerating, loading, aiLoading]);

  const sidebarItems = useMemo(() => documents.map((d) => ({
    id: d.id,
    title: d.title,
    date: d.updatedAt,
    category: d.category,
  })), [documents]);

  if (loading && !doc) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-1/4" />
        <div className="space-y-2 mt-8">
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
          <div className="h-4 bg-gray-100 rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Document not found</h1>
        <Link to="/admin" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          &larr; Back to documents
        </Link>
      </div>
    );
  }

  const hasSplit = splitId !== null && splitDoc !== null;

  return (
    <>
      {contentSearch.isOpen && (
        <ContentSearchBar
          query={contentSearch.query}
          setQuery={contentSearch.setQuery}
          matchCount={contentSearch.matchCount}
          currentIndex={contentSearch.currentIndex}
          goNext={contentSearch.goNext}
          goPrev={contentSearch.goPrev}
          onClose={contentSearch.close}
        />
      )}

      {sidebarOpen && docId != null && (
        <SplitSidebar
          items={sidebarItems}
          currentId={docId}
          selectedId={splitId}
          onSelect={handleSplitSelect}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/admin" className="text-sm text-blue-600 hover:text-blue-700 shrink-0">
              &larr; Back
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{doc.title}</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Updated {new Date(doc.updatedAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
            <button
              onClick={handleTogglePublish}
              disabled={toggling}
              className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                doc.published
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {toggling ? '...' : doc.published ? 'Published' : 'Draft'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {!isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Compare
              </button>
            )}
            <button
              onClick={() => navigate(`/admin/doc/${doc.id}/edit`)}
              className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              aria-label="Edit"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11.5 2.5l4 4M4 15l-1.5.5.5-1.5L12.5 4.5l1 1L4 15z" />
                <path d="M11 5l2 2" />
              </svg>
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              aria-label="Delete"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h12M7 5V3.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V5M13.5 5l-.5 9.5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 5 14.5L4.5 5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content — normal or split */}
        <div className={hasSplit ? 'grid grid-cols-2 gap-6' : ''}>
          {/* Primary document */}
          <div>
            <div className="mb-4">
              <InfoPanelMobile {...panelProps} />
            </div>
            <div ref={contentSearch.containerRef} onContextMenu={handleContextMenu}>
              <MarkdownRenderer content={doc.content} />
            </div>
          </div>

          {/* Split panel */}
          {hasSplit && splitDoc && (
            <div className="border-l border-gray-200 pl-6">
              <div className="flex items-center justify-between mb-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate">{splitDoc.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Updated {new Date(splitDoc.updatedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <button
                  onClick={() => setSplitId(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                  aria-label="Close split"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="4" y1="4" x2="12" y2="12" />
                    <line x1="12" y1="4" x2="4" y2="12" />
                  </svg>
                </button>
              </div>
              <div className="mb-4">
                <InfoPanelMobile
                  topics={splitDoc.topics}
                  summary={splitDoc.summary}
                  keywords={splitDoc.keywords}
                  content={splitDoc.content}
                />
              </div>
              <MarkdownRenderer content={splitDoc.content} />
            </div>
          )}
        </div>
      </div>

      {ctxMenu && (
        <AnnotationContextMenu
          position={{ x: ctxMenu.x, y: ctxMenu.y }}
          existingAnnotation={ctxMenu.existing}
          onHighlight={(color) => {
            annotationsHook.addAnnotation('highlight', color);
            setCtxMenu(null);
          }}
          onUnderline={() => {
            annotationsHook.addAnnotation('underline');
            setCtxMenu(null);
          }}
          onMemo={(memo) => {
            annotationsHook.addAnnotation('memo', undefined, memo);
            setCtxMenu(null);
          }}
          onRemove={(id) => {
            annotationsHook.removeAnnotation(id);
            setCtxMenu(null);
          }}
          onClose={() => setCtxMenu(null)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Document"
        description={`Are you sure you want to delete "${doc.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmingLabel="Deleting..."
        onConfirm={handleDelete}
        confirming={deleting}
      />
    </>
  );
}
