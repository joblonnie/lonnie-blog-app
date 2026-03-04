import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertDialog } from '@base-ui-components/react/alert-dialog';
import { Menu } from '@base-ui-components/react/menu';
import { useDocumentList } from '@/hooks/useDocuments';
import { useToast } from '@/hooks/useToast';
import { createDocument, deleteDocument } from '@/lib/api';
import FileUpload from './FileUpload';
import Toast from './Toast';
import type { DocumentListItem } from '@/types';

export default function DocumentList() {
  const { documents, loading, refresh } = useDocumentList();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<DocumentListItem | null>(null);
  const toast = useToast();

  const handleUpload = useCallback(async (title: string, content: string) => {
    try {
      const doc = await createDocument({ title, content });
      toast.show(`"${title}" uploaded`);
      navigate(`/doc/${doc.id}`);
    } catch {
      toast.show('Upload failed');
    }
  }, [navigate, toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget.id);
      toast.show(`"${deleteTarget.title}" deleted`);
      refresh();
    } catch {
      toast.show('Delete failed');
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, refresh, toast]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <FileUpload onUpload={handleUpload} />

      {documents.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No documents yet</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow relative group"
            >
              <Link to={`/doc/${doc.id}`} className="block">
                <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(doc.updatedAt).toLocaleDateString('ko-KR')}
                </p>
              </Link>

              <div className="absolute top-3 right-3">
                <Menu.Root>
                  <Menu.Trigger className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="8" cy="3" r="1.5" />
                      <circle cx="8" cy="8" r="1.5" />
                      <circle cx="8" cy="13" r="1.5" />
                    </svg>
                  </Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner className="z-50" sideOffset={4}>
                      <Menu.Popup className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px]">
                        <Menu.Item
                          className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                          onClick={() => navigate(`/doc/${doc.id}/edit`)}
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
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/40 z-50" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-xl z-50 w-[90vw] max-w-sm">
            <AlertDialog.Title className="text-lg font-semibold text-gray-900">
              Delete Document
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-gray-500 mt-2">
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
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
    </div>
  );
}
