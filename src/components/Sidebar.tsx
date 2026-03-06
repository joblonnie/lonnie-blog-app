import { useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu } from '@base-ui-components/react/menu';
import { Separator } from '@base-ui-components/react/separator';
import { useDocumentList } from '@/hooks/useDocuments';
import { createDocument, deleteDocument } from '@/lib/api';
import FileUpload from './FileUpload';
import { toastManager } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import type { DocumentListItem } from '@/types';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { documents, loading, refresh } = useDocumentList();
  const navigate = useNavigate();
  const location = useLocation();
  const [deleteTarget, setDeleteTarget] = useState<DocumentListItem | null>(null);
  const toast = { show: (msg: string) => toastManager.add({ title: msg }) };

  // List loads on mount and refreshes on create/delete (called explicitly)

  // Parse current document ID from URL
  const currentDocId = (() => {
    const match = location.pathname.match(/^\/doc\/(\d+)/);
    return match ? Number(match[1]) : null;
  })();

  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const doc = await createDocument({ title: 'Untitled', content: '' });
      refresh();
      navigate(`/doc/${doc.id}/edit`);
      onClose();
    } catch {
      toast.show('Create failed');
    } finally {
      setCreating(false);
    }
  }, [creating, navigate, refresh, toast, onClose]);

  const handleUpload = useCallback(async (title: string, content: string) => {
    try {
      const doc = await createDocument({ title, content });
      toast.show(`"${title}" uploaded`);
      refresh();
      navigate(`/doc/${doc.id}`);
      onClose();
    } catch {
      toast.show('Upload failed');
    }
  }, [navigate, toast, onClose]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget.id);
      toast.show(`"${deleteTarget.title}" deleted`);
      if (currentDocId === deleteTarget.id) {
        navigate('/');
      }
      refresh();
    } catch {
      toast.show('Delete failed');
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, currentDocId, navigate, refresh, toast]);

  const handleNavigation = useCallback((path: string) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo + New button */}
        <div className="p-4 flex items-center justify-between">
          <Link
            to="/"
            onClick={onClose}
            className="text-lg font-bold text-gray-900 hover:text-gray-700"
          >
            Lonnie Blog
          </Link>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="7" y1="2" x2="7" y2="12" />
              <line x1="2" y1="7" x2="12" y2="7" />
            </svg>
            Create
          </button>
        </div>
        <Separator className="border-t border-gray-200" />

        {/* Knowledge Graph link */}
        <div className="px-3 pt-3">
          <button
            onClick={() => handleNavigation('/graph')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/graph'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="12" cy="18" r="3" />
              <line x1="8.5" y1="7.5" x2="10.5" y2="16" />
              <line x1="15.5" y1="7.5" x2="13.5" y2="16" />
            </svg>
            Knowledge Graph
          </button>
          <button
            onClick={() => handleNavigation('/ask')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/ask'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            AI Ask
          </button>
        </div>

        {/* Compact File Upload */}
        <div className="px-3 pt-2">
          <FileUpload onUpload={handleUpload} compact />
        </div>

        {/* Document List */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No documents yet</p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className={`group rounded-lg transition-colors relative ${
                  currentDocId === doc.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <button
                  onClick={() => handleNavigation(`/doc/${doc.id}`)}
                  className="w-full text-left px-3 py-2.5 block"
                >
                  {doc.category && (
                    <span className="inline-block text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 mb-1">
                      {doc.category}
                    </span>
                  )}
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <p className={`text-xs mt-0.5 ${
                    currentDocId === doc.id ? 'text-blue-500' : 'text-gray-400'
                  }`}>
                    {new Date(doc.updatedAt).toLocaleDateString('ko-KR')}
                  </p>
                </button>

                <div className="absolute top-2 right-1">
                  <Menu.Root>
                    <Menu.Trigger className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="3" r="1.5" />
                        <circle cx="8" cy="8" r="1.5" />
                        <circle cx="8" cy="13" r="1.5" />
                      </svg>
                    </Menu.Trigger>
                    <Menu.Portal>
                      <Menu.Positioner className="z-[60]" sideOffset={4}>
                        <Menu.Popup className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px]">
                          <Menu.Item
                            className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleNavigation(`/doc/${doc.id}/edit`)}
                          >
                            Edit
                          </Menu.Item>
                          <Menu.Item
                            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                            onClick={() => setDeleteTarget(doc)}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                </div>
              </div>
            ))
          )}
        </nav>
      </aside>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Document"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />

    </>
  );
}
