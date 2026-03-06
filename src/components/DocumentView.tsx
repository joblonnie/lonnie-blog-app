import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Separator } from '@base-ui-components/react/separator';
import { useDocument, useDocumentList } from '@/hooks/useDocuments';
import { deleteDocument } from '@/lib/api';
import { toastManager } from './Toast';
import MarkdownRenderer from './MarkdownRenderer';
import { InfoPanelDesktop, InfoPanelMobile } from './InfoPanel';
import ConfirmDialog from './ConfirmDialog';
import { useRegenerate } from '@/hooks/useRegenerate';

export default function DocumentView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { document, loading, refresh } = useDocument(id ? Number(id) : undefined);
  const { documents, refresh: refreshList } = useDocumentList();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const prevDocId = useMemo(() => {
    if (!id || documents.length === 0) return null;
    const idx = documents.findIndex((d) => d.id === Number(id));
    if (idx <= 0) return documents[documents.length - 1].id;
    return documents[idx - 1].id;
  }, [id, documents]);
  const { regenerating, handleRegenerate } = useRegenerate(document?.id, refresh);

  // Auto-refresh when summary is pending (AI generating)
  const retryRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(retryRef.current);
    if (document && document.summary === null && document.content.length >= 50) {
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
      refreshList();
      navigate('/');
    } catch {
      toastManager.add({ title: 'Delete failed' });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [document, navigate, refreshList]);

  if (!loading && !document) {
    return <div className="text-center py-12 text-gray-500">Document not found</div>;
  }

  const panelProps = {
    category: document?.category ?? null,
    topics: document?.topics ?? [],
    summary: document?.summary ?? null,
    keywords: document?.keywords ?? [],
    content: document?.content ?? '',
    onRegenerate: handleRegenerate,
    regenerating,
  };

  return (
    <div>
      {/* Mobile InfoPanel */}
      <div className="xl:hidden mb-4">
        <InfoPanelMobile {...panelProps} />
      </div>

      <div className="xl:flex xl:gap-6">
        {/* Main content */}
        <div className="flex-1 max-w-4xl">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
            {loading && !document ? (
              <div className="min-h-[60vh] space-y-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-7 bg-gray-100 rounded w-1/3" />
                  <div className="h-9 bg-gray-100 rounded w-16" />
                </div>
                <div className="h-4 bg-gray-100 rounded w-1/4" />
                <div className="border-t border-gray-200 my-6" />
                <div className="space-y-3">
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-5/6" />
                  <div className="h-4 bg-gray-100 rounded w-4/6" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-5/6" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            ) : document ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => prevDocId ? navigate(`/doc/${prevDocId}`) : navigate(-1)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      aria-label="Back"
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="12,4 6,10 12,16" />
                      </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/doc/${document.id}/edit`}
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      aria-label="Edit"
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11.5 2.5l4 4M4 15l-1.5.5.5-1.5L12.5 4.5l1 1L4 15z" />
                        <path d="M11 5l2 2" />
                      </svg>
                    </Link>
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
                <p className="text-sm text-gray-500 mt-1">
                  Updated {new Date(document.updatedAt).toLocaleDateString('ko-KR')}
                </p>
                <Separator className="my-6 border-t border-gray-200" />
                <MarkdownRenderer content={document.content} />
              </>
            ) : null}
          </div>
        </div>

        {/* Desktop InfoPanel */}
        <div className="hidden xl:block">
          <InfoPanelDesktop {...panelProps} />
        </div>
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
