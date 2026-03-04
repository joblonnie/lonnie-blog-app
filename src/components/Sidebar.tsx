import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertDialog } from '@base-ui-components/react/alert-dialog';
import { Menu } from '@base-ui-components/react/menu';
import { useDocumentList } from '@/hooks/useDocuments';
import { useToast } from '@/hooks/useToast';
import { createDocument, deleteDocument } from '@/lib/api';
import FileUpload from './FileUpload';
import Toast from './Toast';
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
  const toast = useToast();

  // Refresh document list on navigation (e.g. after save)
  useEffect(() => {
    refresh();
  }, [location.pathname, refresh]);

  // Parse current document ID from URL
  const currentDocId = (() => {
    const match = location.pathname.match(/^\/doc\/(\d+)/);
    return match ? Number(match[1]) : null;
  })();

  const handleUpload = useCallback(async (title: string, content: string) => {
    try {
      const doc = await createDocument({ title, content });
      toast.show(`"${title}" uploaded`);
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
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <Link
            to="/"
            onClick={onClose}
            className="text-lg font-bold text-gray-900 hover:text-gray-700"
          >
            Lonnie Blog
          </Link>
          <button
            onClick={() => handleNavigation('/new')}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            New
          </button>
        </div>

        {/* Compact File Upload */}
        <div className="px-3 pt-3">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/40 z-[60]" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-xl z-[60] w-[90vw] max-w-sm">
            <AlertDialog.Title className="text-lg font-semibold text-gray-900">
              Delete Document
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-gray-500 mt-2">
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end mt-6">
              <AlertDialog.Close className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                Cancel
              </AlertDialog.Close>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <Toast message={toast.message} />
    </>
  );
}
